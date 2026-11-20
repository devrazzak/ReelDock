// Imported first by the harness, so it captures Chrome's getter before the guard replaces it.
const getter = Object.getOwnPropertyDescriptor(Document.prototype, 'hidden')?.get;

export const isReallyHidden = (): boolean => Boolean(getter?.call(document));
