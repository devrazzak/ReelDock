import { defineManifest } from '@crxjs/vite-plugin';

import packageJson from './package.json' with { type: 'json' };
import { getSiteMatchPatterns } from './src/shared/sites';

const SITE_MATCHES = getSiteMatchPatterns();

export default defineManifest({
    manifest_version: 3,
    name: 'ReelDock – Facebook Reels Auto Scroll & Mini Player',
    short_name: 'ReelDock',
    description:
        'Auto scroll Facebook Reels, keep them playing in the background, and watch in a floating mini player you can scroll.',
    version: packageJson.version,
    minimum_chrome_version: '116',
    icons: {
        16: 'icons/icon-16.png',
        32: 'icons/icon-32.png',
        48: 'icons/icon-48.png',
        128: 'icons/icon-128.png',
    },
    action: {
        default_popup: 'src/popup/index.html',
        default_title: 'ReelDock',
    },
    background: {
        service_worker: 'src/background/service-worker.ts',
        type: 'module',
    },
    permissions: ['storage'],
    host_permissions: SITE_MATCHES,
    content_scripts: [
        {
            // Runs in the page's own JS world before the site's scripts, so it can answer visibility checks.
            matches: SITE_MATCHES,
            js: ['src/page-world/visibility-guard.iife.ts'],
            run_at: 'document_start',
            world: 'MAIN',
        },
        {
            matches: SITE_MATCHES,
            js: ['src/content/main.iife.ts'],
            run_at: 'document_start',
        },
    ],
    commands: {
        'toggle-play': {
            suggested_key: { default: 'Alt+Shift+P' },
            description: 'Play / pause the current Reel',
        },
        'next-reel': {
            suggested_key: { default: 'Alt+Shift+N' },
            description: 'Go to the next Reel',
        },
        'toggle-auto-next': {
            suggested_key: { default: 'Alt+Shift+A' },
            description: 'Turn Auto Next on / off',
        },
        // Chrome allows at most four suggested shortcuts; users can assign these in chrome://extensions/shortcuts.
        'seek-forward': {
            description: 'Skip forward 10 seconds',
        },
        'seek-backward': {
            description: 'Skip back 10 seconds',
        },
        'toggle-background-playback': {
            suggested_key: { default: 'Alt+Shift+B' },
            description: 'Turn Background Playback on / off',
        },
    },
});
