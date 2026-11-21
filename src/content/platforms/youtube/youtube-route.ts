// YouTube Shorts ids are 11 characters of letters, digits, "_" and "-".
const SHORT_PATH = /^\/shorts\/([\w-]+)/;

export function getShortId(pathname: string): string | null {
    return SHORT_PATH.exec(pathname)?.[1] ?? null;
}

/** "/shorts" alone redirects to a Short right away, so it counts as the Shorts page too. */
export function isShortsPage(pathname: string): boolean {
    return pathname === '/shorts' || pathname.startsWith('/shorts/');
}
