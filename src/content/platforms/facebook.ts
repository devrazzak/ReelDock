import type { PlatformAdapter } from '@/content/platforms/platform-adapter';
import { findMuteButton, findNavigationButton, findReelVideo } from '@/content/reels/reel-dom';
import { getReelId, isReelsPage } from '@/content/reels/reel-route';

export const facebookAdapter: PlatformAdapter = {
    id: 'facebook',
    name: 'Facebook Reels',
    isReelsPage,
    getReelId,
    findReelVideo,
    findNavigationButton,
    findMuteButton,
};
