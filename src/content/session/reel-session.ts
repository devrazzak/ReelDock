import type { Direction, PlatformAdapter } from '@/content/platforms/platform-adapter';
import type { NavigationStrategy } from '@/content/session/reel-navigator';
import { findActiveVideo } from '@/content/video/active-video';
import { isLoopRestart } from '@/content/video/end-detection';
import type { PlayerCommand } from '@/shared/messages';
import type { ExtensionSettings } from '@/shared/settings';
import { INITIAL_STATUS, type NavigationRecord, type PlaybackStatus, type VideoState } from '@/shared/status';

export interface ReelSessionOptions {
    doc: Document;
    /** The site this page belongs to; all site-specific DOM lookups go through it. */
    platform: PlatformAdapter;
    strategies: NavigationStrategy[];
    getSettings: () => ExtensionSettings;
    onStatus: (status: PlaybackStatus) => void;
    /** Real tab visibility. Defaults to document.hidden, which is the real value in a content script. */
    isTabHidden?: () => boolean;
    /** How long to wait for Facebook to switch to another Reel after a navigation attempt. */
    navigationTimeoutMs?: number;
    /** In a visible tab, how long Facebook gets to start the new Reel itself before we do. */
    autoplayGraceMs?: number;
    /** How long to wait after play() before checking that the video kept playing. */
    playVerifyMs?: number;
}

/**
 * A place outside Facebook's page that can show the current Reel's video, e.g. the mini player.
 * While it is open, the session moves each new Reel's video into it.
 */
export interface VideoStage {
    readonly isOpen: boolean;
    readonly video: HTMLVideoElement | null;
    /** Moves the video onto the stage. The caller starts playback. */
    present(video: HTMLVideoElement): void;
    /** Gives the video back to Facebook's page before it changes Reel. */
    release(direction?: Direction): void;
}

/** A resume this soon after our pause comes from the site syncing its own state, not from the user. */
const RESUME_UNDO_WINDOW_MS = 500;

/** How often a site's pause of the video in the mini player is undone before we leave it alone. */
const MAX_STAGE_RESUMES = 3;

/** Facebook's own player skips 10 seconds forward or backward. */
export const SEEK_SECONDS = 10;

// Media events do not bubble, but they can be captured on the document.
// One capture listener per event covers every current and future <video>.
const MEDIA_EVENTS = ['play', 'playing', 'pause', 'ended', 'timeupdate', 'volumechange', 'loadeddata'] as const;

/**
 * Watches Facebook's own <video> elements and moves to the next Reel when one finishes.
 *
 * Work is driven by media and navigation events, not polling, so it keeps working while
 * Chrome throttles timers in a background tab. In a hidden tab Facebook changes the URL
 * on "Next Card" but cannot start the new video (its viewport tracking needs rendering),
 * so this class hands playback over to the new Reel's video itself.
 */
export class ReelSession {
    private readonly doc: Document;
    private readonly view: Window;
    private readonly platform: PlatformAdapter;
    private readonly options: Required<ReelSessionOptions>;
    private readonly lastTimes = new WeakMap<HTMLVideoElement, number>();
    private readonly changeWaiters = new Set<() => void>();
    private lastCompletedReel: string | null = null;
    private navigating = false;
    private playBlocked = false;
    /** The video the user paused through our controls; neither we nor Facebook may resume it. */
    private pausedByUser: HTMLVideoElement | null = null;
    /** How often a resume was undone for pausedByUser; caps any tug of war with Facebook. */
    private undoneResumes = 0;
    private pausedAt = 0;
    private stageResumes = 0;
    private lastNavigation: NavigationRecord | null = null;
    private lastStatusJson = '';
    private disposed = false;
    private stage: VideoStage | null = null;

