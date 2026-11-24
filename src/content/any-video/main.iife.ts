/**
 * Entry of the any-video feature: a launch button over the main video of any page the user allowed,
 * which opens that video in the mini player. It never imports the Reels feature; feed pages tell it to
 * stay away through FEED_PAGE_ATTRIBUTE.
 */
import { createVideoControls } from '@/content/any-video/video-controls';
import { VideoTracker } from '@/content/any-video/video-tracker';
import { LaunchButton } from '@/content/mini-player/launch-button';
import { overVideoCorner } from '@/content/mini-player/launch-button-placement';
import { MiniPlayer } from '@/content/mini-player/mini-player';
import { windowSizeFor } from '@/content/mini-player/window-size';
import { ANY_VIDEO_ATTRIBUTE, FEED_PAGE_ATTRIBUTE } from '@/shared/dom-contract';

function isInside(rect: DOMRect, x: number, y: number): boolean {
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

function main(): void {
    // Players in iframes are not supported yet; the main video lives in the top frame on most sites.
    if (window.top !== window || !MiniPlayer.isSupported(window)) return;

    const root = document.documentElement;
    // The script can arrive twice: registered for the site, and injected right after the user allows it.
    if (root.hasAttribute(ANY_VIDEO_ATTRIBUTE)) return;
    root.setAttribute(ANY_VIDEO_ATTRIBUTE, '');

    let video: HTMLVideoElement | null = null;
    let hovering = false;

    // The button only shows while the pointer is over the video, so it never sits on top of a page at rest.
    const update = (): void => {
        button.setVisible(video !== null && hovering && !miniPlayer.isOpen);
    };

    const miniPlayer = new MiniPlayer(window, {
        ...createVideoControls(() => miniPlayer.video),
        onOpen: update,
        onClose: update,
    });

    const button = new LaunchButton(
        document,
        overVideoCorner(() => video, window),
        () => {
            if (video) void miniPlayer.open(video, windowSizeFor(video)).catch(() => undefined);
        },
    );

    new VideoTracker(document, found => {
        video = root.hasAttribute(FEED_PAGE_ATTRIBUTE) ? null : found;
        update();
    }).start();

    document.addEventListener(
        'pointermove',
        event => {
            const inside = video !== null && isInside(video.getBoundingClientRect(), event.clientX, event.clientY);
            if (inside === hovering) return;
            hovering = inside;
            update();
        },
        { passive: true },
    );
    root.addEventListener('pointerleave', () => {
        hovering = false;
        update();
    });
}

main();
