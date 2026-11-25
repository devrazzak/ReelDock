/**
 * Keeps the any-video content script registered on exactly the sites the user allowed.
 *
 * Chrome's granted permissions are the single source of truth: whether a site was allowed from the popup or
 * from chrome://extensions, and whether it was later removed, every change ends in syncAnyVideoScript(),
 * which reads the permissions and makes the registration match. The worker keeps no state of its own,
 * because Chrome may stop it at any time.
 */

export const ANY_VIDEO_SCRIPT_ID = 'any-video';

/**
 * Sites the any-video feature runs on: every site the extension may access. That is the Reels sites granted
 * at install (for their ordinary videos, e.g. YouTube /watch; their feed pages keep the Reels feature) plus
 * the sites the user allowed later through optional_host_permissions.
 */
export async function getAnyVideoOrigins(): Promise<string[]> {
    const { origins = [] } = await chrome.permissions.getAll();
    return origins;
}

async function sync(scriptFile: string): Promise<void> {
    const matches = await getAnyVideoOrigins();
    const registered = await chrome.scripting.getRegisteredContentScripts({ ids: [ANY_VIDEO_SCRIPT_ID] });

    if (matches.length === 0) {
        // Chrome rejects a registration without matches, so the script is removed instead.
        if (registered.length > 0) await chrome.scripting.unregisterContentScripts({ ids: [ANY_VIDEO_SCRIPT_ID] });
        return;
    }

    const script: chrome.scripting.RegisteredContentScript = {
        id: ANY_VIDEO_SCRIPT_ID,
        js: [scriptFile],
        matches,
        runAt: 'document_idle',
        // Movie sites embed their player in an iframe from another site; the script runs there too.
        allFrames: true,
        persistAcrossSessions: true,
    };
    // Updating also refreshes the file path, which can change with an extension update.
    if (registered.length > 0) await chrome.scripting.updateContentScripts([script]);
    else await chrome.scripting.registerContentScripts([script]);
}

// Install, startup and permission events can arrive together; two overlapping syncs could both try to
// register the same id, which Chrome rejects. Running them one after another avoids that.
let queue: Promise<void> = Promise.resolve();

export function syncAnyVideoScript(scriptFile: string): Promise<void> {
    queue = queue.then(() => sync(scriptFile)).catch((error: unknown) => console.error('ReelDock: sync failed', error));
    return queue;
}

/**
 * A registered script only runs on the next page load. Right after the user allows a site, this also starts it
 * in the tabs already open there, so the button works without a reload. The script ignores a second copy.
 */
export async function injectIntoOpenTabs(origins: string[], scriptFile: string): Promise<void> {
    if (origins.length === 0) return;
    const tabs = await chrome.tabs.query({ url: origins });
    await Promise.all(
        tabs.map(tab =>
            tab.id === undefined
                ? undefined
                : chrome.scripting
                      .executeScript({ target: { tabId: tab.id }, files: [scriptFile] })
                      // Discarded or still-loading tabs refuse scripts; they get the registered one when they load.
                      .catch(() => undefined),
        ),
    );
}