    constructor(options: ReelSessionOptions) {
        const view = options.doc.defaultView;
        if (!view) throw new Error('ReelSession needs a document attached to a window');
        this.doc = options.doc;
        this.view = view;
        this.platform = options.platform;
        this.options = {
            isTabHidden: () => options.doc.hidden,
            navigationTimeoutMs: 8000,
            autoplayGraceMs: 2500,
            playVerifyMs: 1000,
            ...options,
        };
    }

    start(): void {
        for (const type of MEDIA_EVENTS) this.doc.addEventListener(type, this.handleMediaEvent, true);
        this.view.addEventListener('popstate', this.handlePageChange);
        this.view.addEventListener('focus', this.publishStatus);
        this.view.addEventListener('blur', this.publishStatus);
        // Facebook changes Reels with history.pushState, which fires no DOM event.
        // The Navigation API reports it (verified on facebook.com).
        this.view.navigation?.addEventListener('navigatesuccess', this.handlePageChange);
        this.publishStatus();
    }

    attachStage(stage: VideoStage): void {
        this.stage = stage;
    }

    /** Also watches media events in another document, e.g. the mini player window. Returns a cleanup. */
    observe(doc: Document): () => void {
        for (const type of MEDIA_EVENTS) doc.addEventListener(type, this.handleMediaEvent, true);
        this.publishStatus();
        return () => {
            for (const type of MEDIA_EVENTS) doc.removeEventListener(type, this.handleMediaEvent, true);
            this.publishStatus();
        };
    }

    dispose(): void {
        this.disposed = true;
        for (const type of MEDIA_EVENTS) this.doc.removeEventListener(type, this.handleMediaEvent, true);
        this.view.removeEventListener('popstate', this.handlePageChange);
        this.view.removeEventListener('focus', this.publishStatus);
        this.view.removeEventListener('blur', this.publishStatus);
        this.view.navigation?.removeEventListener('navigatesuccess', this.handlePageChange);
        this.notifyChangeWaiters();
    }

    getStatus(): PlaybackStatus {
        const tabHidden = this.options.isTabHidden();
        if (!this.onReelsPage()) return { ...INITIAL_STATUS, tabHidden };
        const video = this.getCurrentVideo();
        return {
            onReelsPage: true,
            reelId: this.getCurrentReelId(),
            videoState: this.getVideoState(video),
            muted: video?.muted ?? false,
            tabHidden,
            miniPlayerOpen: this.stage?.isOpen ?? false,
            navigating: this.navigating,
            lastNavigation: this.lastNavigation,
            warning: this.getWarning(video),
        };
    }

    async runCommand(command: PlayerCommand): Promise<void> {
        if (!this.onReelsPage()) throw new Error('Open a Reel or Short first.');
        switch (command) {
            case 'toggle-play': {
                const video = this.getCurrentVideo();
                if (!video) throw new Error('No video found on the page.');
                if (video.paused) {
                    this.pausedByUser = null;
                    this.stageResumes = 0;
                    await this.play(video);
                } else {
                    this.pausedByUser = video;
                    this.undoneResumes = 0;
                    this.pausedAt = Date.now();
                    video.pause();
                }
                break;
            }
            case 'toggle-mute':
                this.toggleMute();
                break;
            case 'seek-forward':
                this.seek(SEEK_SECONDS);
                break;
            case 'seek-backward':
                this.seek(-SEEK_SECONDS);
                break;
            case 'next-reel':
                await this.navigate('next');
                break;
            case 'previous-reel':
                await this.navigate('previous');
                break;
        }
    }

    /**
     * Uses Facebook's own Mute / Unmute button, so Facebook applies the choice to the next Reels too.
     * Muting only the element left Facebook's state muted, and every new Reel started silent.
     */
    private toggleMute(): void {
        const reelId = this.getCurrentReelId();
        const button = reelId ? this.platform.findMuteButton(this.doc, reelId) : null;
        if (button) {
            button.click();
            return;
        }
        const video = this.getCurrentVideo();
        if (video) video.muted = !video.muted;
    }

