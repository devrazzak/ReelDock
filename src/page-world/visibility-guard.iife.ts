/**
 * Runs in Facebook's own JavaScript world (manifest `world: "MAIN"`) at document_start.
 *
 * Facebook pauses its player when the Page Visibility API reports the tab as hidden.
 * While background playback is on, this script makes the page see the tab as visible,
 * so Facebook's player keeps playing. It does not create, fake or loop any media.
 *
 * The isolated content script switches it on and off through a DOM attribute, because
 * the two JS worlds share the DOM but not variables. Content scripts keep their own
 * copy of the DOM prototypes, so they still see the real visibility state.
 */
import { BACKGROUND_ATTRIBUTE } from '@/shared/dom-contract';

(() => {
    const isEnabled = (): boolean => document.documentElement?.getAttribute(BACKGROUND_ATTRIBUTE) === 'on';

    const overrideGetter = <T>(property: string, visibleValue: T): void => {
        const original = Object.getOwnPropertyDescriptor(Document.prototype, property);
        const originalGet = original?.get;
        if (!original || !originalGet) return;

        Object.defineProperty(Document.prototype, property, {
            configurable: true,
            enumerable: original.enumerable ?? true,
            get(this: Document) {
                return isEnabled() ? visibleValue : originalGet.call(this);
            },
        });
    };

    overrideGetter('hidden', false);
    overrideGetter('visibilityState', 'visible');
    overrideGetter('webkitHidden', false);
    overrideGetter('webkitVisibilityState', 'visible');

    // Capture listeners on window run before any listener Facebook adds later.
    const blockWhileEnabled = (event: Event): void => {
        if (isEnabled()) event.stopImmediatePropagation();
    };
    window.addEventListener('visibilitychange', blockWhileEnabled, true);
    window.addEventListener('webkitvisibilitychange', blockWhileEnabled, true);
})();
