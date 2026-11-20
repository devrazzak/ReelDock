export const REELS_URL_PATTERNS = ['https://www.facebook.com/reel/*', 'https://web.facebook.com/reel/*'];

/**
 * Finds the Facebook Reels tab the user is most likely using:
 * the one playing sound first, otherwise the most recently used one.
 */
export async function findReelsTab(): Promise<chrome.tabs.Tab | null> {
    const tabs = await chrome.tabs.query({ url: REELS_URL_PATTERNS });
    if (tabs.length === 0) return null;

    const audible = tabs.find(tab => tab.audible);
    if (audible) return audible;

    return tabs.reduce((latest, tab) => ((tab.lastAccessed ?? 0) > (latest.lastAccessed ?? 0) ? tab : latest));
}
