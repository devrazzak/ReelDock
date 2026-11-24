import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ANY_VIDEO_SCRIPT_ID, injectIntoOpenTabs, syncAnyVideoScript } from '@/background/site-access';
import { getSiteMatchPatterns } from '@/shared/sites';

const REQUIRED = getSiteMatchPatterns();
const SCRIPT_FILE = 'assets/any-video.js';

type Script = chrome.scripting.RegisteredContentScript;

/** Just enough of chrome.* for site-access, keeping registered scripts in memory like Chrome does. */
function fakeChrome(granted: string[], tabs: chrome.tabs.Tab[] = []) {
    const registered = new Map<string, Script>();
    const injected: number[] = [];
    const api = {
        permissions: { getAll: async () => ({ origins: [...REQUIRED, ...granted] }) },
        scripting: {
            getRegisteredContentScripts: async ({ ids }: { ids: string[] }) =>
                ids.flatMap(id => registered.get(id) ?? []),
            registerContentScripts: async (scripts: Script[]) => {
                for (const script of scripts) {
                    if (registered.has(script.id)) throw new Error(`Duplicate script ID '${script.id}'`);
                    registered.set(script.id, script);
                }
            },
            updateContentScripts: async (scripts: Script[]) => {
                for (const script of scripts) registered.set(script.id, script);
            },
            unregisterContentScripts: async ({ ids }: { ids: string[] }) => {
                for (const id of ids) registered.delete(id);
            },
            executeScript: async ({ target }: { target: { tabId: number } }) => {
                if (target.tabId === 99) throw new Error('Tab is discarded');
                injected.push(target.tabId);
            },
        },
        tabs: { query: async () => tabs },
    };
    vi.stubGlobal('chrome', api);
    return { registered, injected, setGranted: (origins: string[]) => (granted = origins) };
}

beforeEach(() => vi.unstubAllGlobals());

describe('syncAnyVideoScript', () => {
    it('registers the script on the Reels sites and the sites the user allowed', async () => {
        const { registered } = fakeChrome(['https://example.com/*']);
        await syncAnyVideoScript(SCRIPT_FILE);

        const script = registered.get(ANY_VIDEO_SCRIPT_ID);
        expect(script?.matches).toEqual([...REQUIRED, 'https://example.com/*']);
        expect(script?.js).toEqual([SCRIPT_FILE]);
        expect(script?.persistAcrossSessions).toBe(true);
    });

    it('follows later grants and removals', async () => {
        const chromeFake = fakeChrome(['https://example.com/*']);
        await syncAnyVideoScript(SCRIPT_FILE);

        chromeFake.setGranted(['https://example.com/*', 'https://videos.example.org/*']);
        await syncAnyVideoScript(SCRIPT_FILE);
        expect(chromeFake.registered.get(ANY_VIDEO_SCRIPT_ID)?.matches).toHaveLength(REQUIRED.length + 2);

        chromeFake.setGranted([]);
        await syncAnyVideoScript(SCRIPT_FILE);
        expect(chromeFake.registered.get(ANY_VIDEO_SCRIPT_ID)?.matches).toEqual(REQUIRED);
    });

    it('does not fail when several events sync at the same time', async () => {
        const { registered } = fakeChrome(['https://example.com/*']);
        const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);

        await Promise.all([syncAnyVideoScript(SCRIPT_FILE), syncAnyVideoScript(SCRIPT_FILE)]);
        expect(registered.has(ANY_VIDEO_SCRIPT_ID)).toBe(true);
        expect(error).not.toHaveBeenCalled();
    });
});

describe('injectIntoOpenTabs', () => {
    it('starts the script in open tabs and skips tabs that refuse it', async () => {
        const { injected } = fakeChrome([], [{ id: 1 }, { id: 99 }, { id: 2 }] as chrome.tabs.Tab[]);
        await injectIntoOpenTabs(['https://example.com/*'], SCRIPT_FILE);
        expect(injected).toEqual([1, 2]);
    });
});
