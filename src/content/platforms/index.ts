import { facebookAdapter } from '@/content/platforms/facebook/facebook-adapter';
import { instagramAdapter } from '@/content/platforms/instagram/instagram-adapter';
import type { PlatformAdapter } from '@/content/platforms/platform-adapter';
import { youtubeAdapter } from '@/content/platforms/youtube/youtube-adapter';

/** Every supported site. Add a new adapter here to support a new site. */
const PLATFORM_ADAPTERS: readonly PlatformAdapter[] = [facebookAdapter, youtubeAdapter, instagramAdapter];

/** The adapter for this host, or null when the site is not supported. */
export function findPlatformAdapter(hostname: string): PlatformAdapter | null {
    return PLATFORM_ADAPTERS.find(adapter => adapter.hostnames.includes(hostname)) ?? null;
}
