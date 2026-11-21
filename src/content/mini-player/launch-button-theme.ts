/**
 * Look of the launch button. DEFAULT_THEME suits any page; a site only lists what it changes.
 * To restyle the button for a site (or add Instagram later), add an entry to SITE_THEMES keyed by the
 * platform adapter's id.
 */
export interface LaunchButtonTheme {
    /** Button width and height in px. */
    size: number;
    /** Space between the site's own "next" button and ours, in px. */
    gapBelowAnchor: number;
    /** Distance from the bottom-left corner when there is no "next" button to sit under, in px. */
    fallbackMargin: number;
    background: string;
    /** Colour of the icon. */
    color: string;
    /** Opacity at rest; the button is fully opaque on hover and focus. */
    restingOpacity: number;
}

// A dark fill keeps the white icon readable on both light and dark pages.
export const DEFAULT_THEME: LaunchButtonTheme = {
    size: 48,
    gapBelowAnchor: 16,
    fallbackMargin: 24,
    background: 'rgb(0 0 0 / 0.55)',
    color: '#fff',
    restingOpacity: 0.75,
};

const SITE_THEMES: Record<string, Partial<LaunchButtonTheme>> = {
    // Matches Facebook's own up/down Reel buttons (measured on facebook.com, Nov 2026) on its dark page.
    facebook: { background: 'rgb(255 255 255 / 0.15)', restingOpacity: 0.6 },
    youtube: {},
};

export function getLaunchButtonTheme(siteId: string): LaunchButtonTheme {
    return { ...DEFAULT_THEME, ...SITE_THEMES[siteId] };
}
