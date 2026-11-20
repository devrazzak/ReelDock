import { describe, expect, it } from 'vitest';

import { findMuteButton, findNavigationButton, findReelVideo } from '@/content/reels/reel-dom';
import { findActiveVideo } from '@/content/video/active-video';

function stubRect(element: Element, top: number, height: number): void {
    element.getBoundingClientRect = () =>
        ({ top, bottom: top + height, left: 0, right: 400, width: 400, height }) as DOMRect;
}

describe('findReelVideo', () => {
    it('finds the video inside the card with the matching data-video-id', () => {
        document.body.innerHTML = `
            <div data-video-id="111"><div><video id="a"></video></div></div>
            <div data-video-id="222"><video id="b"></video></div>`;
        expect(findReelVideo(document, '222')?.id).toBe('b');
        expect(findReelVideo(document, '999')).toBeNull();
    });
});

describe('findNavigationButton', () => {
    it('matches the accessible name case-insensitively', () => {
        document.body.innerHTML = `<div role="button" aria-label="Next Card" id="next"></div>`;
        expect(findNavigationButton(document, 'next')?.id).toBe('next');
        expect(findNavigationButton(document, 'previous')).toBeNull();
    });

    it('skips disabled buttons', () => {
        document.body.innerHTML = `<div role="button" aria-label="Next Card" aria-disabled="true"></div>`;
        expect(findNavigationButton(document, 'next')).toBeNull();
    });
});

describe('findActiveVideo', () => {
    it('prefers the video that covers most of the viewport', () => {
        document.body.innerHTML = `<video id="small"></video><video id="big"></video>`;
        const [small, big] = document.querySelectorAll('video');
        stubRect(small!, -600, 700); // mostly scrolled out
        stubRect(big!, 50, 600);
        expect(findActiveVideo(document)?.id).toBe('big');
    });

    it('prefers a playing video over a bigger paused one', () => {
        document.body.innerHTML = `<video id="paused"></video><video id="playing"></video>`;
        const [paused, playing] = document.querySelectorAll('video');
        stubRect(paused!, 0, 700);
        stubRect(playing!, 600, 100);
        Object.defineProperty(playing, 'paused', { value: false });
        expect(findActiveVideo(document)?.id).toBe('playing');
    });

    it('returns null without videos', () => {
        document.body.innerHTML = '';
        expect(findActiveVideo(document)).toBeNull();
    });
});

describe('findMuteButton', () => {
    it("prefers the current card's button and ignores the image with the same label", () => {
        document.body.innerHTML = `
            <div data-video-id="111"><div role="button" aria-label="Unmute" id="other"></div></div>
            <div data-video-id="222">
                <div role="img" aria-label="Unmute"></div>
                <div role="button" aria-label="Mute" id="current"></div>
            </div>`;
        expect(findMuteButton(document, '222')?.id).toBe('current');
    });
});
