/** How far one skip goes, like the sites' own players. */
export const SEEK_SECONDS = 10;

/**
 * Skips the video by `seconds` (negative goes back). Does nothing for a live stream, whose duration is infinite.
 * Stops just short of the end so `ended` still fires, which auto next relies on.
 */
export function seekBy(video: HTMLVideoElement, seconds: number): void {
    if (!Number.isFinite(video.duration)) return;
    video.currentTime = Math.min(Math.max(video.currentTime + seconds, 0), video.duration - 0.1);
}
