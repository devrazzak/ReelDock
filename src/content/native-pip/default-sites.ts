/**
 * Sites where Chrome's own Picture-in-Picture window is used from the first click. On YouTube ad blockers close
 * our window as soon as it opens, and Chrome's own window also shows YouTube's "Skip ad" button.
 */
const DEFAULT_NATIVE_SITES = ['youtube.com'];

export function usesNativePipByDefault(hostname: string): boolean {
    return DEFAULT_NATIVE_SITES.some(site => hostname === site || hostname.endsWith(`.${site}`));
}
