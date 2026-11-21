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

function readVideoId(entry: unknown): string | null {
    const videoId = (entry as { command?: { reelWatchEndpoint?: { videoId?: unknown } } } | undefined)?.command
        ?.reelWatchEndpoint?.videoId;
    return typeof videoId === 'string' && VIDEO_ID.test(videoId) ? videoId : null;
}

/**
 * The position is found from the Short the page is showing (its id in the URL). In a hidden tab YouTube may not
 * update `currentPlayerIndex` after a move, so the index alone can point at the Short we are already on.
 */
export function findNeighbourShortId(
    data: ShortsData | undefined,
    direction: 'next' | 'previous',
    currentVideoId?: string,
): string | null {
    const sequence = data?.shortsProcessedSequence;
    if (!Array.isArray(sequence)) return null;

    const byUrl = currentVideoId ? sequence.findIndex(entry => readVideoId(entry) === currentVideoId) : -1;
    const index = byUrl !== -1 ? byUrl : data?.currentPlayerIndex;
    if (typeof index !== 'number') return null;

    return readVideoId(sequence[index + (direction === 'next' ? 1 : -1)]);
}
