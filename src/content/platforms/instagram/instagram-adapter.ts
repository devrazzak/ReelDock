import { findMuteButton, findNavigationButton, findReelVideo } from '@/content/platforms/instagram/instagram-dom';
import { getReelId, isReelsPage } from '@/content/platforms/instagram/instagram-route';
import type { PlatformAdapter } from '@/content/platforms/platform-adapter';
import { INSTAGRAM_SITE } from '@/shared/sites';

export const instagramAdapter: PlatformAdapter = {
    id: INSTAGRAM_SITE.id,
    name: INSTAGRAM_SITE.name,
    hostnames: INSTAGRAM_SITE.hostnames,
    isReelsPage,
    getReelId,
    // The id is not needed: a card has no id, so the session reads the video on screen after the URL changed.
    findReelVideo: doc => findReelVideo(doc),
    findNavigationButton,
    findMuteButton: doc => findMuteButton(doc),
};
