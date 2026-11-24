/**
 * The button in the page that opens the mini player.
 * Chrome only opens a Picture-in-Picture window from a click inside the page itself,
 * so the popup or a keyboard shortcut cannot do this.
 *
 * Where it sits is decided by the caller (see launch-button-placement.ts); this class only draws it.
 * Rendered in a closed shadow root so the page's CSS and ours cannot affect each other.
 */
import { createElement, createSvg, type IconShape } from '../dom/build';
import type { ButtonPlacement } from './launch-button-placement';
import { DEFAULT_THEME, type LaunchButtonTheme } from './launch-button-theme';

const buildCss = ({ size, iconSize, background, shadow, color, restingOpacity, dark }: LaunchButtonTheme) => `
:host { all: initial; position: fixed; z-index: 2147483647; }
button {
    width: ${size}px; height: ${size}px; border-radius: 50%; padding: 0; border: 0; cursor: pointer;
    display: grid; place-items: center; background: ${background}; box-shadow: ${shadow ?? 'none'}; color: ${color}; opacity: ${restingOpacity};
    transition: opacity 0.1s linear, transform 0.3s;
}
button:hover, button:focus-visible, button[aria-pressed='true'] { opacity: 1; }
button:active { transform: scale(0.96); }
button:focus-visible { outline: 2px solid currentColor; outline-offset: 2px; }
svg { width: ${iconSize}px; height: ${iconSize}px; display: block; }
${dark ? `:host-context(html[dark]) button, :host-context(html.__fb-dark-mode) button { background: ${dark.background}; color: ${dark.color}; }` : ''}
`;

// Picture-in-picture glyph. Facebook's own buttons draw a ring around their icon, so some themes add one.
const RING: IconShape = {
    tag: 'circle',
    attrs: { cx: '12', cy: '12', r: '10.5', fill: 'none', stroke: 'currentColor', 'stroke-width': '2' },
};
const GLYPH: IconShape[] = [
    {
        tag: 'rect',
        attrs: {
            x: '7',
            y: '8.25',
            width: '10',
            height: '7.5',
            rx: '1.25',
            fill: 'none',
            stroke: 'currentColor',
            'stroke-width': '1.5',
        },
    },
    { tag: 'rect', attrs: { x: '11.5', y: '11.75', width: '4', height: '2.75', rx: '0.5', fill: 'currentColor' } },
];

export class LaunchButton {
    private readonly host: HTMLElement;
    private readonly button: HTMLButtonElement;

    constructor(
        doc: Document,
        private readonly placement: ButtonPlacement,
        onClick: () => void,
        theme: LaunchButtonTheme = DEFAULT_THEME,
    ) {
        this.host = doc.createElement('reeldock-launcher');
        const shadow = this.host.attachShadow({ mode: 'closed' });
        const style = createElement(doc, 'style');
        style.textContent = buildCss(theme);
        this.button = createElement(doc, 'button', { type: 'button' }, [
            createSvg(doc, theme.ring ? [RING, ...GLYPH] : GLYPH),
        ]);
        shadow.append(style, this.button);
        this.button.addEventListener('click', onClick);
        doc.defaultView?.addEventListener('resize', () => this.place());
        this.setOpen(false);
    }

    /** Adds the button to the page or removes it. Also re-aligns it with the page layout. */
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

    /** Moves the button to where the placement says. Call it when what the button follows has moved. */
    place(): void {
        const position = this.placement();
        const { style } = this.host;
        // Clear the sides the placement leaves out, so an old value cannot pull the button elsewhere.
        for (const side of ['left', 'right', 'top', 'bottom'] as const) {
            const value = position[side];
            style[side] = value === undefined ? '' : `${value}px`;
        }
    }
}
