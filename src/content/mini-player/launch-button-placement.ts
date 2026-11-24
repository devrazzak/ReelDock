import { CORNER_MARGIN, type LaunchButtonTheme } from './launch-button-theme';

/** Where the launch button goes, in CSS px from the window's edges. Set one horizontal and one vertical side. */
export interface ButtonPosition {
    left?: number;
    right?: number;
    top?: number;
    bottom?: number;
}

/** Works out the button's position; called again whenever the page layout may have changed. */
export type ButtonPlacement = () => ButtonPosition;

/**
 * Feed pages (Reels, Shorts): centred right under the site's own "next" button, where it reads as part of
 * the navigation and stays clear of Facebook's chat bubbles in the bottom-right corner.
 * Until that button exists it waits where the button will appear (theme.fallbackPosition), so it does not
 * jump later; without a fallback it waits in the bottom-left corner, which these sites leave empty.
 */
export function belowAnchor(
    getAnchor: () => HTMLElement | null,
    theme: LaunchButtonTheme,
    view: Window,
): ButtonPlacement {
    return () => {
        const rect = getAnchor()?.getBoundingClientRect();
        const { size, gapBelowAnchor, fallbackPosition } = theme;

        if (rect && rect.width > 0) {
            return {
                left: Math.round(rect.left + rect.width / 2 - size / 2),
                top: Math.round(rect.bottom + gapBelowAnchor),
            };
        }
        if (fallbackPosition) {
            return {
                right: fallbackPosition.right,
                top: Math.round(view.innerHeight / 2 + fallbackPosition.fromCenter),
            };
        }
        return { left: CORNER_MARGIN, bottom: CORNER_MARGIN };
    };
}

/** Gap between the video's edges and the button, in px. */
const VIDEO_INSET = 12;

/**
 * A single video on any page: inside the video's top-right corner. When the video is partly scrolled out of
 * view, the button stays at the visible edge instead of leaving with it.
 */
export function overVideoCorner(getVideo: () => HTMLElement | null, view: Window): ButtonPlacement {
    return () => {
        const rect = getVideo()?.getBoundingClientRect();
        if (!rect) return { left: CORNER_MARGIN, bottom: CORNER_MARGIN };
        return {
            right: Math.round(Math.max(view.innerWidth - rect.right, 0) + VIDEO_INSET),
            top: Math.round(Math.max(rect.top, 0) + VIDEO_INSET),
        };
    };
}
