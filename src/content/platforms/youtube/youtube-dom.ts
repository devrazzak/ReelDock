import type { Direction } from '@/content/platforms/platform-adapter';
import { pickActiveVideo } from '@/content/video/active-video';

/**
 * Everything this extension assumes about YouTube Shorts markup lives in this file.
 * Verified on youtube.com/shorts/<id> (Nov 2026):
 * - There is no per-Short element or id attribute. YouTube reuses its players and only changes their source.
 * - Inside <ytd-shorts> there are two `video.html5-main-video`: the playing one and an idle one without a source.
 * - The Previous / Next buttons are `button`s labelled "Previous video" / "Next video". They have no size
 *   (display hidden on this layout) but clicking them still moves to the other Short.
 * - The mute button is labelled "Mute (m)" / "Unmute (m)"; YouTube keeps that choice for the next Shorts.
 * - A short Short loops (`loop` attribute) and never fires `ended`.
 */
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
    const loaded = [...doc.querySelectorAll<HTMLVideoElement>('ytd-shorts video.html5-main-video')].filter(video =>
        Boolean(video.getAttribute('src')),
    );
    return pickActiveVideo(loaded, view);
}

/** YouTube's own Next / Previous button. Matched by accessible name, case-insensitively. */
export function findNavigationButton(doc: Document, direction: Direction): HTMLElement | null {
    for (const button of doc.querySelectorAll<HTMLButtonElement>('button[aria-label]')) {
        const label = button.getAttribute('aria-label')?.trim().toLowerCase();
        if (label === NAVIGATION_LABELS[direction] && !button.disabled) return button;
    }
    return null;
}

/** YouTube's own Mute / Unmute button. The label ends with the key hint, e.g. "Mute (m)". */
export function findMuteButton(doc: Document): HTMLElement | null {
    for (const button of doc.querySelectorAll<HTMLElement>('button[aria-label]')) {
        const label = button
            .getAttribute('aria-label')
            ?.replace(/\s*\(.*\)$/, '')
            .trim()
            .toLowerCase();
        if (label === 'mute' || label === 'unmute') return button;
    }
    return null;
}
