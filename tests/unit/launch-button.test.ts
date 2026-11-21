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
