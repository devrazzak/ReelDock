import type { Direction, PlatformAdapter } from '@/content/platforms/platform-adapter';

/** One way of asking the site to move to another Reel. Returns false when it could not be attempted. */
export interface NavigationStrategy {
    name: string;
    /** The URL does not change when this strategy works; a different current video is the sign of success. */
    keepsUrl?: boolean;
    trigger(direction: Direction): boolean;
}

function findScrollContainer(start: Element | null): HTMLElement | null {
    for (let element = start?.parentElement ?? null; element; element = element.parentElement) {
        const { overflowY } = getComputedStyle(element);
        if ((overflowY === 'auto' || overflowY === 'scroll') && element.scrollHeight > element.clientHeight) {
            return element;
        }
    }
    return null;
}

/**
 * Ordered from most to least reliable. Synthetic key presses are not included:
 * Facebook ignores untrusted keyboard events (verified).
 */
export function createNavigationStrategies(
    doc: Document,
    platform: PlatformAdapter,
    getCurrentVideo: () => HTMLVideoElement | null,
): NavigationStrategy[] {
    return [
        {
            // A background tab renders nothing, so a site's own button can do nothing there.
            name: 'page-navigation',
            keepsUrl: platform.pageNavigationKeepsUrl === true,
            trigger(direction) {
                return doc.hidden && (platform.navigateFromPage?.(doc, direction) ?? false);
            },
        },
        {
            name: 'navigation-button',
            trigger(direction) {
                const button = platform.findNavigationButton(doc, direction);
                button?.click();
                return button !== null;
            },
        },
        {
            // Fallback for when Facebook renames its buttons. Only works while the tab is visible,
            // because Facebook detects the new card with IntersectionObserver, which needs rendering.
            name: 'scroll-container',
            trigger(direction) {
                if (doc.hidden) return false;
                const container = findScrollContainer(getCurrentVideo());
                if (!container) return false;
                container.scrollBy({
                    top: container.clientHeight * (direction === 'next' ? 1 : -1),
                    behavior: 'instant',
                });
                return true;
            },
        },
    ];
}
