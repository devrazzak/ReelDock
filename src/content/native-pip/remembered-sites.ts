const STORAGE_KEY = 'nativePipHosts';

async function read(): Promise<string[]> {
    const stored = await chrome.storage.local.get(STORAGE_KEY);
    const hosts: unknown = stored[STORAGE_KEY];
    return Array.isArray(hosts) ? hosts.filter((host): host is string => typeof host === 'string') : [];
}

/** Sites where the mini player was closed by something else, so Chrome's own window is used from the first click. */
export async function isNativePipRemembered(host: string): Promise<boolean> {
    return (await read()).includes(host);
}

export async function rememberNativePip(host: string): Promise<void> {
    const hosts = await read();
    if (!hosts.includes(host)) await chrome.storage.local.set({ [STORAGE_KEY]: [...hosts, host] });
}
