import { Alert, AlertDescription, AlertTitle, Button, Heading, Separator, Spinner, Text } from '@rax-ds/ui';

import { SUPPORTED_SITES } from '@/shared/sites';
import type { PlaybackStatus } from '@/shared/status';

import { NowPlaying } from './components/NowPlaying';
import { SettingRow } from './components/SettingRow';
import { useReelsTab, type ReelsTabState } from './hooks/useReelsTab';
import { useSettings } from './hooks/useSettings';

const VERSION = chrome.runtime.getManifest().version;

function subtitleFor(state: ReelsTabState): string {
    switch (state.kind) {
        case 'loading':
            return 'Looking for a Reel or Short…';
        case 'no-tab':
            return 'No Reel or Short is open';
        case 'disconnected':
            return 'Tab needs a reload';
        case 'connected':
            return state.siteName ? `Connected · ${state.siteName}` : 'Connected';
    }
}

function TabMessage({ state }: { state: ReelsTabState }) {
    if (state.kind === 'loading') {
        return (
            <div className="flex justify-center py-6">
                <Spinner size="md" aria-label="Looking for a Reel or Short tab" />
            </div>
        );
    }

    if (state.kind === 'no-tab') {
        return (
            <Alert variant="info-subtle">
                <AlertTitle>Open a Reel or Short to start</AlertTitle>
                <AlertDescription>
                    <p>Click the video once (and Unmute), then switch to any tab.</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                        {SUPPORTED_SITES.map(site => (
                            <Button
                                key={site.id}
                                size="sm"
                                onClick={() => void chrome.tabs.create({ url: site.startUrl })}
                            >
                                {site.name}
                            </Button>
                        ))}
                    </div>
                </AlertDescription>
            </Alert>
        );
    }

    if (state.kind === 'disconnected') {
        return (
            <Alert variant="warning-subtle">
                <AlertTitle>Reload the tab</AlertTitle>
                <AlertDescription>
                    <p>It was open before the extension started, so it cannot be controlled yet.</p>
                    <Button size="sm" className="mt-2" onClick={() => void chrome.tabs.reload(state.tabId)}>
                        Reload tab
                    </Button>
                </AlertDescription>
            </Alert>
        );
    }

    return null;
}

/** One short hint at a time, only when it helps right now. */
function hintFor(status: PlaybackStatus): string | null {
    if (status.muted && status.videoState === 'playing') return 'Sound is off. Click Unmute on the video once.';
    if (!status.miniPlayerOpen) return 'Tip: click ⧉ under the arrows on the video for a floating player.';
    return null;
}

export function App() {
    const { state: settingsState, update } = useSettings();
    const { state: tabState, commandError, sendCommand } = useReelsTab();

    const settings = settingsState.status === 'ready' ? settingsState.settings : null;
    const status = tabState.kind === 'connected' ? tabState.status : null;
    const warning = commandError ?? status?.warning ?? null;
    const hint = status ? hintFor(status) : null;

    return (
        <main className="flex flex-col gap-4 p-4">
            <header className="flex items-center gap-3">
                <img src={chrome.runtime.getURL('icons/icon-48.png')} alt="" className="size-9 rounded-lg" />
                <div className="min-w-0">
                    <Heading as="h1" size="sm">
                        ReelDock
                    </Heading>
                    <Text size="xs" color="muted">
                        {subtitleFor(tabState)}
                    </Text>
                </div>
            </header>

            {settingsState.status === 'error' && (
                <Alert variant="destructive-subtle">
                    <AlertDescription>{settingsState.message}</AlertDescription>
                </Alert>
            )}

            <TabMessage state={tabState} />

            {status && <NowPlaying status={status} onCommand={command => void sendCommand(command)} />}

            {warning ? (
                <Alert variant="warning-subtle" role="alert">
                    <AlertDescription>{warning}</AlertDescription>
                </Alert>
            ) : (
                hint && (
                    <Text size="xs" color="muted" textAlign="center">
                        {hint}
                    </Text>
                )
            )}

            <div className="flex flex-col gap-3">
                <SettingRow
                    label="Background playback"
                    description="Keep playing when you switch tabs."
                    checked={settings?.backgroundPlayback ?? false}
                    disabled={!settings}
                    onCheckedChange={backgroundPlayback => update({ backgroundPlayback })}
                />
                <SettingRow
                    label="Auto next"
                    description="Play the next video when one ends."
                    checked={settings?.autoNext ?? false}
                    disabled={!settings}
                    onCheckedChange={autoNext => update({ autoNext })}
                />
            </div>

            <Separator />

            <footer className="flex items-center justify-between">
                <Button
                    variant="link"
                    size="xs"
                    className="px-0"
                    onClick={() => void chrome.tabs.create({ url: 'chrome://extensions/shortcuts' })}
                >
                    Keyboard shortcuts
                </Button>
                <Text as="span" size="xs" color="muted">
                    v{VERSION}
                </Text>
            </footer>
        </main>
    );
}
