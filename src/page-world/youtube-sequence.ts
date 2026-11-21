/**
 * Reads the list of Shorts YouTube has already loaded for the current feed.
 * This is YouTube's internal data (verified on youtube.com, Nov 2026), so every access is defensive:
 * when its shape changes we return null and the caller falls back to the Next button.
 */
export interface ShortsData {
    currentPlayerIndex?: unknown;
    shortsProcessedSequence?: unknown;
}

const VIDEO_ID = /^[\w-]+$/;

export function findNeighbourShortId(data: ShortsData | undefined, direction: 'next' | 'previous'): string | null {
    const index = data?.currentPlayerIndex;
    const sequence = data?.shortsProcessedSequence;
    if (typeof index !== 'number' || !Array.isArray(sequence)) return null;

    const entry: unknown = sequence[index + (direction === 'next' ? 1 : -1)];
    const videoId = (entry as { command?: { reelWatchEndpoint?: { videoId?: unknown } } } | undefined)?.command
        ?.reelWatchEndpoint?.videoId;
    return typeof videoId === 'string' && VIDEO_ID.test(videoId) ? videoId : null;
}
