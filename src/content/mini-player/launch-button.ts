/**
 * The button on Facebook's Reels page that opens the mini player.
 * Chrome only opens a Picture-in-Picture window from a click inside the page itself,
 * so the popup or a keyboard shortcut cannot do this.
 * Rendered in a closed shadow root so Facebook's CSS and ours cannot affect each other.
 */
const BUTTON_CSS = `
:host { all: initial; }
button {
    position: fixed; right: 24px; bottom: 24px; z-index: 2147483647;
    display: flex; align-items: center; gap: 8px; padding: 10px 14px;
    border: 0; border-radius: 999px; cursor: pointer;
    background: rgb(0 0 0 / 0.7); color: #fff; font: 600 13px/1 system-ui, sans-serif;
    box-shadow: 0 2px 12px rgb(0 0 0 / 0.3);
}
button:hover { background: rgb(0 0 0 / 0.85); }
button:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
svg { width: 18px; height: 18px; fill: currentColor; }
`;

const ICON =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 11h-8v6h8zm4 8V5a2 2 0 0 0-2-2H3a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2zm-2 0H3V5h18z"/></svg>';

export class LaunchButton {
    private readonly host: HTMLElement;
    private readonly button: HTMLButtonElement;

    constructor(doc: Document, onClick: () => void) {
        this.host = doc.createElement('reels-mini-player-launcher');
        const shadow = this.host.attachShadow({ mode: 'closed' });
        shadow.innerHTML = `<style>${BUTTON_CSS}</style><button type="button">${ICON}<span></span></button>`;
        const button = shadow.querySelector('button');
        if (!button) throw new Error('Launch button markup is missing');
        this.button = button;
        this.button.addEventListener('click', onClick);
        this.setOpen(false);
    }

    /** Shows the button on Reels pages and removes it elsewhere. */
    setVisible(visible: boolean): void {
        const parent = this.host.ownerDocument.body;
        if (visible && parent && !this.host.isConnected) parent.append(this.host);
        if (!visible && this.host.isConnected) this.host.remove();
    }

    setOpen(open: boolean): void {
        const label = open ? 'Close mini player' : 'Mini player';
        const text = this.button.querySelector('span');
        if (text) text.textContent = label;
        this.button.setAttribute('aria-label', label);
    }
}
