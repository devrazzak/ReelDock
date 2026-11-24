import { describe, expect, it } from 'vitest';

import { PORTRAIT_WINDOW_SIZE, windowSizeFor } from '@/content/mini-player/window-size';

describe('windowSizeFor', () => {
    it('keeps the portrait window for a 9:16 Reel', () => {
        expect(windowSizeFor({ videoWidth: 720, videoHeight: 1280 })).toEqual(PORTRAIT_WINDOW_SIZE);
    });

    it('opens a landscape window for a 16:9 video', () => {
        expect(windowSizeFor({ videoWidth: 1920, videoHeight: 1080 })).toEqual({ width: 640, height: 360 });
    });

    it('opens a square window for a square video', () => {
        expect(windowSizeFor({ videoWidth: 500, videoHeight: 500 })).toEqual({ width: 640, height: 640 });
    });

    it('falls back to portrait while the video size is unknown', () => {
        expect(windowSizeFor({ videoWidth: 0, videoHeight: 0 })).toEqual(PORTRAIT_WINDOW_SIZE);
    });
});
