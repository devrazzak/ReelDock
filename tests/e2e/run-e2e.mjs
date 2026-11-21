/**
 * End-to-end test in a real Chrome with the built extension loaded, driven over raw CDP.
 *
 * Facebook needs a login, so requests to www.facebook.com are answered with a local fixture
 * that imitates the verified Facebook behaviour (see fixture/reels.html). The Facebook tab is
 * put in the background the way a user does it: another tab in the same window becomes active.
 *
 * Usage: pnpm test:e2e
 *   CHROME_PATH      Chrome for Testing or Chromium (branded Google Chrome ignores --load-extension)
 *   E2E_SCREENSHOTS  folder for popup.png (default: tests/e2e/)
 */
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { CdpClient } from './cdp-client.mjs';

const root = fileURLToPath(new URL('../..', import.meta.url));
const extensionPath = join(root, 'dist');
const fixtureDir = fileURLToPath(new URL('./fixture/', import.meta.url));
const screenshotDir = process.env.E2E_SCREENSHOTS ?? fileURLToPath(new URL('.', import.meta.url));
const chromePath = process.env.CHROME_PATH ?? 'google-chrome';
const port = 9300 + Math.floor(Math.random() * 500);

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const results = [];
function check(name, passed, detail = '') {
    results.push({ name, passed });
    console.log(`${passed ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
}

/** Real visibility (bypassing the extension's page-world override) and the current Reel's video state. */
const pageState = findVideo => `(() => {
    if (!document.body) return { id: null, paused: null, muted: null, playing: 0 };
    const frame = document.createElement('iframe');
    frame.style.display = 'none';
    document.body.append(frame);
    const getVisibility = Object.getOwnPropertyDescriptor(frame.contentWindow.Document.prototype, 'visibilityState').get;
    frame.remove();
    const id = location.pathname.split('/')[2];
    const video = ${findVideo};
    return {
        realVisibility: getVisibility.call(document),
        id,
        paused: video ? video.paused : null,
        muted: video ? video.muted : null,
        playing: [...document.querySelectorAll('video')].filter(v => !v.paused).length,
    };
})()`;
const PAGE_STATE = pageState(`document.querySelector('[data-video-id="' + id + '"] video')`);
const YOUTUBE_STATE = pageState(`document.querySelector('ytd-shorts video')`);

async function waitFor(read, predicate, timeoutMs = 10000) {
    const start = Date.now();
    let value = await read();
    while (!predicate(value) && Date.now() - start < timeoutMs) {
        await sleep(200);
        value = await read();
    }
    return value;
}

async function launchChrome() {
    const profile = await mkdtemp(join(tmpdir(), 'reels-e2e-'));
    const args = [
        `--remote-debugging-port=${port}`,
        `--user-data-dir=${profile}`,
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
        // Chrome 137+ ignores --load-extension unless this switch is disabled.
        '--disable-features=DisableLoadExtensionCommandLineSwitch',
        '--no-first-run',
        '--no-default-browser-check',
        '--window-size=1000,800',
        'about:blank',
    ];
    if (process.getuid?.() === 0) args.push('--no-sandbox');
    const chrome = spawn(chromePath, args, { stdio: 'ignore' });

    const version = await waitFor(
        () =>
            fetch(`http://127.0.0.1:${port}/json/version`).then(
                r => r.json(),
                () => null,
            ),
        value => value !== null,
    );
    const client = await CdpClient.connect(version.webSocketDebuggerUrl);
    const stop = async () => {
        client.close();
        chrome.kill();
        await sleep(300);
        await rm(profile, { recursive: true, force: true });
    };
    return { client, stop };
}

async function findExtensionId(client) {
    // Chrome runs a few built-in extensions too; ours is the one with CRXJS's worker loader.
    const isWorker = info => info.type === 'service_worker' && info.url.endsWith('/service-worker-loader.js');
    const targets = await waitFor(
        async () => (await client.send('Target.getTargets')).targetInfos,
        infos => infos.some(isWorker),
    );
    return new URL(targets.find(isWorker).url).host;
}

async function openTab(client, url) {
    const { targetId } = await client.send('Target.createTarget', { url: 'about:blank' });
    const session = await client.attach(targetId);
    await session.send('Runtime.enable');
    await session.send('Page.enable');
    if (url) await session.send('Page.navigate', { url });
    return session;
}

