import type { Direction } from '@/content/platforms/platform-adapter';
import { pickActiveVideo } from '@/content/video/active-video';

/**
 * Everything this extension assumes about YouTube Shorts markup lives in this file.
 * Verified on youtube.com/shorts/<id> (Nov 2026):
 * - There is no per-Short element or id attribute. YouTube reuses its players and only changes their source.
 * - The page has a second `video.html5-main-video`, idle and without a source. On a wide window it sits in the
 *   watch-page player, outside <ytd-shorts>, and that player has its own hidden "Unmute (m)" button.
 *   So every lookup below stays inside <ytd-shorts>.
 * - The Previous / Next buttons are `button`s labelled "Previous video" / "Next video". On a narrow window they
 *   have no size (hidden) but clicking them still moves to the other Short; on a wide one they are visible.
 * - The mute button is labelled "Mute (m)" / "Unmute (m)"; YouTube keeps that choice for the next Shorts.
 * - A short Short loops (`loop` attribute) and never fires `ended`.
 */
const SHORTS_PLAYER = 'ytd-shorts';
const NAVIGATION_LABELS: Readonly<Record<Direction, string>> = {
    next: 'next video',
    previous: 'previous video',
};

/**
 * The video of the Short on screen. Shorts cannot be told apart by id, so this picks the loaded
 * video that is playing, or else the most visible one. Call it after the URL has changed.
 */
export function findShortVideo(doc: Document): HTMLVideoElement | null {
    const view = doc.defaultView;
    if (!view) return null;
    // The attribute, not video.src: for an empty attribute the property can return the page's own URL.
    const loaded = [...doc.querySelectorAll<HTMLVideoElement>(`${SHORTS_PLAYER} video.html5-main-video`)].filter(
        video => Boolean(video.getAttribute('src')),
    );
    return pickActiveVideo(loaded, view);
}

/** YouTube's own Next / Previous button. Matched by accessible name, case-insensitively. */
export function findNavigationButton(doc: Document, direction: Direction): HTMLElement | null {
    for (const button of doc.querySelectorAll<HTMLButtonElement>(`${SHORTS_PLAYER} button[aria-label]`)) {
        const label = button.getAttribute('aria-label')?.trim().toLowerCase();
        if (label === NAVIGATION_LABELS[direction] && !button.disabled) return button;
    }
    return null;
}

/** YouTube's own Mute / Unmute button. The label ends with the key hint, e.g. "Mute (m)". */
export function findMuteButton(doc: Document): HTMLElement | null {
    for (const button of doc.querySelectorAll<HTMLElement>(`${SHORTS_PLAYER} button[aria-label]`)) {
        const label = button
            .getAttribute('aria-label')
            ?.replace(/\s*\(.*\)$/, '')
            .trim()
            .toLowerCase();
        if (label === 'mute' || label === 'unmute') return button;
    }
    return null;
}
