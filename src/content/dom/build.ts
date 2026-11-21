/**
 * Tiny DOM builders. Pages like YouTube enforce Trusted Types, which makes every
 * `innerHTML` assignment throw, so all markup is built with createElement instead.
 */
const SVG_NS = 'http://www.w3.org/2000/svg';

type Attributes = Record<string, string>;

/** One shape inside an icon, e.g. `{ tag: 'path', attrs: { d: '...' } }`. */
export interface IconShape {
    tag: 'path' | 'circle' | 'rect' | 'text';
    attrs: Attributes;
    text?: string;
}

export function createElement<K extends keyof HTMLElementTagNameMap>(
    doc: Document,
    tag: K,
    attrs: Attributes = {},
    children: Node[] = [],
): HTMLElementTagNameMap[K] {
    const element = doc.createElement(tag);
    for (const [name, value] of Object.entries(attrs)) element.setAttribute(name, value);
    element.append(...children);
    return element;
}

export function createSvg(doc: Document, shapes: IconShape[], extraAttrs: Attributes = {}): SVGSVGElement {
    const svg = doc.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    for (const [name, value] of Object.entries(extraAttrs)) svg.setAttribute(name, value);
    for (const shape of shapes) {
        const node = doc.createElementNS(SVG_NS, shape.tag);
        for (const [name, value] of Object.entries(shape.attrs)) node.setAttribute(name, value);
        if (shape.text) node.textContent = shape.text;
        svg.append(node);
    }
    return svg;
}
