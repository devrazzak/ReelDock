/**
 * Runs in YouTube's own JavaScript world (manifest `world: "MAIN"`).
 *
 * In a background tab YouTube ignores its Next button, the arrow keys and its own scroll, because moving to
 * the next Short waits for a rendered frame and hidden tabs render none (verified). Its single-page navigation
 * event does not wait, so this script sends that event for the next Short in YouTube's own list.
 * The isolated content script asks for it with a DOM event, because the two worlds do not share variables.
 */
import { YOUTUBE_BRIDGE_ATTRIBUTE, YOUTUBE_BRIDGE_EVENT } from '@/shared/dom-contract';

import { findNeighbourShortId, type ShortsData } from './youtube-sequence';

// Identifier YouTube uses for the Shorts page in its navigation data (verified on youtube.com, Nov 2026).
const SHORTS_ROOT_VE = 37414;

function navigate(direction: 'next' | 'previous'): void {
    const shorts = document.querySelector<HTMLElement & { __data?: ShortsData }>('ytd-shorts');
    const videoId = findNeighbourShortId(shorts?.__data, direction);
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
    if (direction === 'next' || direction === 'previous') navigate(direction);
});

document.documentElement.setAttribute(YOUTUBE_BRIDGE_ATTRIBUTE, 'on');
