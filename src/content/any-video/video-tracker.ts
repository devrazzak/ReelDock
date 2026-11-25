import { pickActiveVideo } from '@/content/video/active-video';
import { FEED_PAGE_ATTRIBUTE } from '@/shared/dom-contract';

// Smaller videos are previews, thumbnails or ads, not something to watch in a mini player.
const MIN_WIDTH = 200;
const MIN_HEIGHT = 120;
// Hover previews play inside a link (thumbnails) or in a preview container (YouTube's home page).
const PREVIEW_CONTAINER = 'a[href], ytd-video-preview';

// Media events do not bubble, but capture listeners on the document see them for every <video>.
const TRACKED_EVENTS = ['scroll', 'loadedmetadata', 'play', 'emptied'] as const;

function isMainVideoCandidate(video: HTMLVideoElement): boolean {
    const { width, height } = video.getBoundingClientRect();
    return width >= MIN_WIDTH && height >= MIN_HEIGHT && video.closest(PREVIEW_CONTAINER) === null;
}

/** The video the user is most likely watching: a playing one first, otherwise the largest on screen. */
export function findMainVideo(doc: Document): HTMLVideoElement | null {
    const view = doc.defaultView;
    if (!view) return null;
    const candidates = Array.from(doc.querySelectorAll('video')).filter(isMainVideoCandidate);
    return pickActiveVideo(candidates, view);
}

/**
 * Reports the page's main video (or null) whenever the page may have changed: elements added or removed,
 * a video loading or starting, scrolling or resizing. Checks are batched to one per animation frame,
 * so a page that changes its DOM all the time costs at most one lookup per frame.
 */
export class VideoTracker {
    private readonly observer: MutationObserver;
    private frame: number | null = null;

    constructor(
        private readonly doc: Document,
        private readonly onChange: (video: HTMLVideoElement | null) => void,
    ) {
        this.observer = new MutationObserver(this.schedule);
    }

    start(): void {
        this.observer.observe(this.doc.documentElement, {
            childList: true,
            subtree: true,
            // The Reels feature marks feed pages; entering or leaving one must update the button too.
            attributeFilter: [FEED_PAGE_ATTRIBUTE],
        });
        for (const type of TRACKED_EVENTS) {
            this.doc.addEventListener(type, this.schedule, { capture: true, passive: true });
        }
        this.doc.defaultView?.addEventListener('resize', this.schedule);
        this.schedule();
    }

    private readonly schedule = (): void => {
        const view = this.doc.defaultView;
        if (!view || this.frame !== null) return;
        this.frame = view.requestAnimationFrame(() => {
            this.frame = null;
            this.onChange(findMainVideo(this.doc));
        });
    };
}
