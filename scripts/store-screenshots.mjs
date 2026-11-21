/**
 * Captures the raw images for the Chrome Web Store listing from the real built extension:
 * the popup (light and dark) and the mini player, playing our own demo videos
 * (store-assets/demo) on the e2e fixture page. No real Facebook content is shown.
 *
 * Usage: pnpm build && CHROME_PATH=<Chrome for Testing> node scripts/store-screenshots.mjs
 * Output: store-assets/raw/*.png, then compose the final images with store-assets/compose.html.
 */
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { CdpClient } from '../tests/e2e/cdp-client.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const demoDir = join(root, 'store-assets/demo');
const outDir = join(root, 'store-assets/raw');
const port = 9850;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function until(read, ok, timeoutMs = 10000) {
    const start = Date.now();
    let value = await read();
    while (!ok(value) && Date.now() - start < timeoutMs) {
        await sleep(200);
        value = await read();
    }
    return value;
}

async function save(session, name, width, height) {
    await session.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 2, mobile: false });
    await sleep(600);
    const { data } = await session.send('Page.captureScreenshot', { format: 'png' });
    await writeFile(join(outDir, `${name}.png`), Buffer.from(data, 'base64'));
    console.log(`saved ${name}.png`);
}

await mkdir(outDir, { recursive: true });
const profile = await mkdtemp(join(tmpdir(), 'reels-shots-'));
const extension = join(root, 'dist');
const args = [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    `--disable-extensions-except=${extension}`,
    `--load-extension=${extension}`,
    '--disable-features=DisableLoadExtensionCommandLineSwitch',
    '--no-first-run',
    '--window-size=1200,900',
    'about:blank',
];
if (process.getuid?.() === 0) args.push('--no-sandbox');
const chrome = spawn(process.env.CHROME_PATH ?? 'google-chrome', args, { stdio: 'ignore' });

try {
    const version = await until(
        () =>
            fetch(`http://127.0.0.1:${port}/json/version`).then(
                r => r.json(),
                () => null,
            ),
        v => v !== null,
    );
    const client = await CdpClient.connect(version.webSocketDebuggerUrl);
    const isWorker = t => t.type === 'service_worker' && t.url.endsWith('/service-worker-loader.js');
    const targets = await until(
        async () => (await client.send('Target.getTargets')).targetInfos,
        t => t.some(isWorker),
    );
    const extensionId = new URL(targets.find(isWorker).url).host;

    const open = async url => {
        const { targetId } = await client.send('Target.createTarget', { url: 'about:blank' });
        const session = await client.attach(targetId);
        await session.send('Runtime.enable');
        await session.send('Page.enable');
        if (url) await session.send('Page.navigate', { url });
        return session;
    };

    const popup = await open(`chrome-extension://${extensionId}/src/popup/index.html`);
    const reels = await open();
    client.on(async message => {
        if (message.method !== 'Fetch.requestPaused' || message.sessionId !== reels.sessionId) return;
        const { requestId, request } = message.params;
        const path = new URL(request.url).pathname;
        const isVideo = path.startsWith('/__fixture/');
        const file = isVideo
            ? join(demoDir, path.replace('/__fixture/', ''))
            : join(root, 'tests/e2e/fixture/reels.html');
        await reels.send('Fetch.fulfillRequest', {
            requestId,
            responseCode: 200,
            responseHeaders: [{ name: 'Content-Type', value: isVideo ? 'video/mp4' : 'text/html' }],
            body: (await readFile(file)).toString('base64'),
        });
    });
    await reels.send('Fetch.enable', { patterns: [{ urlPattern: 'https://www.facebook.com/*' }] });
    await reels.send('Page.navigate', { url: 'https://www.facebook.com/reel/1001' });
    await until(
        () => reels.evaluate(`Boolean(document.querySelector('[data-video-id="1001"] video')?.paused === false)`),
        Boolean,
    );
    await reels.click('[aria-label="Unmute"]');

    // The Reels page with the mini player button, for the "where to find it" screenshot.
    await reels.send('Emulation.setDeviceMetricsOverride', {
        width: 1280,
        height: 800,
        deviceScaleFactor: 1,
        mobile: false,
    });
    await sleep(800); // first Reel, before auto next scrolls the page
    const page = await reels.send('Page.captureScreenshot', { format: 'png' });
    await writeFile(join(outDir, 'reels-page.png'), Buffer.from(page.data, 'base64'));
    const launcherRect = await reels.evaluate(`(() => {
        const r = document.querySelector('reeldock-launcher').getBoundingClientRect();
        return { left: r.left, top: r.top, width: r.width, height: r.height };
    })()`);
    // A script, so compose.html can load it from file:// (fetch is blocked there).
    await writeFile(join(outDir, 'launcher.js'), `window.LAUNCHER = ${JSON.stringify(launcherRect)};\n`);
    console.log('saved reels-page.png');

    // Popup while the Facebook tab plays in the background.
    await popup.evaluate('chrome.tabs.getCurrent().then(tab => chrome.tabs.update(tab.id, { active: true }))');
    await popup.send('Page.reload');
    await sleep(1500);
    await save(popup, 'popup-light', 360, 560);
    await popup.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'dark' }] });
    await popup.send('Page.reload');
    await sleep(1500);
    await save(popup, 'popup-dark', 360, 560);

    // Mini player with its controls visible (mouse over the window).
    await popup.evaluate(`(async () => {
        const [tab] = await chrome.tabs.query({ url: 'https://www.facebook.com/*' });
        await chrome.tabs.update(tab.id, { active: true });
    })()`);
    await sleep(800);

    const launcher = await reels.evaluate(`(() => {
        const rect = document.querySelector('reeldock-launcher').getBoundingClientRect();
        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    })()`);
    await reels.clickAt(launcher.x, launcher.y);
    const pipTarget = await until(
        async () =>
            (await client.send('Target.getTargets')).targetInfos.find(
                t => t.type === 'page' && t.openerId === reels.targetId && t.url === 'about:blank',
            ),
        Boolean,
    );
    const pip = await client.attach(pipTarget.targetId);
    await pip.send('Runtime.enable');
    await pip.send('Emulation.setDeviceMetricsOverride', {
        width: 360,
        height: 640,
        deviceScaleFactor: 2,
        mobile: false,
    });
    await sleep(1500);
    await pip.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 180, y: 300 });
    await sleep(500);
    const { data } = await pip.send('Page.captureScreenshot', { format: 'png' });
    await writeFile(join(outDir, 'mini-player.png'), Buffer.from(data, 'base64'));
    console.log('saved mini-player.png');

    client.close();
} finally {
    chrome.kill();
    await sleep(300);
    await rm(profile, { recursive: true, force: true });
}
