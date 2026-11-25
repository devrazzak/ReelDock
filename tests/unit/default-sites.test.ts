import { describe, expect, it } from 'vitest';

import { usesNativePipByDefault } from '@/content/native-pip/default-sites';

describe('usesNativePipByDefault', () => {
    it('is on for YouTube and its subdomains', () => {
        expect(usesNativePipByDefault('youtube.com')).toBe(true);
        expect(usesNativePipByDefault('www.youtube.com')).toBe(true);
        expect(usesNativePipByDefault('m.youtube.com')).toBe(true);
    });

    it('is off for other sites, including look-alike names', () => {
        expect(usesNativePipByDefault('example.com')).toBe(false);
        expect(usesNativePipByDefault('notyoutube.com')).toBe(false);
        expect(usesNativePipByDefault('youtube.com.example.org')).toBe(false);
    });
});
