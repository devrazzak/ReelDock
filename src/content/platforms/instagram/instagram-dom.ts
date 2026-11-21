import type { Direction } from '@/content/platforms/platform-adapter';
import { pickActiveVideo } from '@/content/video/active-video';

/**
 * Everything this extension assumes about Instagram Reels markup lives in this file.
 * Verified on instagram.com/reels/<id>/ (Nov 2026):
 * - The feed holds one <video> per Reel, stacked vertically, none of them with the `loop` attribute.
 *   At the end the video fires `ended`, then Instagram replays it from 0; it does not move on by itself.
 * - A Reel's card carries no id, so a video cannot be found by the id in the URL. The Reel on screen is the
 *   loaded video that plays or covers most of the viewport.
 * - The Previous / Next buttons are `role="button"` elements labelled "Navigate to previous Reel" /
 *   "Navigate to next Reel". Clicking Next changes the URL and starts the next Reel.
 * - Each card has a mute button: a `role="button"` around an icon labelled "Audio is muted" / "Audio is ...".
 */
const NAVIGATION_LABELS: Readonly<Record<Direction, string>> = {
    next: 'navigate to next reel',
    previous: 'navigate to previous reel',
};

// The attribute, not video.src: for an empty attribute the property can return the page's own URL.
const loadedVideos = (doc: Document): HTMLVideoElement[] =>
    [...doc.querySelectorAll<HTMLVideoElement>('video')].filter(video => video.getAttribute('src'));

/**
 * The video of the Reel on screen: the one that covers most of the viewport. Playing does not count, because
 * Instagram replays a finished video and keeps the old one playing until it has paused it, so the old video can
 * be "playing" while the next one is already on screen.
 */
export function findReelVideo(doc: Document): HTMLVideoElement | null {
    const view = doc.defaultView;
    return view ? pickActiveVideo(loadedVideos(doc), view, false) : null;
}

/**
 * Moves to the next / previous Reel that Instagram has already loaded, for a tab in the background. There its
 * own buttons do nothing: the scroll animation and the viewport tracking behind them need a rendered page.
 * Returns false when no neighbour is loaded. The URL follows once the tab is visible again.
 */
export function moveToNeighbour(doc: Document, direction: Direction): boolean {
    const current = findReelVideo(doc);
    if (!current) return false;
    const videos = loadedVideos(doc);
    const neighbour = videos[videos.indexOf(current) + (direction === 'next' ? 1 : -1)];
    if (!neighbour) return false;
    current.pause();
    neighbour.scrollIntoView({ block: 'center', behavior: 'instant' });
    return true;
}

/** Instagram's own Next / Previous button. Matched by accessible name, case-insensitively. */
export function findNavigationButton(doc: Document, direction: Direction): HTMLElement | null {
    for (const element of doc.querySelectorAll<HTMLElement>('[role="button"][aria-label]')) {
        const label = element.getAttribute('aria-label')?.trim().toLowerCase();
        if (label === NAVIGATION_LABELS[direction] && element.getAttribute('aria-disabled') !== 'true') return element;
    }
    return null;
}

/** The mute button inside the card of the Reel on screen. Using it keeps the choice for the next Reels. */
export function findMuteButton(doc: Document): HTMLElement | null {
    for (let card = findReelVideo(doc)?.parentElement ?? null; card; card = card.parentElement) {
        const icon = card.querySelector('svg[aria-label^="Audio is"]');
        if (icon) return icon.closest<HTMLElement>('[role="button"]');
    }
    return null;
}
