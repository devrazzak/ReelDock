/** How close to the end the previous position must be for a jump back to count as a loop. */
const LOOP_END_WINDOW_SECONDS = 1.5;

/**
 * Looping videos never fire `ended`; the player jumps from the end back to the start instead.
 * Returns true when a `timeupdate` moves from near the end to near the start.
 */
export function isLoopRestart(previousTime: number, currentTime: number, duration: number): boolean {
    if (!Number.isFinite(duration) || duration <= LOOP_END_WINDOW_SECONDS * 2) return false;
    const wasNearEnd = previousTime >= duration - LOOP_END_WINDOW_SECONDS;
    const isNearStart = currentTime < LOOP_END_WINDOW_SECONDS;
    return wasNearEnd && isNearStart;
}
