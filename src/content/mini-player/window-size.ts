export interface WindowSize {
    width: number;
    height: number;
}

/** Portrait 9:16, the shape of a Reel or Short. */
export const PORTRAIT_WINDOW_SIZE: WindowSize = { width: 360, height: 640 };

/** Length of the window's longer side, whatever the video's shape. */
const LONG_SIDE = 640;

/**
 * A mini player window with the video's own aspect ratio, so a landscape video fills it without black bars.
 * Falls back to portrait while the video's size is not known yet (metadata not loaded).
 */
export function windowSizeFor(video: Pick<HTMLVideoElement, 'videoWidth' | 'videoHeight'>): WindowSize {
    const { videoWidth, videoHeight } = video;
    if (videoWidth <= 0 || videoHeight <= 0) return PORTRAIT_WINDOW_SIZE;

    const scale = LONG_SIDE / Math.max(videoWidth, videoHeight);
    return { width: Math.round(videoWidth * scale), height: Math.round(videoHeight * scale) };
}
