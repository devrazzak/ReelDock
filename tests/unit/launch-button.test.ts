import { describe, expect, it } from 'vitest';

import { LaunchButton } from '@/content/mini-player/launch-button';

function anchorAt(left: number, top: number): HTMLElement {
    const anchor = document.createElement('div');
    anchor.getBoundingClientRect = () =>
        ({ left, top, width: 48, height: 48, right: left + 48, bottom: top + 48 }) as DOMRect;
    return anchor;
}

describe('LaunchButton placement', () => {
    it("sits centred 16 px under the site's next button", () => {
        const button = new LaunchButton(
            document,
            () => anchorAt(964, 420),
            () => undefined,
        );
        button.setVisible(true);

        const host = document.querySelector<HTMLElement>('reeldock-launcher')!;
        expect(host.style.left).toBe('964px');
        expect(host.style.top).toBe('484px');
        button.setVisible(false);
    });

    it('falls back to the bottom-left corner when the next button is missing', () => {
        const button = new LaunchButton(
            document,
            () => null,
            () => undefined,
        );
        button.setVisible(true);

        const host = document.querySelector<HTMLElement>('reeldock-launcher')!;
        expect(host.style.left).toBe('24px');
        expect(host.style.bottom).toBe('24px');
        expect(host.style.top).toBe('');
        button.setVisible(false);
    });
});

describe('launch button themes', () => {
    it('gives unknown sites the default look', async () => {
        const { DEFAULT_THEME, getLaunchButtonTheme } = await import('@/content/mini-player/launch-button-theme');
        expect(getLaunchButtonTheme('some-new-site')).toEqual(DEFAULT_THEME);
    });

    it('lets a site override only what it lists', async () => {
        const { DEFAULT_THEME, getLaunchButtonTheme } = await import('@/content/mini-player/launch-button-theme');
        const facebook = getLaunchButtonTheme('facebook');
        expect(facebook.background).not.toBe(DEFAULT_THEME.background);
        expect(facebook.size).toBe(DEFAULT_THEME.size);
    });
});

describe('LaunchButton fallback position', () => {
    it('waits where the next button will appear, so it does not jump later', async () => {
        const { getLaunchButtonTheme } = await import('@/content/mini-player/launch-button-theme');
        const theme = getLaunchButtonTheme('youtube');
        const button = new LaunchButton(
            document,
            () => null,
            () => undefined,
            theme,
        );
        button.setVisible(true);

        const host = document.querySelector<HTMLElement>('reeldock-launcher')!;
        expect(host.style.right).toBe('24px');
        expect(host.style.top).toBe(`${Math.round(window.innerHeight / 2 + 116)}px`);
        expect(host.style.left).toBe('');
        expect(host.style.bottom).toBe('');

        // Once the real button exists it takes over and the stale right offset is cleared.
        const anchored = new LaunchButton(
            document,
            () => anchorAt(900, 400),
            () => undefined,
            theme,
        );
        anchored.setVisible(true);
        const hosts = document.querySelectorAll<HTMLElement>('reeldock-launcher');
        expect(hosts[1]!.style.right).toBe('');
        expect(hosts[1]!.style.left).toBe('896px');
        expect(hosts[1]!.style.top).toBe('464px');
        button.setVisible(false);
        anchored.setVisible(false);
    });
});
