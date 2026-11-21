import { describe, expect, it } from 'vitest';

import { instagramAdapter } from '@/content/platforms/instagram/instagram-adapter';
import { findMuteButton, findNavigationButton, findReelVideo } from '@/content/platforms/instagram/instagram-dom';
import { getReelId, isReelsPage } from '@/content/platforms/instagram/instagram-route';
import { INSTAGRAM_SITE } from '@/shared/sites';

function stubRect(element: Element, top: number, height: number): void {
    element.getBoundingClientRect = () =>
        ({ top, bottom: top + height, left: 0, right: 400, width: 400, height }) as DOMRect;
}

describe('instagram route', () => {
    it('reads the Reel id from /reels/<id>/ and /reel/<id>/', () => {
        expect(getReelId('/reels/DXk_a-1B2c3/')).toBe('DXk_a-1B2c3');
        expect(getReelId('/reel/DXk_a-1B2c3/')).toBe('DXk_a-1B2c3');
        expect(getReelId('/reels/')).toBeNull();
        expect(getReelId('/p/DXk_a-1B2c3/')).toBeNull();
    });

    it('recognises the Reels pages', () => {
        expect(isReelsPage('/reels')).toBe(true);
        expect(isReelsPage('/reels/DXk_a-1B2c3/')).toBe(true);
        expect(isReelsPage('/reel/DXk_a-1B2c3/')).toBe(true);
        expect(isReelsPage('/reelsfoo')).toBe(false);
        expect(isReelsPage('/')).toBe(false);
    });
});

describe('instagram dom', () => {
    function renderFeed(): { current: HTMLVideoElement; next: HTMLVideoElement } {
        document.body.innerHTML = `
            <div>
                <div id="card-current">
                    <video id="current" src="blob:current"></video>
                    <div role="button"><svg aria-label="Audio is muted"></svg></div>
                </div>
                <div id="card-next">
                    <video id="next" src="blob:next"></video>
                    <div role="button"><svg aria-label="Audio is playing"></svg></div>
                </div>
                <video id="empty"></video>
            </div>
            <div role="toolbar" aria-label="Reels navigation controls">
                <div role="button" aria-label="Navigate to previous Reel"></div>
                <div role="button" aria-label="Navigate to next Reel"></div>
            </div>`;
        const current = document.querySelector<HTMLVideoElement>('#current')!;
        const next = document.querySelector<HTMLVideoElement>('#next')!;
        stubRect(current, 0, 700);
        stubRect(next, 700, 700);
        stubRect(document.querySelector('#empty')!, 0, 700);
        return { current, next };
    }

    it('finds the loaded video on screen and ignores videos without a source', () => {
        const { current } = renderFeed();
        expect(findReelVideo(document)).toBe(current);
    });

    it('finds the Next and Previous buttons by their accessible name', () => {
        renderFeed();
        expect(findNavigationButton(document, 'next')?.getAttribute('aria-label')).toBe('Navigate to next Reel');
        expect(findNavigationButton(document, 'previous')?.getAttribute('aria-label')).toBe(
            'Navigate to previous Reel',
        );
    });

    it('skips a disabled navigation button', () => {
        renderFeed();
        document.querySelector('[aria-label="Navigate to next Reel"]')!.setAttribute('aria-disabled', 'true');
        expect(findNavigationButton(document, 'next')).toBeNull();
    });

    it('finds the mute button inside the card of the Reel on screen', () => {
        renderFeed();
        const button = findMuteButton(document);
        expect(button?.closest('#card-current')).not.toBeNull();
        expect(button?.querySelector('svg')?.getAttribute('aria-label')).toBe('Audio is muted');
    });
});

describe('instagram adapter', () => {
    it('takes its identity from the site definition', () => {
        expect(instagramAdapter.id).toBe(INSTAGRAM_SITE.id);
        expect(instagramAdapter.hostnames).toEqual(INSTAGRAM_SITE.hostnames);
    });
});