/** Reloads and waits for the new page. Page.reload returns while the old page is still alive and answering. */
async function reloadAndWait(session) {
    await session.evaluate('window.__beforeReload = true');
    await session.send('Page.reload');
    await waitFor(
        () => session.evaluate('document.readyState === "complete" && !window.__beforeReload').catch(() => false),
        ready => ready === true,
    );
}

/** Serves the fixture page for every request to this host made by this tab; /__fixture/* serves the videos. */
async function serveFixture(client, session, host = 'www.facebook.com', page = 'reels.html') {
    client.on(async message => {
        if (message.method !== 'Fetch.requestPaused' || message.sessionId !== session.sessionId) return;
        const { requestId, request } = message.params;
        const path = new URL(request.url).pathname;
        const isVideo = path.startsWith('/__fixture/');
        const file = isVideo ? join(fixtureDir, path.replace('/__fixture/', '')) : join(fixtureDir, page);
        await session.send('Fetch.fulfillRequest', {
            requestId,
            responseCode: 200,
            responseHeaders: [{ name: 'Content-Type', value: isVideo ? 'video/mp4' : 'text/html' }],
            body: (await readFile(file)).toString('base64'),
        });
    });
    await session.send('Fetch.enable', { patterns: [{ urlPattern: `https://${host}/*` }] });
}

const YOUTUBE_MINI_STATE = `(() => {
    const pip = documentPictureInPicture.window;
    const video = pip?.document.querySelector('video');
    return {
        open: Boolean(pip),
        id: location.pathname.split('/')[2],
        inMiniPlayer: Boolean(video) && video.closest('ytd-shorts') === null,
        miniVideoSrc: video ? video.currentSrc.split('/').pop() : null,
        paused: video ? video.paused : null,
        muted: video ? video.muted : null,
        playing: [...document.querySelectorAll('video')].filter(v => !v.paused).length + (video && !video.paused ? 1 : 0),
    };
})()`;

/**
 * The same extension on a second site: a fixture that imitates YouTube Shorts (see fixture/shorts.html).
 * One <video> is reused for every Short, and Shorts loop instead of firing "ended".
 */
