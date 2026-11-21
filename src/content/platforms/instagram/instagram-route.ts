// Instagram shortcodes are letters, digits, "_" and "-". The feed lives at /reels/<id>/, a single Reel at /reel/<id>/.
const REEL_PATH = /^\/reels?\/([\w-]+)/;

export function getReelId(pathname: string): string | null {
    return REEL_PATH.exec(pathname)?.[1] ?? null;
}

/** "/reels" alone redirects to a Reel right away, so it counts as the Reels page too. */
export function isReelsPage(pathname: string): boolean {
    return pathname === '/reels' || pathname.startsWith('/reels/') || pathname.startsWith('/reel/');
}
