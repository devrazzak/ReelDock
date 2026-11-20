import { beforeAll, describe, expect, it, vi } from 'vitest';

import { BACKGROUND_ATTRIBUTE } from '@/shared/dom-contract';

describe('visibility guard (page world)', () => {
    beforeAll(async () => {
        // happy-dom's global `Document` is not the class `document` was built from; use the real one,
        // which (like Chrome's) holds the visibility getters on its prototype.
        let proto = Object.getPrototypeOf(document);
        while (proto && !Object.hasOwn(proto, 'hidden')) proto = Object.getPrototypeOf(proto);
        vi.stubGlobal('Document', proto.constructor);

        // Simulate a hidden tab before the guard installs itself, as Chrome reports it.
        Object.defineProperty(proto, 'hidden', { configurable: true, get: () => true });
        Object.defineProperty(proto, 'visibilityState', { configurable: true, get: () => 'hidden' });
        await import('@/page-world/visibility-guard.iife');
    });

    it('reports the real state while background playback is off', () => {
        document.documentElement.setAttribute(BACKGROUND_ATTRIBUTE, 'off');
        expect(document.hidden).toBe(true);
        expect(document.visibilityState).toBe('hidden');
    });

    it('reports the tab as visible while background playback is on', () => {
        document.documentElement.setAttribute(BACKGROUND_ATTRIBUTE, 'on');
        expect(document.hidden).toBe(false);
        expect(document.visibilityState).toBe('visible');
    });

    it('stops visibilitychange from reaching page listeners only while on', () => {
        const pageListener = vi.fn();
        document.addEventListener('visibilitychange', pageListener);

        document.documentElement.setAttribute(BACKGROUND_ATTRIBUTE, 'on');
        document.dispatchEvent(new Event('visibilitychange', { bubbles: true }));
        expect(pageListener).not.toHaveBeenCalled();

        document.documentElement.setAttribute(BACKGROUND_ATTRIBUTE, 'off');
        document.dispatchEvent(new Event('visibilitychange', { bubbles: true }));
        expect(pageListener).toHaveBeenCalledTimes(1);
    });
});
