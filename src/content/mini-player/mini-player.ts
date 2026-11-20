import { MINI_PLAYER_CSS } from '@/content/mini-player/mini-player.styles';
import type { Direction } from '@/content/reels/reel-dom';
import type { VideoStage } from '@/content/session/reel-session';

export interface MiniPlayerHandlers {
    onNavigate: (direction: Direction) => Promise<void>;
    onTogglePlay: () => void;
    /** Mutes through Facebook's own button, so the choice carries over to the next Reels. */
    onToggleMute: () => void;
    onSeek: (direction: 'forward' | 'backward') => void;
    /** Called with the mini player's document so media events inside it can be observed. */
    onOpen: (pipDocument: Document) => void;
    onClose: () => void;
}

/** Wheel distance (in pixels) that counts as one "swipe". */
const WHEEL_THRESHOLD = 100;
/** Ignore wheel input this long after a Reel change, so trackpad inertia does not skip Reels. */
const WHEEL_COOLDOWN_MS = 600;
/** Vertical drag distance that counts as a swipe; shorter drags snap back. */
const DRAG_THRESHOLD = 70;
/** Movement below this is a click, not a drag. */
const CLICK_TOLERANCE = 10;

const ICONS = {
    previous: '<path d="M12 7.6 5.3 14.3l1.4 1.4L12 10.4l5.3 5.3 1.4-1.4z"/>',
    next: '<path d="M12 16.4 5.3 9.7l1.4-1.4 5.3 5.3 5.3-5.3 1.4 1.4z"/>',
    sound: '<path d="M4 9v6h4l5 4V5L8 9zm11.5 3a3.5 3.5 0 0 0-2-3.2v6.4a3.5 3.5 0 0 0 2-3.2zm-2-7.8v2.1a7 7 0 0 1 0 11.4v2.1a9 9 0 0 0 0-15.6z"/>',
    muted: '<path d="M4 9v6h4l5 4V5L8 9zm16.6 3 2.1-2.1-1.4-1.4-2.1 2.1-2.1-2.1-1.4 1.4 2.1 2.1-2.1 2.1 1.4 1.4 2.1-2.1 2.1 2.1 1.4-1.4z"/>',
    play: '<path d="M8 5v14l11-7z"/>',
    pause: '<path d="M6 5h4v14H6zm8 0h4v14h-4z"/>',
    back10: '<path d="M12 5V1L7 6l5 5V7a6 6 0 1 1-6 6H4a8 8 0 1 0 8-8z"/><text x="12" y="16.5" font-size="7" font-weight="700" text-anchor="middle" font-family="system-ui,sans-serif">10</text>',
    forward10:
        '<path d="M12 5V1l5 5-5 5V7a6 6 0 1 0 6 6h2a8 8 0 1 1-8-8z"/><text x="12" y="16.5" font-size="7" font-weight="700" text-anchor="middle" font-family="system-ui,sans-serif">10</text>',
};

/**
 * Wheel distance in pixels. Many Windows mouse wheels report lines (deltaMode 1) or pages (2),
 * while macOS trackpads and most mice report pixels (0).
 */
export function wheelPixels(event: Pick<WheelEvent, 'deltaY' | 'deltaMode'>): number {
    if (event.deltaMode === 1) return event.deltaY * 40;
    if (event.deltaMode === 2) return event.deltaY * 800;
    return event.deltaY;
}

const svg = (path: string) => `<svg viewBox="0 0 24 24" aria-hidden="true">${path}</svg>`;

interface PresentedVideo {
    video: HTMLVideoElement;
    // Where the element lives in Facebook's page, so it can be put back exactly there.
    parent: ParentNode;
    nextSibling: Node | null;
    style: string | null;
}

/**
 * A floating, always-on-top window (Document Picture-in-Picture) that shows Facebook's own
 * <video> element. The element is moved into the window and back; nothing is copied or re-streamed.
 * Reels change with the mouse wheel / trackpad, a vertical drag, the arrow keys or the buttons.
 */
export class MiniPlayer implements VideoStage {
    private pip: Window | null = null;
    private presented: PresentedVideo | null = null;
    private elements: {
        player: HTMLElement;
        stage: HTMLElement;
        progress: HTMLElement;
        mute: HTMLElement;
        play: HTMLElement;
    } | null = null;
    private busy = false;
    private wheelDistance = 0;
    private wheelBlockedUntil = 0;

    constructor(
        private readonly opener: Window,
        private readonly handlers: MiniPlayerHandlers,
    ) {}

    static isSupported(view: Window): boolean {
        return view.documentPictureInPicture !== undefined;
    }

    get isOpen(): boolean {
        return this.pip !== null;
    }

