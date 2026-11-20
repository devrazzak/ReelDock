import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createNavigationStrategies } from '@/content/reels/reel-navigator';
import { ReelSession, type VideoStage } from '@/content/session/reel-session';
import { findActiveVideo } from '@/content/video/active-video';
import { DEFAULT_SETTINGS, type ExtensionSettings } from '@/shared/settings';
import type { PlaybackStatus } from '@/shared/status';

import { createFakeReelsPage, type FakeReelsPage } from '../helpers/fake-reels-page';

const REELS = ['111', '222', '333'];

interface Setup {
    page: FakeReelsPage;
    session: ReelSession;
    settings: ExtensionSettings;
    statuses: PlaybackStatus[];
}

let current: Setup | null = null;

interface SetupOptions {
    hidden?: boolean;
    blockPlay?: boolean;
    settings?: Partial<ExtensionSettings>;
    playVerifyMs?: number;
}

function setup(options: SetupOptions = {}): Setup {
    const page = createFakeReelsPage(document, REELS, { blockPlay: options.blockPlay ?? false });
    const settings: ExtensionSettings = { ...DEFAULT_SETTINGS, ...options.settings };
    const statuses: PlaybackStatus[] = [];
    const session = new ReelSession({
        doc: document,
        strategies: createNavigationStrategies(document, () => findActiveVideo(document)),
        getSettings: () => settings,
        onStatus: status => statuses.push(status),
        isTabHidden: () => options.hidden ?? true,
        navigationTimeoutMs: 150,
        autoplayGraceMs: 50,
        playVerifyMs: options.playVerifyMs ?? 20,
    });
    session.start();
    current = { page, session, settings, statuses };
    return current;
}

const settle = (ms = 200) => new Promise(resolve => setTimeout(resolve, ms));
const lastStatus = (statuses: PlaybackStatus[]) => statuses.at(-1)!;

beforeEach(() => {
    current = null;
});

afterEach(() => {
    current?.session.dispose();
});

describe('ReelSession auto next in a background tab', () => {
    it('moves to the next Reel once and hands playback over to its video', async () => {
        const { page, statuses } = setup({ hidden: true });
        const [first, second] = page.videos;
        await first!.play();
        first!.muted = false;

        first!.finish();
        await settle();

        expect(page.nextClicks).toBe(1);
        expect(location.pathname).toBe('/reel/222');
        expect(second!.paused).toBe(false);
        expect(second!.muted).toBe(false); // keeps the user's unmute choice
        expect(first!.paused).toBe(true); // Facebook's replay of the old Reel is stopped
        expect(page.videos.filter(video => !video.paused)).toHaveLength(1);
        expect(lastStatus(statuses)).toMatchObject({ reelId: '222', videoState: 'playing', navigating: false });
        expect(lastStatus(statuses).lastNavigation).toMatchObject({ result: 'success', detail: 'navigation-button' });
    });

    it('triggers only one navigation when a Reel reports completion several times', async () => {
        const { page } = setup();
        const first = page.videos[0]!;
        await first.play();

        first.finish();
        first.dispatchEvent(new Event('ended'));
        first.dispatchEvent(new Event('ended'));
        await settle();

        expect(page.nextClicks).toBe(1);
    });

    it('keeps going across several Reels', async () => {
        const { page } = setup();
        await page.videos[0]!.play();

        page.videos[0]!.finish();
        await settle();
        page.videos[1]!.finish();
        await settle();

        expect(page.nextClicks).toBe(2);
        expect(location.pathname).toBe('/reel/333');
        expect(page.videos[2]!.paused).toBe(false);
    });

    it('ignores completion of a video that is not the current Reel', async () => {
        const { page } = setup();
        page.videos[2]!.finish();
        await settle();
        expect(page.nextClicks).toBe(0);
    });

    it('does nothing when auto next is off', async () => {
        const { page } = setup({ settings: { autoNext: false } });
        page.videos[0]!.finish();
        await settle();
        expect(page.nextClicks).toBe(0);
    });

    it('does not start the next video in a hidden tab when background playback is off', async () => {
        const { page } = setup({ settings: { backgroundPlayback: false } });
        page.videos[0]!.finish();
        await settle();
        expect(location.pathname).toBe('/reel/222');
        expect(page.videos[1]!.playCalls).toBe(0);
    });
});

describe('ReelSession in a visible tab', () => {
    it('lets Facebook start the next Reel and does not call play() itself', async () => {
        const { page } = setup({ hidden: false });
        page.autoplayOnNavigate = true;
        page.videos[0]!.finish();
        await settle();
        expect(page.videos[1]!.paused).toBe(false);
        expect(page.videos[1]!.playCalls).toBe(1); // only Facebook's own call
    });
});

describe('ReelSession pause handling right after a Reel change', () => {
    it('keeps a pause from the user even while the new Reel is being checked', async () => {
        const { page, session } = setup({ playVerifyMs: 200 });
        page.videos[0]!.finish();
        await settle(60); // moved and started, start-up check still waiting
        expect(page.videos[1]!.paused).toBe(false);

        await session.runCommand('toggle-play');
        await settle(500);

        expect(page.videos[1]!.paused).toBe(true);
    });

    it('still restarts a new Reel that something else paused', async () => {
        const { page } = setup({ playVerifyMs: 100 });
        page.videos[0]!.finish();
        await settle(40);
        page.videos[1]!.pause(); // e.g. Facebook pausing a video it did not start itself
        await settle(300);

        expect(page.videos[1]!.paused).toBe(false);
    });
});

