import { findMuteButton, findNavigationButton, findReelVideo } from '@/content/platforms/facebook/facebook-dom';
import { getReelId, isReelsPage } from '@/content/platforms/facebook/facebook-route';
import type { PlatformAdapter } from '@/content/platforms/platform-adapter';
import { FACEBOOK_SITE } from '@/shared/sites';

export const facebookAdapter: PlatformAdapter = {
    id: FACEBOOK_SITE.id,
    name: 'Facebook Reels',
    hostnames: FACEBOOK_SITE.hostnames,
    isReelsPage,
    getReelId,
    findReelVideo,
    findNavigationButton,
    findMuteButton,
};
