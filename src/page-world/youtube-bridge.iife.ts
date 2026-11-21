/**
 * Runs in YouTube's own JavaScript world (manifest `world: "MAIN"`).
 *
 * In a background tab YouTube ignores its Next button, the arrow keys and its own scroll, because moving to
 * the next Short waits for a rendered frame and hidden tabs render none (verified). Its single-page navigation
 * event does not wait, so this script sends that event for the next Short in YouTube's own list.
 * That move skips YouTube's own scroll, which is what makes it load more Shorts (it keeps about nine in its list),
 * so this script also loads the next batch itself when few are left. Without it the list ends and the same Shorts repeat.
 * The isolated content script asks for it with a DOM event, because the two worlds do not share variables.
 */
import { YOUTUBE_BRIDGE_ATTRIBUTE, YOUTUBE_BRIDGE_EVENT } from '@/shared/dom-contract';

import { countShortsAfter, findContinuationToken, findNeighbourShortId, type ShortsData } from './youtube-sequence';

// Identifier YouTube uses for the Shorts page in its navigation data (verified on youtube.com, Nov 2026).
const SHORTS_ROOT_VE = 37414;
// YouTube itself loads the next batch when about this many Shorts are left. We load it too, or the list ends.
const LOAD_MORE_WHEN_LEFT = 3;

type ShortsElement = HTMLElement & {
    __data?: ShortsData;
    processAppendReelWatchSequenceContinuationEntriesAction?: (action: unknown) => void;
};

let loadingMore = false;

/**
 * Asks YouTube for the next batch of Shorts and hands it to the page's own handler. Every step is defensive:
 * if YouTube changes any of this, nothing is added and the caller carries on with the Shorts it has.
 */
async function loadMoreShorts(shorts: ShortsElement): Promise<void> {
    const token = findContinuationToken(shorts.__data);
    const config = (window as unknown as { ytcfg?: { get?: (key: string) => unknown } }).ytcfg;
    if (!token || !config?.get || !shorts.processAppendReelWatchSequenceContinuationEntriesAction || loadingMore) return;
    loadingMore = true;
    try {
        const key = config.get('INNERTUBE_API_KEY');
        const query = typeof key === 'string' ? `?prettyPrint=false&key=${key}` : '?prettyPrint=false';
        const response = await fetch(`/youtubei/v1/reel/reel_watch_sequence${query}`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ context: config.get('INNERTUBE_CONTEXT'), continuation: token }),
        });
        const batch = (await response.json()) as { entries?: unknown; continuationEndpoint?: unknown };
        if (!response.ok || !Array.isArray(batch.entries)) return;
        shorts.processAppendReelWatchSequenceContinuationEntriesAction({
            appendReelWatchSequenceContinuationEntriesAction: {
                entries: batch.entries,
                continuationEndpoint: batch.continuationEndpoint,
            },
        });
    } catch {
        // No more Shorts this time; the next move tries again.
    } finally {
        loadingMore = false;
    }
}

async function navigate(direction: 'next' | 'previous'): Promise<void> {
    const shorts = document.querySelector<ShortsElement>('ytd-shorts');
    if (!shorts) return;
    const currentVideoId = location.pathname.match(/^\/shorts\/([\w-]+)/)?.[1];
    let videoId = findNeighbourShortId(shorts.__data, direction, currentVideoId);

    if (direction === 'next') {
        const left = countShortsAfter(shorts.__data, currentVideoId);
        if (left !== null && left <= LOAD_MORE_WHEN_LEFT) {
            // At the very end wait for the batch; otherwise load it while the next Short plays.
            if (videoId) void loadMoreShorts(shorts);
            else {
                await loadMoreShorts(shorts);
                videoId = findNeighbourShortId(shorts.__data, direction, currentVideoId);
            }
        }
    }
    if (!videoId) return;

    document.querySelector('ytd-app')?.dispatchEvent(
        new CustomEvent('yt-navigate', {
            bubbles: true,
            composed: true,
            detail: {
                endpoint: {
                    commandMetadata: {
                        webCommandMetadata: {
                            url: `/shorts/${videoId}`,
                            webPageType: 'WEB_PAGE_TYPE_SHORTS',
                            rootVe: SHORTS_ROOT_VE,
                        },
                    },
                    reelWatchEndpoint: { videoId },
                },
            },
        }),
    );
}

document.addEventListener(YOUTUBE_BRIDGE_EVENT, event => {
    const direction = (event as CustomEvent<unknown>).detail;
    if (direction === 'next' || direction === 'previous') void navigate(direction);
});

document.documentElement.setAttribute(YOUTUBE_BRIDGE_ATTRIBUTE, 'on');
