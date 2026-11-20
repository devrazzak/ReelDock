import type { PlaybackStatus } from './status';

export type PlayerCommand = 'toggle-play' | 'next-reel' | 'previous-reel';

/** Messages sent to the content script with chrome.tabs.sendMessage. */
export type ContentRequest = { type: 'get-status' } | { type: 'command'; command: PlayerCommand };

export type ContentResponse = { ok: true; status: PlaybackStatus } | { ok: false; error: string };

/** Name of the long-lived port the popup opens to receive live status updates. */
export const STATUS_PORT_NAME = 'playback-status';

export type StatusPortMessage = { type: 'status'; status: PlaybackStatus };

export function isContentRequest(value: unknown): value is ContentRequest {
    if (typeof value !== 'object' || value === null) return false;
    const message = value as { type?: unknown; command?: unknown };
    if (message.type === 'get-status') return true;
    return (
        message.type === 'command' &&
        (message.command === 'toggle-play' || message.command === 'next-reel' || message.command === 'previous-reel')
    );
}
