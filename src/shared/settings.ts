export interface ExtensionSettings {
    /** Keep the Reel playing when the Facebook tab is hidden. */
    backgroundPlayback: boolean;
    /** Move to the next Reel when the current one finishes. */
    autoNext: boolean;
}

export const DEFAULT_SETTINGS: Readonly<ExtensionSettings> = {
    backgroundPlayback: true,
    autoNext: true,
};

const STORAGE_KEY = 'settings';

/** Accepts anything read from storage and returns a complete, valid settings object. */
export function parseSettings(raw: unknown): ExtensionSettings {
    const source = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
    return {
        backgroundPlayback:
            typeof source.backgroundPlayback === 'boolean'
                ? source.backgroundPlayback
                : DEFAULT_SETTINGS.backgroundPlayback,
        autoNext: typeof source.autoNext === 'boolean' ? source.autoNext : DEFAULT_SETTINGS.autoNext,
    };
}

export async function loadSettings(): Promise<ExtensionSettings> {
    const stored = await chrome.storage.sync.get(STORAGE_KEY);
    return parseSettings(stored[STORAGE_KEY]);
}

export async function updateSettings(patch: Partial<ExtensionSettings>): Promise<ExtensionSettings> {
    const next = { ...(await loadSettings()), ...patch };
    await chrome.storage.sync.set({ [STORAGE_KEY]: next });
    return next;
}

/** Calls the listener with the new settings whenever they change. Returns an unsubscribe function. */
export function onSettingsChanged(listener: (settings: ExtensionSettings) => void): () => void {
    const handler = (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => {
        const change = changes[STORAGE_KEY];
        if (areaName === 'sync' && change) listener(parseSettings(change.newValue));
    };
    chrome.storage.onChanged.addListener(handler);
    return () => chrome.storage.onChanged.removeListener(handler);
}
