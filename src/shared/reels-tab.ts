import { getReelsTabPatterns } from '@/shared/sites';

/**
 * Finds the Reels tab the user is most likely using: the one in front if it is a Reels tab,
 * then the one playing sound, otherwise the most recently used one.
 */
export async function findReelsTab(): Promise<chrome.tabs.Tab | null> {
    const tabs = await chrome.tabs.query({ url: getReelsTabPatterns() });
    if (tabs.length === 0) return null;

    const focusedWindow = await chrome.windows.getLastFocused();
    const inFront = tabs.find(tab => tab.active && tab.windowId === focusedWindow.id);
    if (inFront) return inFront;

    const audible = tabs.find(tab => tab.audible);
    if (audible) return audible;

    return tabs.reduce((latest, tab) => ((tab.lastAccessed ?? 0) > (latest.lastAccessed ?? 0) ? tab : latest));
}
