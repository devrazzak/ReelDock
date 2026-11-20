/**
 * Everything this extension assumes about Facebook's Reels markup lives in this file.
 * Verified on facebook.com/reel/<id> (Nov 2026):
 * - Each Reel card has a `data-video-id` attribute equal to the Reel id in the URL.
 * - The card's <video> element is a descendant of that element.
 * - Navigation buttons are `role="button"` elements labelled "Next Card" / "Previous Card".
 * - Each card has a `role="button"` labelled "Unmute" / "Mute". Facebook keeps the mute choice in its
 *   own state and applies it to every new Reel; muting only the <video> element does not change it.
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

const MUTE_LABELS = ['mute', 'unmute'];

/** Facebook's own Mute / Unmute button for a Reel; using it keeps the choice for the next Reels too. */
export function findMuteButton(doc: Document, reelId: string): HTMLElement | null {
    const card = doc.querySelector(`[data-video-id="${CSS.escape(reelId)}"]`);
    for (const scope of [card, doc]) {
        for (const element of scope?.querySelectorAll<HTMLElement>('[role="button"][aria-label]') ?? []) {
            const label = element.getAttribute('aria-label')?.trim().toLowerCase() ?? '';
            if (MUTE_LABELS.includes(label)) return element;
        }
    }
    return null;
}
