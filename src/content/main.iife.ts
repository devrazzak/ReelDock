import { LaunchButton } from '@/content/mini-player/launch-button';
import { MiniPlayer } from '@/content/mini-player/mini-player';
import { facebookAdapter } from '@/content/platforms/facebook';
import { createNavigationStrategies } from '@/content/reels/reel-navigator';
import { ReelSession } from '@/content/session/reel-session';
import { BACKGROUND_ATTRIBUTE } from '@/shared/dom-contract';
import { isContentRequest, STATUS_PORT_NAME, type ContentResponse, type StatusPortMessage } from '@/shared/messages';
import { DEFAULT_SETTINGS, loadSettings, onSettingsChanged, type ExtensionSettings } from '@/shared/settings';
import type { PlaybackStatus } from '@/shared/status';

/** After the extension is reloaded or updated, scripts left in open tabs lose their chrome.* access. */
function isExtensionAlive(): boolean {
    return Boolean(chrome.runtime?.id);
}

function applyBackgroundSetting(settings: ExtensionSettings): void {
    document.documentElement.setAttribute(BACKGROUND_ATTRIBUTE, settings.backgroundPlayback ? 'on' : 'off');
}

function main(): void {
    // Facebook embeds videos in iframes in some places; Reels live in the top frame.
    if (window.top !== window) return;

    let settings: ExtensionSettings = { ...DEFAULT_SETTINGS };
    const ports = new Set<chrome.runtime.Port>();

    const session = new ReelSession({
        doc: document,
        platform: facebookAdapter,
        strategies: createNavigationStrategies(document, facebookAdapter, () => session.getCurrentVideo()),
        getSettings: () => settings,
        onStatus: (status: PlaybackStatus) => {
            // Reloading the extension orphans this script; the fresh copy arrives with the next page load.
            if (!isExtensionAlive()) {
                session.dispose();
                stopWatchingSettings();
                launchButton?.setVisible(false);
                return;
            }
            launchButton?.setVisible(status.onReelsPage);
            const message: StatusPortMessage = { type: 'status', status };
            for (const port of ports) port.postMessage(message);
        },
    });

    const launchButton = MiniPlayer.isSupported(window) ? createMiniPlayer(session) : null;

    loadSettings()
        .then(loaded => {
            settings = loaded;
            applyBackgroundSetting(settings);
            session.refresh();
        })
        .catch(() => {
            // Storage failed: keep the defaults so the page still works.
            applyBackgroundSetting(settings);
        });

    const stopWatchingSettings = onSettingsChanged(next => {
        settings = next;
        applyBackgroundSetting(settings);
        session.refresh();
    });

    chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse: (r: ContentResponse) => void) => {
        if (!isContentRequest(message)) return false;

        const run = message.type === 'command' ? session.runCommand(message.command) : Promise.resolve();
        run.then(
            () => sendResponse({ ok: true, status: session.getStatus() }),
            (error: unknown) =>
                sendResponse({ ok: false, error: error instanceof Error ? error.message : 'Unknown error' }),
        );
        return true; // Keeps the channel open for the async response.
    });

    chrome.runtime.onConnect.addListener(port => {
        if (port.name !== STATUS_PORT_NAME) return;
        ports.add(port);
        port.onDisconnect.addListener(() => ports.delete(port));
        const message: StatusPortMessage = { type: 'status', status: session.getStatus() };
        port.postMessage(message);
    });

    session.start();
}

/** Wires the mini player window and its launch button on the Reels page to the session. */
function createMiniPlayer(session: ReelSession): LaunchButton {
    let stopObserving: (() => void) | null = null;

    const miniPlayer = new MiniPlayer(window, {
        onNavigate: direction => session.runCommand(direction === 'next' ? 'next-reel' : 'previous-reel'),
        onTogglePlay: () => void session.runCommand('toggle-play'),
        onToggleMute: () => void session.runCommand('toggle-mute'),
        onSeek: direction => void session.runCommand(direction === 'forward' ? 'seek-forward' : 'seek-backward'),
        onOpen: pipDocument => {
            stopObserving = session.observe(pipDocument);
            button.setOpen(true);
        },
        onClose: () => {
            stopObserving?.();
            stopObserving = null;
            button.setOpen(false);
        },
    });
    session.attachStage(miniPlayer);

    const button = new LaunchButton(
        document,
        () => facebookAdapter.findNavigationButton(document, 'next'),
        () => {
            if (miniPlayer.isOpen) miniPlayer.close();
            else void miniPlayer.open(session.getCurrentVideo()).catch(() => undefined);
        },
    );
    return button;
}

main();
