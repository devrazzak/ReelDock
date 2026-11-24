/**
 * Event-driven only: Chrome may stop this worker at any time, so it keeps no state in memory.
 * Playback logic lives in the content scripts; this worker routes keyboard shortcuts and keeps the
 * any-video script registered on the sites the user allowed.
 */
// Resolves to the built file of the any-video script (bundled as IIFE because of the .iife name).
import anyVideoScript from '@/content/any-video/main.iife.ts?script';
import { isPlayerCommand, type ContentRequest, type PlayerCommand } from '@/shared/messages';
import { findReelsTab } from '@/shared/reels-tab';
import { loadSettings, updateSettings } from '@/shared/settings';

import { injectIntoOpenTabs, syncAnyVideoScript } from './site-access';

async function sendToReelsTab(command: PlayerCommand): Promise<void> {
    const tab = await findReelsTab();
    if (tab?.id === undefined) return;
    const request: ContentRequest = { type: 'command', command };
    try {
        await chrome.tabs.sendMessage(tab.id, request);
    } catch {
        // The tab was opened before the extension was installed or reloaded; it has no content script yet.
        await flashBadge('!');
    }
}

async function flashBadge(text: string): Promise<void> {
    await chrome.action.setBadgeText({ text });
    setTimeout(() => void chrome.action.setBadgeText({ text: '' }), 2000);
}

chrome.commands.onCommand.addListener(command => {
    if (isPlayerCommand(command)) {
        void sendToReelsTab(command);
        return;
    }

    void (async () => {
        const settings = await loadSettings();
        if (command === 'toggle-auto-next') {
            const next = await updateSettings({ autoNext: !settings.autoNext });
            await flashBadge(next.autoNext ? 'ON' : 'OFF');
        } else if (command === 'toggle-background-playback') {
            const next = await updateSettings({ backgroundPlayback: !settings.backgroundPlayback });
            await flashBadge(next.backgroundPlayback ? 'ON' : 'OFF');
        }
    })();
});

// Listeners are registered at the top level so Chrome can wake the worker for them.
const syncSites = () => void syncAnyVideoScript(anyVideoScript);
chrome.runtime.onInstalled.addListener(syncSites);
chrome.runtime.onStartup.addListener(syncSites);
chrome.permissions.onRemoved.addListener(syncSites);
chrome.permissions.onAdded.addListener(({ origins = [] }) => {
    syncSites();
    void injectIntoOpenTabs(origins, anyVideoScript);
});
