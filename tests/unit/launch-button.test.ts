import { describe, expect, it, vi } from 'vitest';

import { LaunchButton } from '@/content/mini-player/launch-button';
import { belowAnchor, type ButtonPlacement } from '@/content/mini-player/launch-button-placement';
import { DEFAULT_THEME, getLaunchButtonTheme, type LaunchButtonTheme } from '@/content/mini-player/launch-button-theme';

function anchorAt(left: number, top: number): HTMLElement {
    const anchor = document.createElement('div');
    anchor.getBoundingClientRect = () =>
        ({ left, top, width: 48, height: 48, right: left + 48, bottom: top + 48 }) as DOMRect;
    return anchor;
}

/** Shows a launch button and returns its host element, which carries the position. */
function showButton(placement: ButtonPlacement, theme: LaunchButtonTheme = DEFAULT_THEME) {
    const button = new LaunchButton(document, placement, () => undefined, theme);
    button.setVisible(true);
    const hosts = document.querySelectorAll<HTMLElement>('reeldock-launcher');
    return { button, host: hosts[hosts.length - 1]! };
}

describe('LaunchButton placement below the anchor', () => {
    it("sits centred 16 px under the site's next button", () => {
        const { button, host } = showButton(belowAnchor(() => anchorAt(964, 420), DEFAULT_THEME, window));
        expect(host.style.left).toBe('964px');
        expect(host.style.top).toBe('484px');
        button.setVisible(false);
    });

    it('falls back to the bottom-left corner when the next button is missing', () => {
        const { button, host } = showButton(belowAnchor(() => null, DEFAULT_THEME, window));
        expect(host.style.left).toBe('24px');
        expect(host.style.bottom).toBe('24px');
        expect(host.style.top).toBe('');
        button.setVisible(false);
    });

    it('waits where the next button will appear, so it does not jump later', () => {
        const theme = getLaunchButtonTheme('youtube');
        let anchor: HTMLElement | null = null;
        const { button, host } = showButton(
            belowAnchor(() => anchor, theme, window),
            theme,
        );
        expect(host.style.right).toBe('24px');
        expect(host.style.top).toBe(`${Math.round(window.innerHeight / 2 + 116)}px`);
        expect(host.style.left).toBe('');
        expect(host.style.bottom).toBe('');

        // Once the real button exists it takes over and the stale right offset is cleared.
        anchor = anchorAt(900, 400);
        button.place();
        expect(host.style.right).toBe('');
        expect(host.style.left).toBe('896px');
        expect(host.style.top).toBe('464px');
        button.setVisible(false);
    });
});

describe('LaunchButton with a custom placement', () => {
    it('goes wherever the placement says', () => {
        const { button, host } = showButton(() => ({ right: 10, top: 20 }));
        expect(host.style.right).toBe('10px');
        expect(host.style.top).toBe('20px');
        expect(host.style.left).toBe('');
        expect(host.style.bottom).toBe('');
        button.setVisible(false);
    });
});

describe('launch button themes', () => {
    it('gives unknown sites the default look', () => {
        expect(getLaunchButtonTheme('some-new-site')).toEqual(DEFAULT_THEME);
    });

    it('lets a site override only what it lists', () => {
        const facebook = getLaunchButtonTheme('facebook');
        expect(facebook.background).not.toBe(DEFAULT_THEME.background);
        expect(facebook.size).toBe(DEFAULT_THEME.size);
    });
});

describe('LaunchButton click', () => {
    it('opens even when the page stops clicks on the document', () => {
        const onClick = vi.fn();
        const stopClicks = (event: Event) => event.stopPropagation();
        document.addEventListener('click', stopClicks, true);

        const button = new LaunchButton(document, () => ({ right: 10, top: 20 }), onClick);
        button.setVisible(true);
        document.querySelector('reeldock-launcher')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));

        expect(onClick).toHaveBeenCalledTimes(1);
        document.removeEventListener('click', stopClicks, true);
        button.setVisible(false);
    });

    it('ignores clicks elsewhere on the page', () => {
        const onClick = vi.fn();
        const button = new LaunchButton(document, () => ({ right: 10, top: 20 }), onClick);
        button.setVisible(true);
        document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));

        expect(onClick).not.toHaveBeenCalled();
        button.setVisible(false);
    });
});
