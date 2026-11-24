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
import { openNativePip } from '@/content/native-pip/native-pip';
import { showNotice } from '@/content/native-pip/notice';
import { isNativePipRemembered, rememberNativePip } from '@/content/native-pip/remembered-sites';
import { ANY_VIDEO_ATTRIBUTE, FEED_PAGE_ATTRIBUTE } from '@/shared/dom-contract';

/** A mini player closed this soon after opening was not closed by the user: something else closed it. */
const EARLY_CLOSE_MS = 1000;

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
    let openedAt = 0;
    // Set once something else closed our window on this site: clicks then open Chrome's own window.
    let useNativePip = false;
    isNativePipRemembered(location.hostname).then(
        remembered => (useNativePip ||= remembered),
        () => undefined,
    );

    // The button only shows while the pointer is over the video, so it never sits on top of a page at rest.
    const update = (): void => {
        button.setVisible(video !== null && hovering && !miniPlayer.isOpen);
    };

    const miniPlayer = new MiniPlayer(window, {
        ...createVideoControls(() => miniPlayer.video),
        onOpen: () => {
            openedAt = Date.now();
            update();
        },
        onClose: () => {
            update();
            if (Date.now() - openedAt >= EARLY_CLOSE_MS) return;
            // Chrome allows one window per click, so the next click is the one that can open Chrome's own.
            useNativePip = true;
            void rememberNativePip(location.hostname).catch(() => undefined);
            showNotice(document, "Another extension closed the mini player. Click again to use Chrome's own window.");
        },
    });

    const button = new LaunchButton(
        document,
        overVideoCorner(() => video, window),
        () => {
            if (!video) return;
            if (document.pictureInPictureElement) {
                void document.exitPictureInPicture().catch(() => undefined);
                return;
            }
            if (useNativePip) {
                openNativePip(video).catch((error: unknown) => {
                    console.error("ReelDock: could not open Chrome's Picture-in-Picture", error);
                });
                return;
            }
            // Chrome gives no other sign when it refuses to open the window, so the reason goes to the console.
            miniPlayer.open(video, windowSizeFor(video)).catch((error: unknown) => {
                console.error('ReelDock: could not open the mini player', error);
            });
        },
    );

    new VideoTracker(document, found => {
        video = root.hasAttribute(FEED_PAGE_ATTRIBUTE) ? null : found;
        update();
    }).start();

    // Capture phase: players often stop pointer events at their own overlay, which would hide the button.
    document.addEventListener(
        'pointermove',
        event => {
            const inside = video !== null && isInside(video.getBoundingClientRect(), event.clientX, event.clientY);
            if (inside === hovering) return;
            hovering = inside;
            update();
        },
        { passive: true, capture: true },
    );
    root.addEventListener('pointerleave', () => {
        hovering = false;
        update();
    });
}

main();
