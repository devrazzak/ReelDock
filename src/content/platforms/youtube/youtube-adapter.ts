import type { PlatformAdapter } from '@/content/platforms/platform-adapter';
import { findMuteButton, findNavigationButton, findShortVideo } from '@/content/platforms/youtube/youtube-dom';
import { getShortId, isShortsPage } from '@/content/platforms/youtube/youtube-route';
import { YOUTUBE_BRIDGE_ATTRIBUTE, YOUTUBE_BRIDGE_EVENT } from '@/shared/dom-contract';
import { YOUTUBE_SITE } from '@/shared/sites';

export const youtubeAdapter: PlatformAdapter = {
    id: YOUTUBE_SITE.id,
    name: 'YouTube Shorts',
    hostnames: YOUTUBE_SITE.hostnames,
    isReelsPage: isShortsPage,
    getReelId: getShortId,
    // The id is not needed: YouTube has one player for all Shorts, and the session reads the video after the URL changed.
    findReelVideo: doc => findShortVideo(doc),
    findNavigationButton,
    findMuteButton: doc => findMuteButton(doc),
    navigateFromPage(doc, direction) {
        if (doc.documentElement.getAttribute(YOUTUBE_BRIDGE_ATTRIBUTE) !== 'on') return false;
        doc.dispatchEvent(new CustomEvent(YOUTUBE_BRIDGE_EVENT, { detail: direction }));
        return true;
    },
};
