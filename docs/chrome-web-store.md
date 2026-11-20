# Chrome Web Store submission

Everything the developer dashboard asks for, ready to paste. Run `pnpm package` to create
`release/reels-background-player-<version>.zip`, then upload it at
https://chrome.google.com/webstore/devconsole (one-time US$5 developer registration).

## Before each release

1. Bump `version` in `package.json` (the manifest reads it). The store rejects a version it has seen.
2. `pnpm typecheck && pnpm test && pnpm test:e2e`
3. `pnpm package`
4. Load `dist` unpacked once on macOS and on Windows and run the manual checklist in the README.

## Store listing

**Name:** Reels Background Player

**Summary (max 132 characters):**
Keep Facebook Reels playing in the background, auto-play the next Reel, and watch in a floating mini player.

**Category:** Entertainment

**Description:**

```
Watch Facebook Reels while you work.

• Background playback – switch to any other tab and the Reel keeps playing.
• Auto next – when a Reel ends, the next one starts by itself, even in the background.
• Mini player – a floating, always-on-top window you can move and resize anywhere on your screen.
  Scroll, drag, or use the arrow keys to go to the next or previous Reel.
• Popup controls – play/pause, previous, next, and live status.
• Keyboard shortcuts – play/pause, next Reel, and toggles (customisable in chrome://extensions/shortcuts).

How to start: open a Reel on facebook.com and click it once (and Unmute for sound). Chrome only allows
sound after you interact with a page, so this first click is required.

Privacy: no data leaves your browser. No accounts, no analytics, no tracking.
The extension only runs on facebook.com and stores your two on/off settings.

This extension is not affiliated with, endorsed by, or sponsored by Meta Platforms, Inc.
"Facebook" is a trademark of Meta Platforms, Inc.
```

**Screenshots** (1280×800 or 640×400, at least one): the popup next to a Reel, the mini player floating
over another app, and the "Mini player" button on the Reels page.

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

**Privacy policy URL:** not required when no user data is collected, but recommended. Publish
`docs/privacy-policy.md` (e.g. as a GitHub Pages page or a public Gist) and paste its URL.

## Review notes (optional field)

```
To test: open https://www.facebook.com/reel/ while signed in, click the Reel and Unmute.
Switch to another tab: playback continues and the next Reel starts when one ends.
Click "Mini player" at the bottom right of the Reel to open the floating player.
```