    private seek(seconds: number): void {
        const video = this.getCurrentVideo();
        if (!video || !Number.isFinite(video.duration)) return;
        // Stop just short of the end so `ended` fires and auto next takes over.
        video.currentTime = Math.min(Math.max(video.currentTime + seconds, 0), video.duration - 0.1);
    }

    /** Re-evaluates and publishes status, e.g. after settings change. */
    refresh(): void {
        this.publishStatus();
    }

    private readonly handleMediaEvent = (event: Event): void => {
        const video = event.target;
        if (!(video instanceof HTMLVideoElement) || !this.onReelsPage()) return;

        switch (event.type) {
            case 'timeupdate': {
                const previous = this.lastTimes.get(video) ?? 0;
                this.lastTimes.set(video, video.currentTime);
                // Facebook replays after `ended` today; this covers a switch to the `loop` attribute,
                // which never fires `ended`.
                if (video.loop && isLoopRestart(previous, video.currentTime, video.duration)) {
                    this.handleCompletion(video);
                }
                return; // Fires ~4 times a second and never changes the status by itself.
            }
            case 'ended':
                this.handleCompletion(video);
                break;
            case 'play':
                if (this.keepUserPause(video)) break;
                this.keepOnlyCurrentReelPlaying(video);
                break;
            case 'pause':
                this.keepStagePlaying(video);
                break;
            case 'playing':
                this.playBlocked = false;
                break;
        }
        this.notifyChangeWaiters();
        this.publishStatus();
    };

    private readonly handlePageChange = (): void => {
        this.notifyChangeWaiters();
        this.publishStatus();
    };

    /**
     * Facebook replays a Reel from its own `ended` listener, which runs after ours, so a Reel we
     * already moved away from can start again. While we manage playback (hidden tab or mini player),
     * only the current Reel may play. Otherwise Facebook manages this itself.
     */
    private keepOnlyCurrentReelPlaying(video: HTMLVideoElement): void {
        if (!this.isManagingPlayback()) return;
        const current = this.getCurrentVideo();
        if (current && video !== current) video.pause();
    }

    /**
     * Facebook keeps its own "playing" state for a Reel it started and may resume the video after we
     * pause it from outside its UI (the mini player, popup or shortcut). Undo such a resume while we manage
     * playback, and in any tab when it comes right after our pause (Facebook syncing its state, seen within
     * ~100 ms). A later resume in a visible tab is the user using Facebook's own controls, which must keep working.
     */
    private keepUserPause(video: HTMLVideoElement): boolean {
        if (video !== this.pausedByUser || this.undoneResumes >= 3) return false;
        const resumedRightAway = Date.now() - this.pausedAt < RESUME_UNDO_WINDOW_MS;
        if (!resumedRightAway && !this.isManagingPlayback()) return false;
        this.undoneResumes++;
        video.pause();
        return true;
    }

    /**
     * A site may pause the video it sees leave its page (Instagram does, once its card is empty). Nobody asked
     * for that pause, so resume the video shown in the mini player. Pauses from the user and the end of the video stay.
     */
    private keepStagePlaying(video: HTMLVideoElement): void {
        if (this.stage?.video !== video || video === this.pausedByUser || video.ended || this.navigating) return;
        if (this.stageResumes >= MAX_STAGE_RESUMES) return;
        this.stageResumes++;
        void this.play(video);
    }

    private isManagingPlayback(): boolean {
        const hiddenWithBackground = this.options.isTabHidden() && this.options.getSettings().backgroundPlayback;
        return hiddenWithBackground || this.stage?.isOpen === true;
    }

    private handleCompletion(video: HTMLVideoElement): void {
        if (!this.options.getSettings().autoNext || this.navigating) return;
        if (video !== this.getCurrentVideo()) return;

        // `ended` is followed by Facebook's replay, and a Reel can finish many times while it loops.
        // Only the first completion of a Reel triggers navigation.
        const reelId = this.getCurrentReelId();
        if (reelId === null || reelId === this.lastCompletedReel) return;
        this.lastCompletedReel = reelId;

        void this.navigate('next').then(succeeded => {
            // Allow a new attempt the next time this Reel finishes.
            if (!succeeded && this.lastCompletedReel === reelId) this.lastCompletedReel = null;
        });
    }

