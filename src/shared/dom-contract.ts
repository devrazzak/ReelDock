/**
 * Attribute on <html> that the isolated content script sets to "on" / "off"
 * to tell the page-world visibility guard whether background playback is enabled.
 */
export const BACKGROUND_ATTRIBUTE = 'data-reels-bg-player';

/**
 * YouTube only: its own Next button and keys do nothing while the tab is in the background, because the
 * page waits for a rendered frame. The page-world bridge moves to the next Short from inside the page instead.
 * It sets BRIDGE_ATTRIBUTE on <html> once it is running and acts on BRIDGE_EVENT, whose detail is "next" or "previous".
 */
export const YOUTUBE_BRIDGE_ATTRIBUTE = 'data-reeldock-youtube-bridge';
export const YOUTUBE_BRIDGE_EVENT = 'reeldock:youtube-navigate';
