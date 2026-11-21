/**
 * The one list of sites ReelDock works on. The manifest, the background worker and the content script
 * all read from here, so adding a site means adding one entry below.
 * Keep this file free of DOM and chrome.* code: the manifest config runs it in Node.
 */
export interface SupportedSite {
    /** Same id as the site's PlatformAdapter. */
    id: string;
    /** Shown in the popup. */
    name: string;
    /** Where the popup's "open" button goes. */
    startUrl: string;
    /** The site's main colour as 6-digit hex; the popup tints its button with it. */
    color: string;
    hostnames: readonly string[];
    /** Match-pattern path of the short-video page, e.g. "/reel/*". */
    reelsPath: string;
}

export const FACEBOOK_SITE: SupportedSite = {
    id: 'facebook',
    name: 'Facebook Reels',
    startUrl: 'https://www.facebook.com/reel/',
    color: '#0866FF',
    hostnames: ['www.facebook.com', 'web.facebook.com'],
    reelsPath: '/reel/*',
};

export const YOUTUBE_SITE: SupportedSite = {
    id: 'youtube',
    name: 'YouTube Shorts',
    startUrl: 'https://www.youtube.com/shorts',
    color: '#FF0000',
    hostnames: ['www.youtube.com'],
    reelsPath: '/shorts/*',
};

export const INSTAGRAM_SITE: SupportedSite = {
    id: 'instagram',
    name: 'Instagram Reels',
    startUrl: 'https://www.instagram.com/reels/',
    color: '#E1306C',
    hostnames: ['www.instagram.com'],
    reelsPath: '/reels/*',
};

export const SUPPORTED_SITES: readonly SupportedSite[] = [FACEBOOK_SITE, YOUTUBE_SITE];

/** The supported site a page URL belongs to, or null. */
export function findSiteByUrl(
    url: string | undefined,
    sites: readonly SupportedSite[] = SUPPORTED_SITES,
): SupportedSite | null {
    if (!url) return null;
    const { hostname } = new URL(url);
    return sites.find(site => site.hostnames.includes(hostname)) ?? null;
}

/** Every page of every supported site. Used for the manifest's host permissions and content scripts. */
export function getSiteMatchPatterns(sites: readonly SupportedSite[] = SUPPORTED_SITES): string[] {
    return sites.flatMap(site => site.hostnames.map(hostname => `https://${hostname}/*`));
}

/** Only the short-video pages. Used to find the tab the user is watching. */
export function getReelsTabPatterns(sites: readonly SupportedSite[] = SUPPORTED_SITES): string[] {
    return sites.flatMap(site => site.hostnames.map(hostname => `https://${hostname}${site.reelsPath}`));
}