    get video(): HTMLVideoElement | null {
        return this.presented?.video ?? null;
    }

    /** Must be called from a user gesture (click or key press) in the Facebook page. */
    async open(video: HTMLVideoElement | null): Promise<void> {
        if (this.pip) {
            this.pip.focus();
            return;
        }
        const api = this.opener.documentPictureInPicture;
        if (!api) throw new Error('The mini player needs Chrome 116 or later.');

        const pip = await api.requestWindow({ width: 360, height: 640 });
        this.pip = pip;
        this.build(pip.document);
        pip.addEventListener('pagehide', this.handleWindowClosed, { once: true });
        this.handlers.onOpen(pip.document);
        if (video) {
            // Play before moving: only Facebook's page is sure to have the user's interaction.
            await video.play().catch(() => undefined);
            this.present(video);
        }
    }

    close(): void {
        this.pip?.close();
    }

    /** Shows a video in the window. Moving an element can pause it, so the caller starts playback. */
    present(video: HTMLVideoElement): void {
        const elements = this.elements;
        if (!elements) return;
        if (this.presented && this.presented.video !== video) this.release();

        this.presented = {
            video,
            parent: video.parentNode ?? this.opener.document.body,
            nextSibling: video.nextSibling,
            style: video.getAttribute('style'),
        };
        video.removeAttribute('style');
        elements.stage.replaceChildren(video);

        // Slide the new Reel in from the side the previous one left towards.
        const { stage } = elements;
        const leaving = stage.classList.contains('leave-previous') ? 'previous' : 'next';
        stage.classList.remove('leave-next', 'leave-previous');
        stage.classList.add(`enter-${leaving}`);
        this.pip?.requestAnimationFrame(() => stage.classList.remove(`enter-${leaving}`));

        this.setBusy(false);
        this.syncControls();
    }

    /** Returns the video to its place in Facebook's page. */
    release(direction?: Direction): void {
        if (direction && this.elements) {
            this.elements.stage.classList.add(`leave-${direction}`);
            this.setBusy(true);
        }
        const presented = this.presented;
        if (!presented) return;
        this.presented = null;

        const { video, parent, nextSibling, style } = presented;
        const nextIsStillThere = nextSibling !== null && nextSibling.parentNode === parent;
        parent.insertBefore(video, nextIsStillThere ? nextSibling : null);
        if (style === null) video.removeAttribute('style');
        else video.setAttribute('style', style);
    }

    private readonly handleWindowClosed = (): void => {
        const video = this.video;
        const wasPlaying = video !== null && !video.paused;
        this.release();
        this.pip = null;
        this.elements = null;
        this.busy = false;
        this.handlers.onClose();
        // Back in the Facebook page, carry on where the mini player left off.
        if (video && wasPlaying) void video.play().catch(() => undefined);
    };

    private async navigate(direction: Direction): Promise<void> {
        if (this.busy) return;
        this.setBusy(true);
        try {
            await this.handlers.onNavigate(direction);
        } finally {
            this.setBusy(false);
            this.elements?.stage.classList.remove('leave-next', 'leave-previous');
            this.wheelDistance = 0;
            this.wheelBlockedUntil = Date.now() + WHEEL_COOLDOWN_MS;
        }
    }

    private setBusy(busy: boolean): void {
        this.busy = busy;
        this.elements?.player.classList.toggle('busy', busy);
    }

    private syncControls(): void {
        const elements = this.elements;
        const video = this.video;
        if (!elements) return;
        const paused = video?.paused ?? true;
        elements.player.classList.toggle('paused', paused);
        // Playing but without enough data to continue: show the spinner while it buffers.
        elements.player.classList.toggle(
            'buffering',
            video !== null && !paused && video.readyState < HTMLMediaElement.HAVE_FUTURE_DATA,
        );
        elements.play.innerHTML = svg(paused ? ICONS.play : ICONS.pause);
        elements.play.setAttribute('aria-label', paused ? 'Play' : 'Pause');
        elements.mute.innerHTML = svg(video?.muted ? ICONS.muted : ICONS.sound);
        elements.mute.setAttribute('aria-label', video?.muted ? 'Unmute' : 'Mute');
        const progress = video && video.duration > 0 ? (video.currentTime / video.duration) * 100 : 0;
        elements.progress.style.width = `${progress}%`;
    }

