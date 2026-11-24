import { SEEK_SECONDS, seekBy } from '@/content/video/seek';

/**
 * Chrome's own Picture-in-Picture window. It is the way out when another extension (an ad blocker, say)
 * closes our mini player window as soon as it opens: those extensions cannot close this one.
 * It keeps Chrome's own look, so the buttons come from the media session instead of from ReelDock.
 */
export async function openNativePip(video: HTMLVideoElement): Promise<void> {
    if (!document.pictureInPictureEnabled) throw new Error("Chrome's Picture-in-Picture is turned off.");
    // A page can switch Picture-in-Picture off with this attribute; the user asked for it, so it is cleared.
    video.disablePictureInPicture = false;
    await video.requestPictureInPicture();
    bindMediaSession(video);
}

type ControlAction = 'play' | 'pause' | 'seekbackward' | 'seekforward';

function bindMediaSession(video: HTMLVideoElement): void {
    const handlers: Record<ControlAction, () => void> = {
        play: () => void video.play().catch(() => undefined),
        pause: () => video.pause(),
        seekbackward: () => seekBy(video, -SEEK_SECONDS),
        seekforward: () => seekBy(video, SEEK_SECONDS),
    };
    const actions = Object.keys(handlers) as ControlAction[];
    for (const action of actions) navigator.mediaSession.setActionHandler(action, handlers[action]);
    video.addEventListener(
        'leavepictureinpicture',
        () => {
            for (const action of actions) navigator.mediaSession.setActionHandler(action, null);
        },
        { once: true },
    );
}