async function runYoutubeChecks({ client, control, setSettings, hideTab }) {
    await setSettings(true);
    const tab = await openTab(client);
    await serveFixture(client, tab, 'www.youtube.com', 'shorts.html');
    await tab.send('Page.navigate', { url: 'https://www.youtube.com/shorts/sh_0001' });
    const read = () => tab.evaluate(YOUTUBE_STATE);
    const showTab = () =>
        control.evaluate(`(async () => {
            const [tab] = await chrome.tabs.query({ url: 'https://www.youtube.com/*' });
            await chrome.tabs.update(tab.id, { active: true });
        })()`);
    const shortFile = id => `short-${Number(id.slice(3))}.mp4`;

    let state = await waitFor(read, s => s.paused === false);
    check('YouTube: Short starts playing', state.paused === false, `short ${state.id}`);
    await tab.click('ytd-shorts [aria-label="Unmute (m)"]'); // trusted click = user activation
    state = await waitFor(read, s => s.muted === false);
    check('YouTube: sound is on after the user clicks Unmute', state.muted === false);

    await hideTab();
    state = await waitFor(read, s => s.realVisibility === 'hidden');
    check('YouTube: tab is really in the background', state.realVisibility === 'hidden', state.realVisibility);
    // Shorts are 4 s and loop. Auto next has to notice the loop restart and move on by itself.
    const visited = [state.id];
    for (let i = 0; i < 120 && visited.length < 4; i++) {
        await sleep(250);
        const now = await read();
        if (visited.at(-1) !== now.id) visited.push(now.id);
    }
    check(
        'YouTube: auto next moved through every Short while hidden',
        visited.join(',') === 'sh_0001,sh_0002,sh_0003,sh_0004',
        visited.join(' → '),
    );
    state = await waitFor(read, s => s.id === 'sh_0004' && s.paused === false, 5000);
    check(
        'YouTube: last Short is playing with sound in the background',
        state.paused === false && state.muted === false,
        JSON.stringify(state),
    );
    check('YouTube: only one video plays at a time', state.playing === 1, `${state.playing} playing`);

    // ---- Mini player ----
    await showTab();
    await tab.evaluate(`history.replaceState({}, '', '/shorts/sh_0001')`);
    await reloadAndWait(tab);
    await waitFor(read, s => s.paused === false);
    await tab.click('ytd-shorts [aria-label="Unmute (m)"]');
    state = await waitFor(read, s => s.muted === false, 3000);
    check('YouTube: sound is on again after reloading the page', state.muted === false, JSON.stringify(state));
    const launcher = await tab.evaluate(`(() => {
        const host = document.querySelector('reeldock-launcher').getBoundingClientRect();
        const next = document.querySelector('ytd-shorts [aria-label="Next video"]').getBoundingClientRect();
        return {
            x: host.left + host.width / 2,
            y: host.top + host.height / 2,
            gap: host.top - next.bottom,
            dx: host.left + host.width / 2 - (next.left + next.width / 2),
        };
    })()`);
    check(
        'YouTube: mini player button sits right under the next button',
        Math.abs(launcher.gap - 16) <= 1 && Math.abs(launcher.dx) <= 1,
        JSON.stringify(launcher),
    );
    await tab.clickAt(launcher.x, launcher.y);
    const readMini = () => tab.evaluate(YOUTUBE_MINI_STATE);
    let mini = await waitFor(readMini, m => m.open && m.paused === false);
    check(
        'YouTube: mini player opens and plays the Short',
        mini.open && mini.inMiniPlayer && mini.paused === false && mini.miniVideoSrc === shortFile(mini.id),
        JSON.stringify(mini),
    );

    const pipTarget = await waitFor(
        async () =>
            (await client.send('Target.getTargets')).targetInfos.find(
                t => t.type === 'page' && t.openerId === tab.targetId && t.url === 'about:blank',
            ),
        target => Boolean(target),
    );
    const pip = await client.attach(pipTarget.targetId);
    await pip.send('Runtime.enable');

    await pip.wheel(180, 320, 150);
    mini = await waitFor(readMini, m => m.id === 'sh_0002' && m.paused === false);
    check(
        'YouTube: mouse wheel in the mini player goes to the next Short',
        mini.id === 'sh_0002' && mini.miniVideoSrc === shortFile('sh_0002') && mini.paused === false,
        JSON.stringify(mini),
    );
    check('YouTube: sound stays on in the mini player', mini.muted === false);

    // Mute with the M key through YouTube's own button, change Short: the next one must stay muted.
    await pip.press('m', 'KeyM');
    await sleep(300);
    await pip.press('ArrowUp', 'ArrowUp'); // previous Short
    mini = await waitFor(readMini, m => m.id === 'sh_0001' && m.paused === false);
    await sleep(600);
    mini = await readMini();
    check(
        'YouTube: muting in the mini player carries over to the next Short',
        mini.id === 'sh_0001' && mini.muted === true,
        JSON.stringify(mini),
    );

    await hideTab();
    mini = await waitFor(readMini, m => m.id === 'sh_0002' && m.paused === false, 10000);
    check(
        'YouTube: auto next continues inside the mini player while the tab is hidden',
        mini.id === 'sh_0002' && mini.inMiniPlayer && mini.paused === false,
        JSON.stringify(mini),
    );

    await tab.evaluate('documentPictureInPicture.window.close()');
    await sleep(800);
    const back = await tab.evaluate(`(() => {
        const video = document.querySelector('ytd-shorts video');
        return { inPlayer: Boolean(video), file: video?.currentSrc.split('/').pop(), paused: video?.paused };
    })()`);
    state = await read();
    check(
        'YouTube: closing the mini player returns the video to YouTube and keeps playing',
        back.inPlayer && back.file === shortFile(state.id) && back.paused === false,
        JSON.stringify(back),
    );
    await showTab();

    // ---- Control: background playback off ----
    await setSettings(false);
    await sleep(300);
    await hideTab();
    state = await waitFor(read, s => s.paused === true, 3000);
    check(
        'YouTube control: with background playback off, the page pauses when hidden',
        state.realVisibility === 'hidden' && state.paused === true,
    );
}

