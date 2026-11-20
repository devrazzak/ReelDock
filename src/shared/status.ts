export type VideoState = 'none' | 'loading' | 'playing' | 'paused' | 'blocked';

export type NavigationResult = 'success' | 'failed';

export interface NavigationRecord {
    at: number;
    result: NavigationResult;
    /** Which strategy moved the Reel, or why it failed. */
    detail: string;
}

/** Snapshot of the content script's view of the page, shown in the popup. */
export interface PlaybackStatus {
    onReelsPage: boolean;
    reelId: string | null;
    videoState: VideoState;
    /** Facebook starts Reels muted until the user clicks its Unmute button. */
    muted: boolean;
    /** True when the Facebook tab is really hidden (another tab is active). */
    tabHidden: boolean;
    miniPlayerOpen: boolean;
    navigating: boolean;
    lastNavigation: NavigationRecord | null;
    /** Human readable warning, e.g. when the browser blocked playback. */
    warning: string | null;
}

export const INITIAL_STATUS: Readonly<PlaybackStatus> = {
    onReelsPage: false,
    reelId: null,
    videoState: 'none',
    muted: false,
    tabHidden: false,
    miniPlayerOpen: false,
    navigating: false,
    lastNavigation: null,
    warning: null,
};
