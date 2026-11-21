import { describe, expect, it } from 'vitest';

import { findPlatformAdapter } from '@/content/platforms';
import {
    findSiteByUrl,
    getReelsTabPatterns,
    getSiteMatchPatterns,
    SUPPORTED_SITES,
    type SupportedSite,
} from '@/shared/sites';

const TEST_SITES: SupportedSite[] = [
    {
        id: 'one',
        name: 'One',
        startUrl: 'https://a.example.com/reel/',
        hostnames: ['a.example.com', 'b.example.com'],
        reelsPath: '/reel/*',
    },
    {
        id: 'two',
        name: 'Two',
        startUrl: 'https://c.example.com/shorts',
        hostnames: ['c.example.com'],
        reelsPath: '/shorts/*',
    },
];

describe('site patterns', () => {
    it('builds one pattern per host for the manifest', () => {
        expect(getSiteMatchPatterns(TEST_SITES)).toEqual([
            'https://a.example.com/*',
            'https://b.example.com/*',
            'https://c.example.com/*',
        ]);
    });

    it("builds reels-tab patterns with each site's own path", () => {
        expect(getReelsTabPatterns(TEST_SITES)).toEqual([
            'https://a.example.com/reel/*',
            'https://b.example.com/reel/*',
            'https://c.example.com/shorts/*',
        ]);
    });

    it('lists Facebook and YouTube, each with its own Reels path', () => {
        expect(getSiteMatchPatterns()).toEqual([
            'https://www.facebook.com/*',
            'https://web.facebook.com/*',
            'https://www.youtube.com/*',
        ]);
        expect(getReelsTabPatterns()).toEqual([
            'https://www.facebook.com/reel/*',
            'https://web.facebook.com/reel/*',
            'https://www.youtube.com/shorts/*',
        ]);
    });
});

describe('sites and adapters stay in sync', () => {
    it.each(SUPPORTED_SITES.flatMap(site => site.hostnames.map(hostname => [site.id, hostname])))(
        'site "%s" host %s has an adapter with the same id',
        (id, hostname) => {
            expect(findPlatformAdapter(hostname)?.id).toBe(id);
        },
    );
});

describe('findSiteByUrl', () => {
    it('finds the site a page belongs to', () => {
        expect(findSiteByUrl('https://c.example.com/shorts/abc', TEST_SITES)?.id).toBe('two');
        expect(findSiteByUrl('https://b.example.com/reel/1', TEST_SITES)?.id).toBe('one');
    });

    it('returns null for other sites and missing urls', () => {
        expect(findSiteByUrl('https://other.example.com/', TEST_SITES)).toBeNull();
        expect(findSiteByUrl(undefined, TEST_SITES)).toBeNull();
    });
});
