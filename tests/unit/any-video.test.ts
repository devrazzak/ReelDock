import { afterEach, describe, expect, it } from 'vitest';

import { createVideoControls } from '@/content/any-video/video-controls';
import { findMainVideo } from '@/content/any-video/video-tracker';
import { overVideoCorner } from '@/content/mini-player/launch-button-placement';

/** A <video> in the page with a fixed on-screen box. */
function videoAt(left: number, top: number, width: number, height: number): HTMLVideoElement {
    const video = document.createElement('video');
    video.getBoundingClientRect = () =>
        ({ left, top, width, height, right: left + width, bottom: top + height }) as DOMRect;
    document.body.append(video);
    return video;
}

function setMedia(video: HTMLVideoElement, values: { duration?: number; currentTime?: number; paused?: boolean }) {
    for (const [name, value] of Object.entries(values)) {
        Object.defineProperty(video, name, { value, configurable: true, writable: true });
    }
}

afterEach(() => document.body.replaceChildren());

describe('findMainVideo', () => {
    it('ignores videos too small to be the main video', () => {
        videoAt(0, 0, 160, 90);
        expect(findMainVideo(document)).toBeNull();
    });

    it('ignores a hover preview inside a link', () => {
        const link = document.createElement('a');
        link.href = '/watch?v=1';
        document.body.append(link);
        link.append(videoAt(0, 0, 640, 360));
        expect(findMainVideo(document)).toBeNull();
    });

    it("ignores YouTube's home page preview", () => {
        const container = document.createElement('ytd-video-preview');
        document.body.append(container);
        container.append(videoAt(0, 0, 640, 360));
        expect(findMainVideo(document)).toBeNull();
    });

    it('picks the largest video on screen', () => {
        videoAt(0, 0, 320, 180);
        const large = videoAt(0, 200, 640, 360);
        expect(findMainVideo(document)).toBe(large);
    });

    it('prefers a playing video over a larger paused one', () => {
        videoAt(0, 0, 640, 360);
        const playing = videoAt(0, 400, 320, 180);
        setMedia(playing, { paused: false });
        expect(findMainVideo(document)).toBe(playing);
    });
});

describe('createVideoControls', () => {
    it('skips 10 seconds and stays inside the video', () => {
        const video = videoAt(0, 0, 640, 360);
        setMedia(video, { duration: 60, currentTime: 55 });
        const controls = createVideoControls(() => video);

        controls.onSeek('forward');
        expect(video.currentTime).toBeCloseTo(59.9);
        video.currentTime = 4;
        controls.onSeek('backward');
        expect(video.currentTime).toBe(0);
    });

    it('does not seek in a live stream', () => {
        const video = videoAt(0, 0, 640, 360);
        setMedia(video, { duration: Number.POSITIVE_INFINITY, currentTime: 30 });
        createVideoControls(() => video).onSeek('forward');
        expect(video.currentTime).toBe(30);
    });

    it('toggles mute on the video itself', () => {
        const video = videoAt(0, 0, 640, 360);
        const controls = createVideoControls(() => video);
        controls.onToggleMute();
        expect(video.muted).toBe(true);
        controls.onToggleMute();
        expect(video.muted).toBe(false);
    });

    it('does nothing without a video', () => {
        const controls = createVideoControls(() => null);
        expect(() => {
            controls.onTogglePlay();
            controls.onToggleMute();
            controls.onSeek('forward');
        }).not.toThrow();
    });
});

describe('overVideoCorner', () => {
    it("sits inside the video's top-right corner", () => {
        const video = videoAt(100, 50, 640, 360);
        const position = overVideoCorner(() => video, window)();
        expect(position).toEqual({ right: window.innerWidth - 740 + 12, top: 62 });
    });

    it('stays at the top edge while the video is scrolled partly out of view', () => {
        const video = videoAt(100, -200, 640, 360);
        expect(overVideoCorner(() => video, window)().top).toBe(12);
    });
});
