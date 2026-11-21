# Chrome Web Store submission

Everything the developer dashboard asks for, ready to paste. Run `pnpm package` to create
`release/reeldock-<version>.zip`, then upload it at
https://chrome.google.com/webstore/devconsole (one-time US$5 developer registration).

## Before each release

1. Bump `version` in `package.json` (the manifest reads it). The store rejects a version it has seen.
2. `pnpm typecheck && pnpm test && pnpm test:e2e`
3. `pnpm package`
4. Load `dist` unpacked once on macOS and on Windows and run the manual checklist in the README.

## Store listing

**Name:** ReelDock – Facebook Reels Auto Scroll & Mini Player (toolbar short name: ReelDock)

**Summary (max 132 characters):**
Auto scroll Facebook Reels, keep them playing in the background, and watch in a floating mini player you can scroll.

**Category:** Entertainment

**Search wording rules:** the name and summary carry the search terms people use ("Facebook Reels auto
scroll", "mini player", "background play"). Only name platforms that are supported: add Instagram,
YouTube Shorts or TikTok to the name and text only in the release that supports them (misleading metadata
is rejected). Write keywords into sentences; a keyword list at the end counts as keyword spam.

**Description:**

```
ReelDock auto scrolls Facebook Reels and keeps them playing while you work.

• Background playback – switch to any other tab and the Reel keeps playing.
• Auto next – when a Reel ends, the next one starts by itself, even in the background.
• Mini player – a floating, always-on-top window you can move and resize anywhere on your screen.
  Scroll, drag, or use the arrow keys to go to the next or previous Reel, and skip 10 seconds back or forward.
• Popup controls – play/pause, previous, next, and live status.
• Keyboard shortcuts – play/pause, next Reel, and toggles (customisable in chrome://extensions/shortcuts).

How to start: open a Reel on facebook.com and click it once (and Unmute for sound). Chrome only allows
sound after you interact with a page, so this first click is required.

Privacy: no data leaves your browser. No accounts, no analytics, no tracking.
Open source: every line of code is on GitHub at https://github.com/devrazzak/reeldock
The extension only runs on facebook.com and stores your two on/off settings.

This extension is not affiliated with, endorsed by, or sponsored by Meta Platforms, Inc.
"Facebook" is a trademark of Meta Platforms, Inc.
```

**Images (ready in `store-assets/final/`):**

| File                        | Store field                                              |
| --------------------------- | -------------------------------------------------------- |
| `screenshot-1.png`          | Screenshot 1 (1280×800)                                  |
| `screenshot-2.png`          | Screenshot 2 (1280×800)                                  |
| `screenshot-3.png`          | Screenshot 3 (1280×800)                                  |
| `screenshot-4.png`          | Screenshot 4 (1280×800): where the mini player button is |
| `promo-tile-440x280.png`    | Small promo tile (440×280)                               |
| `public/icons/icon-128.png` | Store icon (128×128)                                     |

They show our own demo videos (`store-assets/demo`), never real Facebook content. To regenerate after a UI
change: `CHROME_PATH=<Chrome for Testing> pnpm store:screenshots`, then render each image from
`store-assets/compose.html?shot=1|2|3|4|tile` at its size, e.g.
`google-chrome --headless=new --window-size=1280,800 --screenshot=store-assets/final/screenshot-1.png "file://$PWD/store-assets/compose.html?shot=1"`.

## Privacy practices tab

**Single purpose:**
Lets users keep watching Facebook Reels while using other tabs or apps: background playback, automatic
next Reel, and a floating mini player.

**Permission justification:**

| Permission                                   | Justification                                                                                                                                              |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `storage`                                    | Saves the user's two settings (background playback, auto next) and syncs them across their Chrome profile.                                                 |
| Host: `www.facebook.com`, `web.facebook.com` | The content script must run on Facebook to detect when a Reel ends, press Facebook's own Next button, and show the mini player. No other site is accessed. |

**Remote code:** No. All code is bundled in the package.

**Data usage:** Collects none of the listed data types. Tick the three certifications (no selling, no
unrelated use, no creditworthiness use).

**Privacy policy URL:** https://github.com/devrazzak/reeldock/blob/main/docs/privacy-policy.md
(public repository; GitHub renders the Markdown).

**Support / homepage URL:** https://github.com/devrazzak/reeldock

## Review notes (optional field)

```
To test: open https://www.facebook.com/reel/ while signed in, click the Reel and Unmute.
Switch to another tab: playback continues and the next Reel starts when one ends.
Click the ⧉ button under the up/down arrows on the right to open the floating player.
```
