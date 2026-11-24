import type { Direction } from '@/shared/direction';

export type { Direction };

/**
 * Everything the player needs to know about one site's short-video page.
 * Each supported site (Facebook Reels, YouTube Shorts, ...) implements this once;
 * the session, navigator and mini player only talk to this interface.
 */
export interface PlatformAdapter {
    /** Stable id, e.g. "facebook". */
    readonly id: string;
    /** Name shown to users, e.g. "Facebook Reels". */
    readonly name: string;
    /** Hosts this adapter handles, e.g. "www.facebook.com". */
    readonly hostnames: readonly string[];
    /** True when the path is the site's short-video page. */
    isReelsPage(pathname: string): boolean;
    /** The current video's id from the URL, or null. */
    getReelId(pathname: string): string | null;
    /** The <video> of the video with this id, or null when the site has not rendered it (yet). */
    findReelVideo(doc: Document, reelId: string): HTMLVideoElement | null;
    /** The site's own Next / Previous button, or null when it is missing or disabled. */
    findNavigationButton(doc: Document, direction: Direction): HTMLElement | null;
    /**
     * Optional. Moves to another video from inside the page, for sites whose own buttons do nothing while the
     * tab is in the background. Returns false when the page-side helper is not there.
     */
    navigateFromPage?(doc: Document, direction: Direction): boolean;
    /**
     * Optional. True when navigateFromPage moves to another video but the page URL only follows once the tab is
     * visible again. The session then treats "the current video changed" as success instead of waiting for the URL.
     */
    readonly pageNavigationKeepsUrl?: boolean;
    /** The site's own Mute button, or null so the caller mutes the <video> directly. */
    findMuteButton(doc: Document, reelId: string): HTMLElement | null;
}
