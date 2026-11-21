import { describe, expect, it } from 'vitest';

import { youtubeAdapter } from '@/content/platforms/youtube/youtube-adapter';
import { findMuteButton, findNavigationButton, findShortVideo } from '@/content/platforms/youtube/youtube-dom';
import { getShortId, isShortsPage } from '@/content/platforms/youtube/youtube-route';
import { YOUTUBE_SITE } from '@/shared/sites';

function stubRect(element: Element, top: number, height: number): void {
    element.getBoundingClientRect = () =>
        ({ top, bottom: top + height, left: 0, right: 400, width: 400, height }) as DOMRect;
}

describe('youtube route', () => {
    it('reads the Short id from the path, including ids with "_" and "-"', () => {
        expect(getShortId('/shorts/hIqnYdxSZwc')).toBe('hIqnYdxSZwc');
        expect(getShortId('/shorts/_1oeGAeiolk')).toBe('_1oeGAeiolk');
        expect(getShortId('/shorts/a-b_c')).toBe('a-b_c');
        expect(getShortId('/shorts/')).toBeNull();
        expect(getShortId('/watch')).toBeNull();
    });

    it('recognises the Shorts page', () => {
        expect(isShortsPage('/shorts/hIqnYdxSZwc')).toBe(true);
        expect(isShortsPage('/shorts')).toBe(true);
        expect(isShortsPage('/shorts-are-great')).toBe(false);
        expect(isShortsPage('/')).toBe(false);
    });
});

describe('findShortVideo', () => {
    // Mirrors youtube.com: two players, one loaded and one idle without a source.
    function renderPlayers(): { loaded: HTMLVideoElement; idle: HTMLVideoElement } {
        document.body.innerHTML = `
            <ytd-shorts>
                <video id="idle" class="html5-main-video" src=""></video>
                <video id="loaded" class="html5-main-video" src="blob:https://www.youtube.com/abc"></video>
            </ytd-shorts>
            <video id="outside" class="html5-main-video" src="blob:https://www.youtube.com/xyz"></video>`;
        const idle = document.querySelector<HTMLVideoElement>('#idle')!;
        const loaded = document.querySelector<HTMLVideoElement>('#loaded')!;
        for (const video of [idle, loaded, document.querySelector('#outside')!]) stubRect(video, 0, 700);
        return { loaded, idle };
    }

    it('ignores the idle player and videos outside the Shorts player', () => {
        const { loaded } = renderPlayers();
        expect(findShortVideo(document)).toBe(loaded);
    });

    it('still finds the loaded video when the user paused it', () => {
        const { loaded } = renderPlayers();
        expect(loaded.paused).toBe(true);
        expect(findShortVideo(document)).toBe(loaded);
    });

    it('prefers the playing video when both players have a source', () => {
        document.body.innerHTML = `
            <ytd-shorts>
                <video id="old" class="html5-main-video" src="blob:old"></video>
                <video id="current" class="html5-main-video" src="blob:current"></video>
            </ytd-shorts>`;
        const [old, current] = document.querySelectorAll('video');
        stubRect(old!, 0, 700);
        stubRect(current!, 600, 100);
        Object.defineProperty(current, 'paused', { value: false });
        expect(findShortVideo(document)?.id).toBe('current');
    });

    it('returns null when no player has a source yet', () => {
        document.body.innerHTML = `<ytd-shorts><video class="html5-main-video" src=""></video></ytd-shorts>`;
        expect(findShortVideo(document)).toBeNull();
    });
});

describe('findNavigationButton', () => {
    it('finds the buttons even though YouTube gives them no size', () => {
        document.body.innerHTML = `
            <button aria-label="Previous video" id="prev" style="display: none"></button>
            <button aria-label="Next video" id="next" style="display: none"></button>`;
        expect(findNavigationButton(document, 'next')?.id).toBe('next');
        expect(findNavigationButton(document, 'previous')?.id).toBe('prev');
    });

    it('matches the label case-insensitively and skips disabled buttons', () => {
        document.body.innerHTML = `<button aria-label="NEXT VIDEO" id="a" disabled></button><button aria-label="Next Video" id="b"></button>`;
        expect(findNavigationButton(document, 'next')?.id).toBe('b');
    });

    it('does not mistake other buttons for navigation', () => {
        document.body.innerHTML = `<button aria-label="Play (k)"></button><button aria-label="Next"></button>`;
        expect(findNavigationButton(document, 'next')).toBeNull();
    });
});

describe('findMuteButton', () => {
    it('finds the button with or without the key hint, muted or not', () => {
        document.body.innerHTML = `<button aria-label="Play (k)"></button><button aria-label="Mute (m)" id="m"></button>`;
        expect(findMuteButton(document)?.id).toBe('m');
        document.body.innerHTML = `<button aria-label="Unmute (m)" id="u"></button>`;
        expect(findMuteButton(document)?.id).toBe('u');
        document.body.innerHTML = `<button aria-label="Mute" id="plain"></button>`;
        expect(findMuteButton(document)?.id).toBe('plain');
    });

    it('returns null when there is no mute button', () => {
        document.body.innerHTML = `<button aria-label="Play (k)"></button>`;
        expect(findMuteButton(document)).toBeNull();
    });
});

describe('youtubeAdapter', () => {
    it('takes its identity from the shared site list', () => {
        expect(youtubeAdapter.id).toBe(YOUTUBE_SITE.id);
        expect(youtubeAdapter.hostnames).toEqual(YOUTUBE_SITE.hostnames);
    });
});