describe('ReelSession keeps a pause from the user', () => {
    it('undoes Facebook resuming a Reel the user paused in the mini player', async () => {
        const { page, session } = setup({ hidden: false });
        const stage = new FakeStage();
        session.attachStage(stage);
        stage.present(page.videos[0]!);
        await page.videos[0]!.play();

        await session.runCommand('toggle-play');
        await page.videos[0]!.play(); // Facebook syncing the element back to its own "playing" state

        expect(page.videos[0]!.paused).toBe(true);
    });

    it('leaves Facebook alone in a visible tab without the mini player', async () => {
        const { page, session } = setup({ hidden: false });
        await page.videos[0]!.play();

        await session.runCommand('toggle-play');
        await page.videos[0]!.play(); // the user pressing play in Facebook's own UI

        expect(page.videos[0]!.paused).toBe(false);
    });

    it('plays a previously paused Reel again when the user comes back to it', async () => {
        const { page, session } = setup({ hidden: true });
        await page.videos[0]!.play();
        await session.runCommand('toggle-play');

        await session.runCommand('next-reel');
        await session.runCommand('previous-reel');

        expect(location.pathname).toBe('/reel/111');
        expect(page.videos[0]!.paused).toBe(false);
    });
});

describe('ReelSession failures', () => {
    it('reports a failed navigation and retries on the next completion', async () => {
        const { page, statuses } = setup();
        page.brokenNavigation = true;

        page.videos[0]!.finish();
        await settle(300);
        expect(lastStatus(statuses).lastNavigation?.result).toBe('failed');
        expect(lastStatus(statuses).warning).toMatch(/Facebook may have changed/);

        page.brokenNavigation = false;
        page.videos[0]!.finish();
        await settle();
        expect(location.pathname).toBe('/reel/222');
    });

    it('reports when Chrome blocks playback', async () => {
        const { page, statuses } = setup({ blockPlay: true });
        page.videos[0]!.finish();
        await settle();
        expect(lastStatus(statuses).videoState).toBe('blocked');
        expect(lastStatus(statuses).warning).toMatch(/Chrome blocked playback/);
    });
});

class FakeStage implements VideoStage {
    isOpen = true;
    video: HTMLVideoElement | null = null;
    readonly calls: string[] = [];

    present(video: HTMLVideoElement): void {
        this.video = video;
        // Records whether the video was already playing when moved: Chrome may block play() after the move.
        const id = video.closest('[data-video-id]')?.getAttribute('data-video-id');
        this.calls.push(`present ${id}${video.paused ? '' : ' playing'}`);
    }

    release(direction?: string): void {
        this.video = null;
        this.calls.push(`release ${direction ?? ''}`.trim());
    }
}

describe('ReelSession with the mini player open', () => {
    it('gives the old video back, then shows and plays the next Reel in the mini player', async () => {
        const { page, session } = setup({ hidden: false });
        const stage = new FakeStage();
        session.attachStage(stage);
        stage.present(page.videos[0]!);
        await page.videos[0]!.play();

        page.videos[0]!.finish();
        await settle();

        expect(stage.calls).toEqual(['present 111', 'release next', 'present 222 playing']);
        expect(page.videos[1]!.paused).toBe(false);
        expect(page.videos.filter(video => !video.paused)).toHaveLength(1);
        expect(session.getStatus().miniPlayerOpen).toBe(true);
    });

    it('shows the same Reel again when navigation fails', async () => {
        const { page, session } = setup({ hidden: false });
        const stage = new FakeStage();
        session.attachStage(stage);
        stage.present(page.videos[0]!);
        page.brokenNavigation = true;

        await session.runCommand('next-reel');

        expect(stage.calls.at(-1)).toBe('present 111 playing');
        expect(page.videos[0]!.paused).toBe(false);
    });

    it('goes to the previous Reel on request', async () => {
        const { page, session } = setup({ hidden: false });
        history.replaceState({}, '', '/reel/222');
        const stage = new FakeStage();
        session.attachStage(stage);
        stage.present(page.videos[1]!);

        await session.runCommand('previous-reel');

        expect(stage.calls).toEqual(['present 222', 'release previous', 'present 111 playing']);
        expect(page.videos[0]!.paused).toBe(false);
    });
});

describe('ReelSession commands', () => {
    it('toggles play and pause on the current Reel', async () => {
        const { page, session } = setup();
        await session.runCommand('toggle-play');
        expect(page.videos[0]!.paused).toBe(false);
        await session.runCommand('toggle-play');
        expect(page.videos[0]!.paused).toBe(true);
    });

    it('goes to the next and previous Reel', async () => {
        const { session } = setup();
        await session.runCommand('next-reel');
        expect(location.pathname).toBe('/reel/222');
        await session.runCommand('previous-reel');
        expect(location.pathname).toBe('/reel/111');
    });

    it('rejects commands outside the Reels page', async () => {
        const { session } = setup();
        history.replaceState({}, '', '/');
        await expect(session.runCommand('next-reel')).rejects.toThrow('Open a Facebook Reel first.');
    });
});
