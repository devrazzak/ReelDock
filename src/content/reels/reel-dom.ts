/**
 * Everything this extension assumes about Facebook's Reels markup lives in this file.
 * Verified on facebook.com/reel/<id> (Nov 2026):
 * - Each Reel card has a `data-video-id` attribute equal to the Reel id in the URL.
 * - The card's <video> element is a descendant of that element.
 * - Navigation buttons are `role="button"` elements labelled "Next Card" / "Previous Card".
 */
export type Direction = 'next' | 'previous';

const NAVIGATION_LABELS: Readonly<Record<Direction, readonly string[]>> = {
    next: ['next card', 'next reel'],
    previous: ['previous card', 'previous reel'],
};

/** The <video> of the Reel with this id, or null when Facebook has not rendered it (yet). */
export function findReelVideo(doc: Document, reelId: string): HTMLVideoElement | null {
    return doc.querySelector<HTMLVideoElement>(`[data-video-id="${CSS.escape(reelId)}"] video`);
}

/** Facebook's own Next / Previous button. Matched by accessible name, case-insensitively. */
export function findNavigationButton(doc: Document, direction: Direction): HTMLElement | null {
    const labels = NAVIGATION_LABELS[direction];
    for (const element of doc.querySelectorAll<HTMLElement>('[role="button"][aria-label], button[aria-label]')) {
        const label = element.getAttribute('aria-label')?.trim().toLowerCase() ?? '';
        if (labels.includes(label) && element.getAttribute('aria-disabled') !== 'true') return element;
    }
    return null;
}