async function main() {
    const { client, stop } = await launchChrome();
    try {
        const extensionId = await findExtensionId(client);
        const popupUrl = `chrome-extension://${extensionId}/src/popup/index.html`;

        // The extension popup page doubles as the "other tab" and as a handle on chrome.* APIs.
        const control = await openTab(client, popupUrl);
        await waitFor(
            () => control.evaluate('Boolean(globalThis.chrome?.storage)'),
            ready => ready,
        );
        const setSettings = backgroundPlayback =>
            control.evaluate(
                `chrome.storage.sync.set({ settings: { backgroundPlayback: ${backgroundPlayback}, autoNext: true } })`,
            );
        // Switching tabs inside one window, exactly like a user clicking another tab.
        const hideReels = () =>
            control.evaluate(`chrome.tabs.getCurrent().then(tab => chrome.tabs.update(tab.id, { active: true }))`);
        const showReels = () =>
            control.evaluate(`(async () => {
                const [tab] = await chrome.tabs.query({ url: 'https://www.facebook.com/*' });
                await chrome.tabs.update(tab.id, { active: true });
            })()`);

        // Records which tab or window changes while the Reels tab should stay hidden. Printed if that check fails.
        await control.evaluate(`(() => {
            globalThis.__tabEvents = [];
            const log = (event, detail) => __tabEvents.push({ at: Date.now(), event, detail });
            chrome.tabs.onActivated.addListener(info => log('tab-activated', info.tabId));
            chrome.windows.onFocusChanged.addListener(id => log('window-focus', id));
        })()`);

        // ---- Run 1: background playback on ----
        await setSettings(true);
        const reels = await openTab(client);
        await serveFixture(client, reels);
        await reels.send('Page.navigate', { url: 'https://www.facebook.com/reel/1001' });
        const readReels = () => reels.evaluate(PAGE_STATE);

        let state = await waitFor(readReels, s => s.paused === false);
        check('Reel starts playing on the Reels page', state.paused === false, `reel ${state.id}`);

        await reels.click('[aria-label="Unmute"]'); // trusted click = user activation
        state = await waitFor(readReels, s => s.muted === false);
        check('Sound is on after the user clicks Unmute', state.muted === false);

        await hideReels();
        state = await waitFor(readReels, s => s.realVisibility === 'hidden');
        check('Facebook tab is really in the background', state.realVisibility === 'hidden', state.realVisibility);
        check('Playback continues in the background tab', state.paused === false, `reel ${state.id}`);

        // Fixture Reels are 3 s long. Watch ~12 s while the tab stays hidden.
        const visited = [state.id];
        let alwaysHidden = true;
        const visibilityChanges = [];
        let lastVisibility = state.realVisibility;
        const loopStart = Date.now();
        for (let i = 0; i < 48; i++) {
            await sleep(250);
            const now = await readReels();
            alwaysHidden &&= now.realVisibility === 'hidden';
            if (now.realVisibility !== lastVisibility) {
                visibilityChanges.push(`${Date.now() - loopStart}ms ${lastVisibility} -> ${now.realVisibility}`);
                lastVisibility = now.realVisibility;
            }
            if (visited.at(-1) !== now.id) visited.push(now.id);
        }
        state = await readReels();
        check('Tab stayed hidden for the whole run', alwaysHidden, visibilityChanges.join(', '));
        if (!alwaysHidden) {
            // Evidence only: it must never hide the failure it explains. Tabs without host access have no url.
            try {
                const events = await control.evaluate('__tabEvents');
                const tabs = await control.evaluate(
                    `chrome.tabs.query({}).then(all => all.map(t => ({ id: t.id, active: t.active, windowId: t.windowId, url: (t.url ?? '').slice(0, 50) })))`,
                );
                console.log(
                    '  loop started at 0ms; events:',
                    JSON.stringify(events.map(e => ({ ...e, at: e.at - loopStart }))),
                );
                console.log('  tabs now:', JSON.stringify(tabs));
            } catch (error) {
                console.log('  could not read tab events:', error.message);
            }
        }

        check(
            'Auto next moved through every Reel while hidden',
            visited.join(',') === '1001,1002,1003,1004',
            visited.join(' → '),
        );
        check(
            'Last Reel is playing with sound in the background',
            state.paused === false && state.muted === false,
            JSON.stringify(state),
        );
        check('Only one video plays at a time', state.playing === 1, `${state.playing} playing`);

        // Popup, reloaded so it connects to the now-open Facebook tab.
        await control.send('Emulation.setDeviceMetricsOverride', {
            width: 360,
            height: 640,
            deviceScaleFactor: 2,
            mobile: false,
        });
        await control.send('Page.reload');
        await sleep(1500);
        const popupText = await control.evaluate('document.body.innerText');
        check(
            'Popup shows live status of the background tab',
            /playing|next reel/i.test(popupText) && /in background/i.test(popupText),
        );
        const shot = await control.send('Page.captureScreenshot', { format: 'png' });
        await writeFile(join(screenshotDir, 'popup.png'), Buffer.from(shot.data, 'base64'));
        await control.send('Emulation.setEmulatedMedia', {
            features: [{ name: 'prefers-color-scheme', value: 'dark' }],
        });
        await control.send('Page.reload');
        await sleep(1500);
        const darkShot = await control.send('Page.captureScreenshot', { format: 'png' });
        await writeFile(join(screenshotDir, 'popup-dark.png'), Buffer.from(darkShot.data, 'base64'));
        await control.send('Emulation.setEmulatedMedia', { features: [] });
        await control.send('Page.reload');
        await sleep(1500);

        // The last fixture Reel has no "next", so an auto next attempt may still be running; wait for it.
        await waitFor(
            () =>
                control.evaluate(
                    `Boolean(document.querySelector('button[aria-label="Previous Reel"]:not(:disabled)'))`,
                ),
            enabled => enabled,
        );
        await control.click('button[aria-label="Previous Reel"]');
        state = await waitFor(readReels, s => s.id === '1003' && s.paused === false);
        check(
            'Popup "Previous" moves back and plays while the tab is hidden',
            state.id === '1003' && state.paused === false,
            `now ${state.id}`,
        );

        await showReels();
        await sleep(1500);
        state = await readReels();
        check(
            'Back in the tab: still playing, one video, in sync with the URL',
            state.realVisibility === 'visible' && state.paused === false && state.playing === 1,
            JSON.stringify(state),
        );

        // ---- Mini player (Document Picture-in-Picture) ----
        const MINI_STATE = `(() => {
            const pip = documentPictureInPicture.window;
            const video = pip?.document.querySelector('video');
            return {
                open: Boolean(pip),
                id: location.pathname.split('/')[2],
                inMiniPlayer: video?.closest('[data-video-id]') === null && Boolean(video),
                miniVideoSrc: video ? video.currentSrc.split('/').pop() : null,
                paused: video ? video.paused : null,
                muted: video ? video.muted : null,
                playing: [...document.querySelectorAll('video')].filter(v => !v.paused).length + (video && !video.paused ? 1 : 0),
            };
        })()`;
        const readMini = () => reels.evaluate(MINI_STATE);
        const reelFile = id => `reel-${Number(id) - 1000}.mp4`;

        // Back to the first Reel, then open the mini player with a real click on the page's button.
        await reels.evaluate(`history.replaceState({}, '', '/reel/1001')`);
        await reels.send('Page.reload');
        await waitFor(readReels, s => s.paused === false);
        await reels.click('[aria-label="Unmute"]');
        const launcher = await reels.evaluate(`(() => {
            const host = document.querySelector('reeldock-launcher').getBoundingClientRect();
            const next = document.querySelector('[aria-label="Next Card"]').getBoundingClientRect();
            return {
                x: host.left + host.width / 2,
                y: host.top + host.height / 2,
                gap: host.top - next.bottom,
                dx: host.left + host.width / 2 - (next.left + next.width / 2),
            };
        })()`);
        check(
            'Mini player button sits right under the next button',
            Math.abs(launcher.gap - 16) <= 1 && Math.abs(launcher.dx) <= 1,
            JSON.stringify(launcher),
        );
        await reels.clickAt(launcher.x, launcher.y);
        let mini = await waitFor(readMini, m => m.open && m.paused === false);
        check(
            'Mini player opens from the page button and plays the Reel',
            mini.open && mini.inMiniPlayer && mini.paused === false,
            JSON.stringify(mini),
        );
        check(
            'Mini player shows the current Reel',
            mini.miniVideoSrc === reelFile(mini.id),
            `${mini.id} / ${mini.miniVideoSrc}`,
        );

        const pipTarget = await waitFor(
            async () =>
                (await client.send('Target.getTargets')).targetInfos.find(
                    t => t.type === 'page' && t.openerId === reels.targetId && t.url === 'about:blank',
                ),
            target => Boolean(target),
        );
        const pip = await client.attach(pipTarget.targetId);
        await pip.send('Runtime.enable');

        await pip.wheel(180, 320, 150);
        mini = await waitFor(readMini, m => m.id === '1002' && m.paused === false);
        check(
            'Mouse wheel in the mini player goes to the next Reel',
            mini.id === '1002' && mini.miniVideoSrc === reelFile('1002') && mini.paused === false,
            JSON.stringify(mini),
        );
        check('Sound stays on in the mini player', mini.muted === false);

        // One click right after a Reel change must pause (it took two clicks before the fix).
        await pip.clickAt(120, 300);
        await sleep(1800);
        mini = await readMini();
        check('One click pauses the mini player right after a Reel change', mini.paused === true, JSON.stringify(mini));
        await pip.clickAt(120, 300);
        mini = await waitFor(readMini, m => m.paused === false, 3000);
        check('Another click plays again', mini.paused === false);

        await sleep(800); // wheel cooldown, like a real user pausing between swipes
        await pip.drag(180, 200, 420); // drag down = previous Reel
        mini = await waitFor(readMini, m => m.id === '1001' && m.paused === false);
        check(
            'Dragging down goes to the previous Reel',
            mini.id === '1001' && mini.miniVideoSrc === reelFile('1001') && mini.paused === false,
            JSON.stringify(mini),
        );

        await pip.drag(180, 420, 200); // drag up = next Reel
        mini = await waitFor(readMini, m => m.id === '1002' && m.paused === false);
        check('Dragging up goes to the next Reel', mini.id === '1002' && mini.paused === false, JSON.stringify(mini));

        // Mute with the M key, change Reel: the next one must stay muted (Facebook's state was changed).
        await pip.press('m', 'KeyM');
        await sleep(300);
        await pip.press('ArrowUp', 'ArrowUp');
        mini = await waitFor(readMini, m => m.id === '1001' && m.paused === false);
        await sleep(600);
        mini = await readMini();
        check(
            'Muting in the mini player carries over to the next Reel',
            mini.id === '1001' && mini.muted === true,
            JSON.stringify(mini),
        );

        // Unmute, change Reel: the next one must have sound (the Windows bug: it came back muted).
        await pip.press('m', 'KeyM');
        await sleep(300);
        await pip.press('ArrowDown', 'ArrowDown');
        mini = await waitFor(readMini, m => m.id === '1002' && m.paused === false);
        await sleep(600);
        mini = await readMini();
        check(
            'Unmuting in the mini player carries over to the next Reel',
            mini.id === '1002' && mini.muted === false,
            JSON.stringify(mini),
        );

        // Arrow keys skip 10 seconds; skipping past the end of a 3 s Reel ends it and auto next moves on.
        await pip.press('ArrowLeft', 'ArrowLeft');
        const rewound = await reels.evaluate(
            'documentPictureInPicture.window.document.querySelector("video").currentTime',
        );
        check('Left arrow skips back to the start', rewound < 0.5, `t=${rewound}`);
        await pip.press('ArrowRight', 'ArrowRight');
        mini = await waitFor(readMini, m => m.id === '1003' && m.paused === false, 5000);
        check('Right arrow skips forward; at the end auto next moves on', mini.id === '1003', JSON.stringify(mini));
        await pip.press('ArrowUp', 'ArrowUp');
        mini = await waitFor(readMini, m => m.id === '1002' && m.paused === false);

        await hideReels();
        mini = await waitFor(readMini, m => m.id === '1003' && m.paused === false, 8000);
        check(
            'Auto next continues inside the mini player while the Facebook tab is hidden',
            mini.id === '1003' && mini.inMiniPlayer && mini.paused === false,
            JSON.stringify(mini),
        );
        check('Only the mini player video plays', mini.playing === 1, `${mini.playing} playing`);

        const miniShot = await pip.send('Page.captureScreenshot', { format: 'png' });
        await writeFile(join(screenshotDir, 'mini-player.png'), Buffer.from(miniShot.data, 'base64'));

        await reels.evaluate('documentPictureInPicture.window.close()');
        await sleep(800);
        state = await readReels();
        const back = await reels.evaluate(`(() => {
            const id = location.pathname.split('/')[2];
            const video = document.querySelector('[data-video-id="' + id + '"] video');
            return { inCard: Boolean(video), file: video?.currentSrc.split('/').pop(), paused: video?.paused };
        })()`);
        check(
            'Closing the mini player returns the video to its Reel card and keeps playing',
            back.inCard && back.file === reelFile(state.id) && back.paused === false,
            JSON.stringify(back),
        );
        await showReels();

        // ---- Run 2 (control): background playback off ----
        await setSettings(false);
        await sleep(300);
        await hideReels();
        state = await waitFor(readReels, s => s.paused === true, 3000);
        check(
            'Control: with background playback off, the page pauses when hidden',
            state.realVisibility === 'hidden' && state.paused === true,
        );

        // ---- YouTube Shorts ----
        await showReels();
        await client.send('Target.closeTarget', { targetId: reels.targetId });
        await runYoutubeChecks({ client, control, setSettings, hideTab: hideReels });
    } finally {
        await stop();
    }

    const failed = results.filter(result => !result.passed).length;
    console.log(`\n${results.length - failed}/${results.length} checks passed`);
    process.exitCode = failed === 0 ? 0 : 1;
}

await main();
