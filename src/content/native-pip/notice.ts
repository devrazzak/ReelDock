const CSS = `
:host { all: initial; position: fixed; z-index: 2147483647; left: 50%; bottom: 32px; transform: translateX(-50%); }
div {
    max-width: 360px; padding: 10px 14px; border-radius: 8px; background: #111; color: #fff;
    font: 14px/1.4 system-ui, sans-serif; box-shadow: 0 2px 12px rgb(0 0 0 / 0.4);
}
`;

/** A short message over the page that goes away by itself. Closed shadow root: the page's CSS cannot touch it. */
export function showNotice(doc: Document, message: string, durationMs = 6000): void {
    const host = doc.createElement('reeldock-notice');
    const shadow = host.attachShadow({ mode: 'closed' });
    const style = doc.createElement('style');
    style.textContent = CSS;
    const text = doc.createElement('div');
    text.textContent = message;
    shadow.append(style, text);
    doc.documentElement.append(host);
    setTimeout(() => host.remove(), durationMs);
}
