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

const SIZE = 48;
const GAP_BELOW_ANCHOR = 16;
const FALLBACK_MARGIN = 24;

// Same size as Facebook's own up/down Reel buttons (48 px circle, full opacity on hover). The dark fill keeps
// the white icon readable on both dark pages (Facebook) and light ones (YouTube's light theme).
const BUTTON_CSS = `
:host { all: initial; position: fixed; z-index: 2147483647; }
button {
    width: ${SIZE}px; height: ${SIZE}px; border-radius: 50%; padding: 0; border: 0; cursor: pointer;
    display: block; background: rgb(0 0 0 / 0.55); color: #fff; opacity: 0.75;
    transition: opacity 0.1s linear, transform 0.3s;
}
button:hover, button:focus-visible, button[aria-pressed='true'] { opacity: 1; }
button:active { transform: scale(0.96); }
button:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
svg { width: ${SIZE}px; height: ${SIZE}px; display: block; }
`;

// Ring like Facebook's icons, with a picture-in-picture glyph in the middle.
const ICON: IconShape[] = [
    { tag: 'circle', attrs: { cx: '12', cy: '12', r: '10.5', fill: 'none', stroke: 'currentColor', 'stroke-width': '2' } },
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
    ) {
        this.host = doc.createElement('reeldock-launcher');
        const shadow = this.host.attachShadow({ mode: 'closed' });
        const style = createElement(doc, 'style');
        style.textContent = BUTTON_CSS;
        this.button = createElement(doc, 'button', { type: 'button' }, [createSvg(doc, ICON)]);
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
        if (rect && rect.width > 0) {
            style.left = `${Math.round(rect.left + rect.width / 2 - SIZE / 2)}px`;
            style.top = `${Math.round(rect.bottom + GAP_BELOW_ANCHOR)}px`;
            style.bottom = '';
        } else {
            style.left = `${FALLBACK_MARGIN}px`;
            style.top = '';
            style.bottom = `${FALLBACK_MARGIN}px`;
        }
    }
}
