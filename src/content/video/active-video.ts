function visibleArea(element: Element, view: Window): number {
    const rect = element.getBoundingClientRect();
    const width = Math.min(rect.right, view.innerWidth) - Math.max(rect.left, 0);
    const height = Math.min(rect.bottom, view.innerHeight) - Math.max(rect.top, 0);
    return width > 0 && height > 0 ? width * height : 0;
}

function isPlaying(video: HTMLVideoElement): boolean {
    return !video.paused && !video.ended;
}

/**
 * Picks the video the user is watching: a playing video first, otherwise the one
 * that covers the most of the viewport. Layout is still available in hidden tabs,
 * so this works in the background too.
 */
export function findActiveVideo(doc: Document): HTMLVideoElement | null {
    const view = doc.defaultView;
    return view ? pickActiveVideo(doc.querySelectorAll('video'), view) : null;
}

/**
 * The same choice among videos the caller has already narrowed down. With `preferPlaying` off only the area counts,
 * for a site that replays a finished video right after `ended` (so the old video plays again on its way out).
 */
export function pickActiveVideo(
    videos: Iterable<HTMLVideoElement>,
    view: Window,
    preferPlaying = true,
): HTMLVideoElement | null {
    let best: HTMLVideoElement | null = null;
    let bestScore = 0;

    for (const video of videos) {
        const area = visibleArea(video, view);
        // A playing video always beats a paused one; area breaks ties.
        const score = (preferPlaying && isPlaying(video) ? 1e9 : 0) + area;
        if (score > bestScore) {
            best = video;
            bestScore = score;
        }
    }
    return best;
}
