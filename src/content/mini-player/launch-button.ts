/**
 * The button on the Reels page that opens the mini player.
 * Chrome only opens a Picture-in-Picture window from a click inside the page itself,
 * so the popup or a keyboard shortcut cannot do this.
 *
 * It sits right under the site's own "next" button, where it reads as part of the Reel navigation
 * and stays clear of Facebook's chat bubbles in the bottom-right corner. If that button cannot be
 * found, it falls back to the bottom-left corner, which Facebook leaves empty.
 * Rendered in a closed shadow root so the page's CSS and ours cannot affect each other.
 */
import { createElement, createSvg, type IconShape } from '../dom/build';
import { CORNER_MARGIN, DEFAULT_THEME, type LaunchButtonTheme } from './launch-button-theme';

const buildCss = ({ size, iconSize, background, color, restingOpacity, dark }: LaunchButtonTheme) => `
:host { all: initial; position: fixed; z-index: 2147483647; }
button {
    width: ${size}px; height: ${size}px; border-radius: 50%; padding: 0; border: 0; cursor: pointer;
    display: grid; place-items: center; background: ${background}; color: ${color}; opacity: ${restingOpacity};
    transition: opacity 0.1s linear, transform 0.3s;
}
button:hover, button:focus-visible, button[aria-pressed='true'] { opacity: 1; }
button:active { transform: scale(0.96); }
button:focus-visible { outline: 2px solid currentColor; outline-offset: 2px; }
svg { width: ${iconSize}px; height: ${iconSize}px; display: block; }
${dark ? `:host-context(html[dark]) button { background: ${dark.background}; color: ${dark.color}; }` : ''}
`;

// Picture-in-picture glyph. Facebook's own buttons draw a ring around their icon, so some themes add one.
const RING: IconShape = {
    tag: 'circle',
    attrs: { cx: '12', cy: '12', r: '10.5', fill: 'none', stroke: 'currentColor', 'stroke-width': '2' },
};
const GLYPH: IconShape[] = [
    { tag: 'rect', attrs: { x: '7', y: '8.25', width: '10', height: '7.5', rx: '1.25', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.5' } },
    { tag: 'rect', attrs: { x: '11.5', y: '11.75', width: '4', height: '2.75', rx: '0.5', fill: 'currentColor' } },
];

export class LaunchButton {
    private readonly host: HTMLElement;
    private readonly button: HTMLButtonElement;

    /**
     * @param getAnchor returns the element to sit under (the site's own "next" button), or null.
     */
    constructor(
        doc: Document,
        private readonly getAnchor: () => HTMLElement | null,
        onClick: () => void,
        private readonly theme: LaunchButtonTheme = DEFAULT_THEME,
    ) {
        this.host = doc.createElement('reeldock-launcher');
        const shadow = this.host.attachShadow({ mode: 'closed' });
        const style = createElement(doc, 'style');
        style.textContent = buildCss(theme);
        this.button = createElement(doc, 'button', { type: 'button' }, [createSvg(doc, theme.ring ? [RING, ...GLYPH] : GLYPH)]);
        shadow.append(style, this.button);
        this.button.addEventListener('click', onClick);
        doc.defaultView?.addEventListener('resize', () => this.place());
        this.setOpen(false);
    }

    /** Shows the button on Reels pages and removes it elsewhere. Also re-aligns it with the page layout. */
    setVisible(visible: boolean): void {
        const parent = this.host.ownerDocument.body;
        if (visible && parent && !this.host.isConnected) parent.append(this.host);
        if (!visible && this.host.isConnected) this.host.remove();
        if (visible) this.place();
    }

    setOpen(open: boolean): void {
        const label = open ? 'Close mini player' : 'Open mini player';
        this.button.setAttribute('aria-label', label);
        this.button.setAttribute('aria-pressed', String(open));
        this.button.title = label;
    }

    private place(): void {
        const rect = this.getAnchor()?.getBoundingClientRect();
        const { style } = this.host;
        const { size, gapBelowAnchor, fallbackPosition } = this.theme;
        const view = this.host.ownerDocument.defaultView;
        style.left = style.right = style.top = style.bottom = '';

        if (rect && rect.width > 0) {
            style.left = `${Math.round(rect.left + rect.width / 2 - size / 2)}px`;
            style.top = `${Math.round(rect.bottom + gapBelowAnchor)}px`;
        } else if (fallbackPosition && view) {
            style.right = `${fallbackPosition.right}px`;
            style.top = `${Math.round(view.innerHeight / 2 + fallbackPosition.fromCenter)}px`;
        } else {
            style.left = `${CORNER_MARGIN}px`;
            style.bottom = `${CORNER_MARGIN}px`;
        }
    }
}
