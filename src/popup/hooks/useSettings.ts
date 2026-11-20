import { useCallback, useEffect, useState } from 'react';

import { loadSettings, onSettingsChanged, updateSettings, type ExtensionSettings } from '@/shared/settings';

type SettingsState =
    { status: 'loading' } | { status: 'ready'; settings: ExtensionSettings } | { status: 'error'; message: string };

export function useSettings() {
    const [state, setState] = useState<SettingsState>({ status: 'loading' });

    useEffect(() => {
        loadSettings().then(
            settings => setState({ status: 'ready', settings }),
            () => setState({ status: 'error', message: 'Could not load settings from Chrome storage.' }),
        );
        // Keeps the popup in sync when a keyboard shortcut changes a setting.
        return onSettingsChanged(settings => setState({ status: 'ready', settings }));
    }, []);

    const update = useCallback((patch: Partial<ExtensionSettings>) => {
        updateSettings(patch).catch(() =>
            setState({ status: 'error', message: 'Could not save the setting. Please try again.' }),
        );
    }, []);

    return { state, update };
}
