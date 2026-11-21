import { describe, expect, it, vi } from 'vitest';

import { youtubeAdapter } from '@/content/platforms/youtube/youtube-adapter';
import { createNavigationStrategies } from '@/content/session/reel-navigator';
import { findNeighbourShortId } from '@/page-world/youtube-sequence';
import { YOUTUBE_BRIDGE_ATTRIBUTE, YOUTUBE_BRIDGE_EVENT } from '@/shared/dom-contract';

const entry = (videoId: unknown) => ({ command: { reelWatchEndpoint: { videoId } } });
const data = (index: unknown) => ({
    currentPlayerIndex: index,
    shortsProcessedSequence: [entry('aaa'), entry('bbb'), entry('ccc')],
});

describe('findNeighbourShortId', () => {
    it('returns the next and previous Short in YouTube\'s list', () => {
        expect(findNeighbourShortId(data(1), 'next')).toBe('ccc');
        expect(findNeighbourShortId(data(1), 'previous')).toBe('aaa');
    });

    it('returns null at the ends of the list', () => {
        expect(findNeighbourShortId(data(2), 'next')).toBeNull();
        expect(findNeighbourShortId(data(0), 'previous')).toBeNull();
    });

    it('returns null when YouTube changed the shape of its data', () => {
        expect(findNeighbourShortId(undefined, 'next')).toBeNull();
        expect(findNeighbourShortId(data('1'), 'next')).toBeNull();
        expect(findNeighbourShortId({ currentPlayerIndex: 0, shortsProcessedSequence: [entry('a'), {}] }, 'next')).toBeNull();
    });

    it('refuses ids that are not plain video ids', () => {
        const odd = { currentPlayerIndex: 0, shortsProcessedSequence: [entry('a'), entry('../x?y=1')] };
        expect(findNeighbourShortId(odd, 'next')).toBeNull();
    });
});

describe('page-navigation strategy', () => {
    const setup = (hidden: boolean, bridgeOn: boolean) => {
        const doc = document.implementation.createHTMLDocument('t');
        Object.defineProperty(doc, 'hidden', { value: hidden });
        if (bridgeOn) doc.documentElement.setAttribute(YOUTUBE_BRIDGE_ATTRIBUTE, 'on');
        const received = vi.fn();
        doc.addEventListener(YOUTUBE_BRIDGE_EVENT, event => received((event as CustomEvent).detail));
        const strategy = createNavigationStrategies(doc, youtubeAdapter, () => null)[0]!;
        return { strategy, received };
    };

    it('asks the page to move on when the tab is hidden', () => {
        const { strategy, received } = setup(true, true);
        expect(strategy.name).toBe('page-navigation');
        expect(strategy.trigger('next')).toBe(true);
        expect(received).toHaveBeenCalledWith('next');
    });

    it('stays out of the way while the tab is visible', () => {
        const { strategy, received } = setup(false, true);
        expect(strategy.trigger('next')).toBe(false);
        expect(received).not.toHaveBeenCalled();
    });

    it('does nothing when the page-side helper is not running', () => {
        const { strategy, received } = setup(true, false);
        expect(strategy.trigger('next')).toBe(false);
        expect(received).not.toHaveBeenCalled();
    });
});
