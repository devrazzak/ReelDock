/**
 * The one list of sites ReelDock works on. The manifest, the background worker and the content script
 * all read from here, so adding a site means adding one entry below.
 * Keep this file free of DOM and chrome.* code: the manifest config runs it in Node.
 */
export interface SupportedSite {
    /** Same id as the site's PlatformAdapter. */
    id: string;
    hostnames: readonly string[];
    /** Match-pattern path of the short-video page, e.g. "/reel/*". */
    reelsPath: string;
}

export const FACEBOOK_SITE: SupportedSite = {
    id: 'facebook',
    hostnames: ['www.facebook.com', 'web.facebook.com'],
    reelsPath: '/reel/*',
};

export const YOUTUBE_SITE: SupportedSite = {
    id: 'youtube',
    hostnames: ['www.youtube.com'],
    reelsPath: '/shorts/*',
};

// YOUTUBE_SITE is not listed yet: listing it adds youtube.com to the manifest's host permissions.
export const SUPPORTED_SITES: readonly SupportedSite[] = [FACEBOOK_SITE];

/** Every page of every supported site. Used for the manifest's host permissions and content scripts. */
export function getSiteMatchPatterns(sites: readonly SupportedSite[] = SUPPORTED_SITES): string[] {
    return sites.flatMap(site => site.hostnames.map(hostname => `https://${hostname}/*`));
}

/** Only the short-video pages. Used to find the tab the user is watching. */
export function getReelsTabPatterns(sites: readonly SupportedSite[] = SUPPORTED_SITES): string[] {
    return sites.flatMap(site => site.hostnames.map(hostname => `https://${hostname}${site.reelsPath}`));
}