    private async navigate(direction: Direction): Promise<boolean> {
        if (this.navigating) return false;
        this.navigating = true;
        // A pause belongs to the Reel it was made on; coming back to that Reel later plays it again.
        this.pausedByUser = null;
        this.publishStatus();

        const fromReel = this.getCurrentReelId();
        const fromVideo = this.getCurrentVideo();
        const stage = this.stage?.isOpen ? this.stage : null;
        // Facebook's page must have its video element back before it switches cards.
        stage?.release(direction);
        let usedStrategy: string | null = null;
        let failure = 'No navigation method moved to the next video. The site may have changed its page.';

        try {
            for (const strategy of this.options.strategies) {
                if (this.disposed) break;
                if (!strategy.trigger(direction)) continue;
                if (await this.waitFor(() => this.hasMoved(fromReel, fromVideo, strategy))) {
                    usedStrategy = strategy.name;
                    break;
                }
            }
            if (usedStrategy && !(await this.handOverPlayback(fromVideo))) {
                failure = 'Moved to the next video, but it did not start.';
                usedStrategy = null;
            }
            // Nothing moved: show the same Reel in the mini player again.
            if (!usedStrategy && stage?.isOpen && fromVideo && !this.disposed) {
                await this.play(fromVideo);
                stage.present(fromVideo);
            }
        } finally {
            this.navigating = false;
            // The duplicate guard is per visit: a Reel watched again later may advance again.
            if (usedStrategy) this.lastCompletedReel = null;
            this.lastNavigation = {
                at: Date.now(),
                result: usedStrategy ? 'success' : 'failed',
                detail: usedStrategy ?? failure,
            };
            this.publishStatus();
        }
        return usedStrategy !== null;
    }

    /**
     * Makes sure the new Reel plays. In a visible tab Facebook starts it itself, so we only step in
     * if it has not after a grace period. In a hidden tab Facebook cannot, so we do it right away,
     * keeping the user's mute and volume choice from the previous Reel. With the mini player open,
     * the new video is moved into it and started there.
     */
    private async handOverPlayback(previous: HTMLVideoElement | null): Promise<boolean> {
        const reelId = this.getCurrentReelId();
        const next = await this.waitForValue(() => (reelId ? this.platform.findReelVideo(this.doc, reelId) : null));
        if (!next || this.disposed) return false;
        const stage = this.stage?.isOpen ? this.stage : null;

        if (!stage) {
            if (!this.options.isTabHidden()) {
                await this.waitFor(() => !next.paused, this.options.autoplayGraceMs);
                if (!next.paused) return true;
            }
            if (!this.options.getSettings().backgroundPlayback && this.options.isTabHidden()) return true;
        }

        if (previous && previous !== next) {
            next.muted = previous.muted;
            next.volume = previous.volume;
            previous.pause();
        }
        // Start playback while the video is still in Facebook's page, then move it. Chrome's autoplay
        // check uses the video's own document: Facebook's page has had the user's click, the mini player
        // window may not have (a wheel scroll does not count as user activation).
        await this.play(next);
        stage?.present(next);
        this.stageResumes = 0;
        if (this.playBlocked) return false;
        // Checked in the background, so the user can change Reel again right away.
        void this.keepNewReelPlaying(next);
        return true;
    }

