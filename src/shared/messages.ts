import type { PlaybackStatus } from './status';

export const PLAYER_COMMANDS = [
    'toggle-play',
    'toggle-mute',
    'next-reel',
    'previous-reel',
    'seek-forward',
    'seek-backward',
] as const;

export type PlayerCommand = (typeof PLAYER_COMMANDS)[number];

export function isPlayerCommand(value: unknown): value is PlayerCommand {
    return PLAYER_COMMANDS.includes(value as PlayerCommand);
}

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
    return message.type === 'command' && isPlayerCommand(message.command);
}
