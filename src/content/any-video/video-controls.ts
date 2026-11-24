import type { MiniPlayerHandlers } from '@/content/mini-player/mini-player';
import { SEEK_SECONDS, seekBy } from '@/content/video/seek';

export type VideoControls = Pick<MiniPlayerHandlers, 'onTogglePlay' | 'onToggleMute' | 'onSeek'>;

/**
 * Mini player controls that act on the <video> element itself. Unlike the Reels feature there is no
 * site adapter here, so no site buttons are clicked: this works the same on every page.
 */
export function createVideoControls(getVideo: () => HTMLVideoElement | null): VideoControls {
    return {
        onTogglePlay: () => {
            const video = getVideo();
            if (!video) return;
            if (video.paused) void video.play().catch(() => undefined);
            else video.pause();
        },
        onToggleMute: () => {
            const video = getVideo();
            if (video) video.muted = !video.muted;
        },
        onSeek: direction => {
            const video = getVideo();
            if (video) seekBy(video, direction === 'forward' ? SEEK_SECONDS : -SEEK_SECONDS);
        },
    };
}
