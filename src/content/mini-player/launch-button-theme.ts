/**
 * Look and place of the launch button. DEFAULT_THEME suits any page; a site only lists what it changes.
 * To restyle the button for a site (or add Instagram later), add an entry to SITE_THEMES keyed by the
 * platform adapter's id.
 */
export interface LaunchButtonTheme {
    /** Button width and height in px. */
    size: number;
    /** Icon width and height in px. */
    iconSize: number;
    /** Draw a ring around the icon, like Facebook's own buttons. */
    ring: boolean;
    /** Space between the site's own "next" button and ours, in px. */
    gapBelowAnchor: number;
    background: string;
    /** Colour of the icon. */
    color: string;
    /** Opacity at rest; the button is fully opaque on hover and focus. */
    restingOpacity: number;
    /** Colours used when the page is in dark mode (`<html dark>`), if the site has one. */
    dark?: { background: string; color: string };
    /**
     * Where to sit while the site's "next" button is not on the page yet (Shorts and Reels load slowly),
     * so the button does not jump later: `right` px from the right edge and `fromCenter` px below the
     * vertical middle of the window. Without it the button waits in the bottom-left corner.
     */
    fallbackPosition?: { right: number; fromCenter: number };
}

// A dark fill keeps the white icon readable on both light and dark pages.
export const DEFAULT_THEME: LaunchButtonTheme = {
    size: 48,
    iconSize: 48,
    ring: true,
    gapBelowAnchor: 16,
    background: 'rgb(0 0 0 / 0.55)',
    color: '#fff',
    restingOpacity: 0.75,
};

/** Distance from the bottom-left corner when the button has no better place. */
export const CORNER_MARGIN = 24;

const SITE_THEMES: Record<string, Partial<LaunchButtonTheme>> = {
    // Matches Facebook's own up/down Reel buttons (measured on facebook.com, Nov 2026) on its dark page.
    // Its "next" button sits 12 px from the right edge and 36 px below the window's middle; ours goes right under it.
    facebook: {
        background: 'rgb(255 255 255 / 0.15)',
        restingOpacity: 0.6,
        fallbackPosition: { right: 12, fromCenter: 36 + 48 + 16 },
    },
    // Matches YouTube's own arrows (measured on youtube.com, Nov 2026): 56 px circle, plain glyph, 16 px apart.
    // They sit 24 px from the right edge and 44 px below the window's middle; ours goes right under them.
    youtube: {
        size: 56,
        iconSize: 48,
        ring: false,
        background: 'rgb(0 0 0 / 0.05)',
        color: '#0f0f0f',
        restingOpacity: 1,
        dark: { background: 'rgb(255 255 255 / 0.1)', color: '#f1f1f1' },
        fallbackPosition: { right: 24, fromCenter: 44 + 56 + 16 },
    },
};

export function getLaunchButtonTheme(siteId: string): LaunchButtonTheme {
    return { ...DEFAULT_THEME, ...SITE_THEMES[siteId] };
}
