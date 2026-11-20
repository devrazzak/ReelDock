/**
 * Event-driven only: Chrome may stop this worker at any time, so it keeps no state in memory.
 * Playback logic lives in the content script; this worker only routes keyboard shortcuts.
 */
import type { ContentRequest, PlayerCommand } from '@/shared/messages';
import { findReelsTab } from '@/shared/reels-tab';
import { loadSettings, updateSettings } from '@/shared/settings';

const PLAYER_COMMANDS: readonly string[] = ['toggle-play', 'next-reel', 'previous-reel'] satisfies PlayerCommand[];

function isPlayerCommand(command: string): command is PlayerCommand {
    return PLAYER_COMMANDS.includes(command);
}

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
