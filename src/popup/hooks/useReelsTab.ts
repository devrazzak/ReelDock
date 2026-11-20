import { useCallback, useEffect, useState } from 'react';

import {
    STATUS_PORT_NAME,
    type ContentRequest,
    type ContentResponse,
    type PlayerCommand,
    type StatusPortMessage,
} from '@/shared/messages';
import { findReelsTab } from '@/shared/reels-tab';
import type { PlaybackStatus } from '@/shared/status';

export type ReelsTabState =
    | { kind: 'loading' }
    | { kind: 'no-tab' }
    /** The tab exists but has no content script, e.g. it was open before the extension was installed. */
    | { kind: 'disconnected'; tabId: number }
    | { kind: 'connected'; tabId: number; status: PlaybackStatus };

/** Finds the Facebook Reels tab and streams its playback status over a port while the popup is open. */
export function useReelsTab() {
    const [state, setState] = useState<ReelsTabState>({ kind: 'loading' });
    const [commandError, setCommandError] = useState<string | null>(null);

    useEffect(() => {
        let port: chrome.runtime.Port | null = null;
        let cancelled = false;

        void findReelsTab().then(tab => {
            if (cancelled) return;
            const tabId = tab?.id;
            if (tabId === undefined) return setState({ kind: 'no-tab' });

            port = chrome.tabs.connect(tabId, { name: STATUS_PORT_NAME });
            port.onMessage.addListener((message: StatusPortMessage) => {
                if (message.type === 'status') setState({ kind: 'connected', tabId, status: message.status });
            });
            port.onDisconnect.addListener(() => {
                // Reading lastError marks it as handled. It is set when the tab has no content script
                // (opened before the extension was installed/reloaded); the UI shows that state instead.
                void chrome.runtime.lastError;
                if (!cancelled) setState({ kind: 'disconnected', tabId });
            });
        });

        return () => {
            cancelled = true;
            port?.disconnect();
        };
    }, []);

    const sendCommand = useCallback(
        async (command: PlayerCommand) => {
            if (state.kind !== 'connected') return;
            setCommandError(null);
            const request: ContentRequest = { type: 'command', command };
            try {
                const response = (await chrome.tabs.sendMessage(state.tabId, request)) as ContentResponse;
                if (!response.ok) setCommandError(response.error);
            } catch {
                setCommandError('The Facebook tab did not respond. Reload it and try again.');
            }
        },
        [state],
    );

    return { state, commandError, sendCommand };
}
