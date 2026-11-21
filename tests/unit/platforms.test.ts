import { describe, expect, it } from 'vitest';

import { findPlatformAdapter } from '@/content/platforms';

describe('findPlatformAdapter', () => {
    it('picks the Facebook adapter on Facebook hosts', () => {
        expect(findPlatformAdapter('www.facebook.com')?.id).toBe('facebook');
        expect(findPlatformAdapter('web.facebook.com')?.id).toBe('facebook');
    });

    it('returns null for unsupported sites', () => {
        expect(findPlatformAdapter('m.facebook.com')).toBeNull();
        expect(findPlatformAdapter('example.com')).toBeNull();
    });
});
