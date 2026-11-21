import type { PlatformAdapter } from '@/content/platforms/platform-adapter';
import { findMuteButton, findNavigationButton, findReelVideo } from '@/content/platforms/facebook/facebook-dom';
import { getReelId, isReelsPage } from '@/content/platforms/facebook/facebook-route';

export const facebookAdapter: PlatformAdapter = {
    id: 'facebook',
    name: 'Facebook Reels',
    hostnames: ['www.facebook.com', 'web.facebook.com'],
    isReelsPage,
    getReelId,
    findReelVideo,
    findNavigationButton,
    findMuteButton,
};
