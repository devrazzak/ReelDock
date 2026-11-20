/**
 * Live test harness for the real facebook.com, where an unpacked extension cannot be loaded
 * (e.g. an automated browser pane). It runs the exact production modules in the page:
 * the visibility guard plus ReelSession, with settings kept in memory instead of chrome.storage.
 *
 * Build: pnpm build:live  → tests/live/dist/harness.js, then paste it into the page's console.
 * Read results from window.__reelsLive.
 */
import { isReallyHidden } from './real-visibility';

import '@/page-world/visibility-guard.iife';

import { findReelVideo } from '@/content/reels/reel-dom';
import { createNavigationStrategies } from '@/content/reels/reel-navigator';
import { getReelId } from '@/content/reels/reel-route';
import { ReelSession } from '@/content/session/reel-session';
import { BACKGROUND_ATTRIBUTE } from '@/shared/dom-contract';
import { DEFAULT_SETTINGS } from '@/shared/settings';
import type { PlaybackStatus } from '@/shared/status';

interface LiveLogEntry {
    at: string;
    reelId: string | null;
    hidden: boolean;
    status: Pick<PlaybackStatus, 'videoState' | 'muted' | 'navigating' | 'warning'>;
    navigation: string | null;
}

const settings = { ...DEFAULT_SETTINGS };
const log: LiveLogEntry[] = [];
document.documentElement.setAttribute(BACKGROUND_ATTRIBUTE, 'on');

const currentVideo = () => {
    const id = getReelId(location.pathname);
    return id ? findReelVideo(document, id) : null;
};

const session = new ReelSession({
    doc: document,
    strategies: createNavigationStrategies(document, currentVideo),
    getSettings: () => settings,
    isTabHidden: isReallyHidden,
    onStatus: status => {
        log.push({
            at: new Date().toISOString().slice(11, 19),
            reelId: status.reelId,
            hidden: status.tabHidden,
            status: {
                videoState: status.videoState,
                muted: status.muted,
                navigating: status.navigating,
                warning: status.warning,
            },
            navigation: status.lastNavigation
                ? `${status.lastNavigation.result}:${status.lastNavigation.detail}`
                : null,
        });
    },
});
session.start();

const summary = () => {
    const playing = [...document.querySelectorAll('video')].filter(video => !video.paused).length;
    const video = currentVideo();
    const reels = [...new Set(log.map(entry => entry.reelId))];
    return {
        reallyHidden: isReallyHidden(),
        reelId: getReelId(location.pathname),
        currentPaused: video?.paused ?? null,
        currentMuted: video?.muted ?? null,
        playingVideos: playing,
        reelsSeen: reels,
        navigations: log.filter(entry => entry.navigation).map(entry => `${entry.at} ${entry.navigation}`),
    };
};

Object.assign(window, { __reelsLive: { session, settings, log, summary } });