    private build(doc: Document): void {
        doc.title = 'Reels mini player';
        const style = doc.createElement('style');
        style.textContent = MINI_PLAYER_CSS;
        doc.head.append(style);

        doc.body.innerHTML = `
            <div class="player paused" role="region" aria-label="Reels mini player">
                <div class="stage"></div>
                <div class="spinner" role="status" aria-label="Loading next Reel"></div>
                <div class="paused-icon">${svg(ICONS.play)}</div>
                <div class="controls side">
                    <button type="button" data-action="previous" aria-label="Previous Reel">${svg(ICONS.previous)}</button>
                    <button type="button" data-action="next" aria-label="Next Reel">${svg(ICONS.next)}</button>
                    <button type="button" data-action="mute" aria-label="Mute">${svg(ICONS.sound)}</button>
                </div>
                <div class="controls bottom">
                    <button type="button" data-action="back" aria-label="Back 10 seconds">${svg(ICONS.back10)}</button>
                    <button type="button" class="large" data-action="play" aria-label="Pause">${svg(ICONS.pause)}</button>
                    <button type="button" data-action="forward" aria-label="Forward 10 seconds">${svg(ICONS.forward10)}</button>
                </div>
                <div class="progress"><div class="progress-bar"></div></div>
            </div>`;

        const find = (selector: string) => {
            const element = doc.querySelector<HTMLElement>(selector);
            if (!element) throw new Error(`Mini player markup is missing ${selector}`);
            return element;
        };
        this.elements = {
            player: find('.player'),
            stage: find('.stage'),
            progress: find('.progress-bar'),
            mute: find('[data-action="mute"]'),
            play: find('[data-action="play"]'),
        };

        this.bindButtons(doc);
        this.bindWheel(doc);
        this.bindDrag(this.elements.player);
        this.bindKeyboard(doc);
        for (const type of [
            'play',
            'playing',
            'pause',
            'waiting',
            'canplay',
            'timeupdate',
            'volumechange',
            'loadeddata',
        ]) {
            doc.addEventListener(type, () => this.syncControls(), true);
        }
    }

    private bindButtons(doc: Document): void {
        doc.addEventListener('click', event => {
            const action = (event.target as Element | null)?.closest('button')?.dataset.action;
            if (action === 'previous' || action === 'next') void this.navigate(action);
            if (action === 'mute') this.handlers.onToggleMute();
            if (action === 'play') this.handlers.onTogglePlay();
            if (action === 'back') this.handlers.onSeek('backward');
            if (action === 'forward') this.handlers.onSeek('forward');
        });
    }

    private bindWheel(doc: Document): void {
        doc.defaultView?.addEventListener('wheel', event => {
            // On macOS a wheel scroll does not activate the window, so the next click would only
            // activate it instead of pausing. The user is interacting with the mini player anyway.
            this.pip?.focus();
            if (this.busy || Date.now() < this.wheelBlockedUntil) return;
            this.wheelDistance += wheelPixels(event);
            if (Math.abs(this.wheelDistance) >= WHEEL_THRESHOLD) {
                void this.navigate(this.wheelDistance > 0 ? 'next' : 'previous');
            }
        });
    }

    private bindDrag(player: HTMLElement): void {
        let startY: number | null = null;
        let distance = 0;

        player.addEventListener('pointerdown', event => {
            if (event.button !== 0 || (event.target as Element).closest('button') || this.busy) return;
            startY = event.clientY;
            distance = 0;
            player.setPointerCapture(event.pointerId);
            player.classList.add('dragging');
        });
        player.addEventListener('pointermove', event => {
            if (startY === null || !this.elements) return;
            distance = event.clientY - startY;
            this.elements.stage.style.transform = `translateY(${distance * 0.6}px)`;
        });
        const finish = () => {
            if (startY === null || !this.elements) return;
            startY = null;
            player.classList.remove('dragging');
            this.elements.stage.style.transform = '';
            // Drag up = next Reel, drag down = previous Reel, like a phone.
            if (Math.abs(distance) >= DRAG_THRESHOLD) void this.navigate(distance < 0 ? 'next' : 'previous');
            else if (Math.abs(distance) < CLICK_TOLERANCE) this.handlers.onTogglePlay();
        };
        player.addEventListener('pointerup', finish);
        player.addEventListener('pointercancel', finish);
    }

    private bindKeyboard(doc: Document): void {
        doc.addEventListener('keydown', event => {
            if (event.key === 'ArrowDown') void this.navigate('next');
            else if (event.key === 'ArrowUp') void this.navigate('previous');
            else if (event.key === ' ') this.handlers.onTogglePlay();
            else if (event.key === 'ArrowRight') this.handlers.onSeek('forward');
            else if (event.key === 'ArrowLeft') this.handlers.onSeek('backward');
            else if (event.key === 'm' || event.key === 'M') this.handlers.onToggleMute();
            else return;
            event.preventDefault();
        });
    }
}