    /** Facebook may pause a video it did not start itself; one retry covers that (seen in testing). */
    private async keepNewReelPlaying(video: HTMLVideoElement): Promise<void> {
        for (let attempt = 0; attempt < 2; attempt++) {
            await this.delay(this.options.playVerifyMs);
            // Stop when the Reel changed again, it plays, or the user paused it (that pause must stick).
            if (this.disposed || video !== this.getCurrentVideo() || !video.paused || this.pausedByUser === video) {
                return;
            }
            await this.play(video);
        }
        if (video.paused && video === this.getCurrentVideo()) {
            this.lastNavigation = {
                at: Date.now(),
                result: 'failed',
                detail: 'Moved to the next video, but it did not start.',
            };
            this.publishStatus();
        }
    }

    private async play(video: HTMLVideoElement): Promise<void> {
        try {
            await video.play();
            this.playBlocked = false;
        } catch (error) {
            // NotAllowedError: Chrome's autoplay policy needs a user interaction with the page first.
            this.playBlocked = error instanceof DOMException && error.name === 'NotAllowedError';
        }
        this.publishStatus();
    }

    private hasMoved(
        fromReel: string | null,
        fromVideo: HTMLVideoElement | null,
        strategy: NavigationStrategy,
    ): boolean {
        if (this.getCurrentReelId() !== fromReel) return true;
        const video = this.getCurrentVideo();
        return strategy.keepsUrl === true && fromVideo !== null && video !== null && video !== fromVideo;
    }

    private onReelsPage(): boolean {
        return this.platform.isReelsPage(this.view.location.pathname);
    }

    private getCurrentReelId(): string | null {
        return this.platform.getReelId(this.view.location.pathname);
    }

    /**
     * The current Reel's video, wherever it is shown (mini player or Facebook's page).
     * Found by Reel id, with a geometry fallback in case Facebook's markup changes.
     */
    getCurrentVideo(): HTMLVideoElement | null {
        if (this.stage?.video) return this.stage.video;
        const reelId = this.getCurrentReelId();
        return (reelId ? this.platform.findReelVideo(this.doc, reelId) : null) ?? findActiveVideo(this.doc);
    }

    private getVideoState(video: HTMLVideoElement | null): VideoState {
        if (!video) return 'none';
        if (this.playBlocked && video.paused) return 'blocked';
        if (video.paused || video.ended) return 'paused';
        return video.readyState < HTMLMediaElement.HAVE_FUTURE_DATA ? 'loading' : 'playing';
    }

    private getWarning(video: HTMLVideoElement | null): string | null {
        if (!video) return 'No video found. The page may still be loading, or the site has changed it.';
        if (this.getVideoState(video) === 'blocked') {
            return 'Chrome blocked playback. Click the video once in this tab, then try again.';
        }
        if (this.lastNavigation?.result === 'failed') return this.lastNavigation.detail;
        return null;
    }

    /** Resolves true as soon as the condition holds, false after the timeout. Re-checked on page events. */
    private waitFor(condition: () => boolean, timeoutMs = this.options.navigationTimeoutMs): Promise<boolean> {
        return this.waitForValue(() => (condition() ? true : null), timeoutMs).then(value => value === true);
    }

    private waitForValue<T>(read: () => T | null, timeoutMs = this.options.navigationTimeoutMs): Promise<T | null> {
        return new Promise(resolve => {
            const finish = (value: T | null): void => {
                this.view.clearTimeout(timer);
                this.changeWaiters.delete(check);
                resolve(value);
            };
            const check = (): void => {
                if (this.disposed) return finish(null);
                const value = read();
                if (value !== null) finish(value);
            };
            const timer = this.view.setTimeout(() => finish(read()), timeoutMs);
            this.changeWaiters.add(check);
            check();
        });
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => this.view.setTimeout(resolve, ms));
    }

    private notifyChangeWaiters(): void {
        for (const check of [...this.changeWaiters]) check();
    }

    private readonly publishStatus = (): void => {
        if (this.disposed) return;
        const status = this.getStatus();
        const json = JSON.stringify(status);
        if (json === this.lastStatusJson) return;
        this.lastStatusJson = json;
        this.options.onStatus(status);
    };
}
