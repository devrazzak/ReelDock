const REEL_PATH = /^\/reel\/(\d+)/;

export function getReelId(pathname: string): string | null {
    return REEL_PATH.exec(pathname)?.[1] ?? null;
}

export function isReelsPage(pathname: string): boolean {
    return pathname === '/reel' || pathname.startsWith('/reel/');
}
