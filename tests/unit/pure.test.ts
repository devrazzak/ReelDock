import { describe, expect, it } from 'vitest';

import { wheelPixels } from '@/content/mini-player/mini-player';
import { getReelId, isReelsPage } from '@/content/platforms/facebook/facebook-route';
import { isLoopRestart } from '@/content/video/end-detection';
import { isContentRequest } from '@/shared/messages';
import { DEFAULT_SETTINGS, parseSettings } from '@/shared/settings';

describe('isLoopRestart', () => {
    it('detects a jump from the end back to the start', () => {
        expect(isLoopRestart(9.8, 0.2, 10)).toBe(true);
    });

    it('ignores normal progress and user seeks in the middle', () => {
        expect(isLoopRestart(4, 4.25, 10)).toBe(false);
        expect(isLoopRestart(5, 0.1, 10)).toBe(false);
    });

    it('ignores unknown or very short durations', () => {
        expect(isLoopRestart(9.8, 0.2, Number.NaN)).toBe(false);
        expect(isLoopRestart(2.9, 0.1, 3)).toBe(false);
    });
});

describe('reel route', () => {
    it('reads the Reel id from the path', () => {
        expect(getReelId('/reel/1095178923489324')).toBe('1095178923489324');
        expect(getReelId('/reel/')).toBeNull();
        expect(getReelId('/watch/123')).toBeNull();
    });

    it('recognises the Reels page', () => {
        expect(isReelsPage('/reel/123')).toBe(true);
        expect(isReelsPage('/reel')).toBe(true);
        expect(isReelsPage('/reels-are-great')).toBe(false);
        expect(isReelsPage('/')).toBe(false);
    });
});

describe('parseSettings', () => {
    it('returns defaults for missing or broken data', () => {
        expect(parseSettings(undefined)).toEqual(DEFAULT_SETTINGS);
        expect(parseSettings('nonsense')).toEqual(DEFAULT_SETTINGS);
        expect(parseSettings({ autoNext: 'yes' })).toEqual(DEFAULT_SETTINGS);
    });

    it('keeps valid stored values', () => {
        expect(parseSettings({ autoNext: false, backgroundPlayback: false })).toEqual({
            autoNext: false,
            backgroundPlayback: false,
        });
    });
});

describe('isContentRequest', () => {
    it('accepts known requests only', () => {
        expect(isContentRequest({ type: 'get-status' })).toBe(true);
        expect(isContentRequest({ type: 'command', command: 'next-reel' })).toBe(true);
        expect(isContentRequest({ type: 'command', command: 'seek-forward' })).toBe(true);
        expect(isContentRequest({ type: 'command', command: 'toggle-mute' })).toBe(true);
        expect(isContentRequest({ type: 'command', command: 'delete-everything' })).toBe(false);
        expect(isContentRequest(null)).toBe(false);
    });
});

describe('wheelPixels', () => {
    it('normalises line and page based wheels (Windows) to pixels (macOS)', () => {
        expect(wheelPixels({ deltaY: 120, deltaMode: 0 })).toBe(120);
        expect(wheelPixels({ deltaY: 3, deltaMode: 1 })).toBe(120);
        expect(wheelPixels({ deltaY: -1, deltaMode: 2 })).toBe(-800);
    });
});
