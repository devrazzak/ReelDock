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

**Name:** ReelDock – Auto Scroll Reels & Shorts, Mini Player (toolbar short name: ReelDock)

**Summary (max 132 characters):**
Auto scroll Facebook Reels, YouTube Shorts and Instagram Reels, play in the background, and watch in a floating mini player.

**Category:** Entertainment

**Search wording rules:** the summary and description carry the search terms people use ("Facebook Reels auto
scroll", "YouTube Shorts", "Instagram Reels", "mini player", "background play"). Only name platforms that are
supported: add TikTok or others to the text only in the release that supports them (misleading metadata
is rejected). Write keywords into sentences; a keyword list at the end counts as keyword spam.

**Description:**

```
ReelDock auto scrolls Facebook Reels, YouTube Shorts and Instagram Reels and keeps them playing while you work.

• Background playback – switch to any other tab and the video keeps playing.
• Auto next – when a video ends, the next one starts by itself, even in the background.
• Mini player – a floating, always-on-top window you can move and resize anywhere on your screen.
  Scroll, drag, or use the arrow keys to go to the next or previous video, and skip 10 seconds back or forward.
• Popup controls – play/pause, previous, next, and live status.
• Keyboard shortcuts – play/pause, next video, and toggles (customisable in chrome://extensions/shortcuts).

How to start: open Reels or Shorts on facebook.com, youtube.com or instagram.com and click the video once (and Unmute for sound). Chrome only allows
sound after you interact with a page, so this first click is required.

Privacy: no data leaves your browser. No accounts, no analytics, no tracking.
Open source: every line of code is on GitHub at https://github.com/devrazzak/reeldock
The extension only runs on facebook.com, youtube.com and instagram.com and stores your two on/off settings.

This extension is not affiliated with, endorsed by, or sponsored by Meta Platforms, Inc. or Google LLC.
"Facebook" and "Instagram" are trademarks of Meta Platforms, Inc.; "YouTube" is a trademark of Google LLC.
```

**Images (ready in `store-assets/final/`):**

| Store field (upload in this order) | File                                                       |
| ---------------------------------- | ---------------------------------------------------------- |
| Screenshot 1                       | `screenshot-1.png`: background playback                    |
| Screenshot 2                       | `screenshot-6.png`: real Facebook page, mini player button |
| Screenshot 3                       | `screenshot-7.png`: real YouTube Shorts page               |
| Screenshot 4                       | `screenshot-8.png`: real Instagram Reels page              |
| Screenshot 5                       | `screenshot-2.png`: the mini player                        |
| Small promo tile (440×280)         | `promo-tile-440x280.png`: screenshot 1 laid out at 440×280 |
| Store icon (128×128)               | `public/icons/icon-128.png`                                |

The Store takes at most 5 screenshots. `screenshot-3.png` (popup), `screenshot-4.png` (where the button is) and
`screenshot-5.png` (three sites together) are kept for later use; screenshots 6–8 cover every site and its button.
`screenshot-1.png` and the tile still show the v1.0 popup ("Connected to Facebook Reels", v1.0.0); refresh them in a later release.

They show our own demo videos (`store-assets/demo`), never real Facebook, YouTube or Instagram content. Screenshot 5 uses the real pages from our browser (`store-assets/real/`) with the video replaced by our demo Reel and personal details removed; the logos are the unmodified official SVGs (`public/site-icons`, `store-assets/logos`). To regenerate after a UI
change: `CHROME_PATH=<Chrome for Testing> pnpm store:screenshots`, then render each image from
`store-assets/compose.html?shot=1|2|3|4|5|6|7|8|tile` at its size, e.g.
`google-chrome --headless=new --window-size=1280,800 --screenshot=store-assets/final/screenshot-1.png "file://$PWD/store-assets/compose.html?shot=1"`.

## Privacy practices tab

**Single purpose:**
Lets users keep watching short videos (Facebook Reels, YouTube Shorts, Instagram Reels) while using other tabs or
apps: background playback, automatic next video, and a floating mini player.

**Permission justification:**

| Permission                                                                           | Justification                                                                                                                                                                             |
| ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `storage`                                                                            | Saves the user's two settings (background playback, auto next) and syncs them across their Chrome profile.                                                                                |
| Host: `www.facebook.com`, `web.facebook.com`, `www.youtube.com`, `www.instagram.com` | The content script must run on these sites to detect when a Reel or Short ends, move to the next one with the site's own navigation, and show the mini player. No other site is accessed. |

**Remote code:** No. All code is bundled in the package.

**Data usage:** Collects none of the listed data types. Tick the three certifications (no selling, no
unrelated use, no creditworthiness use).

**Privacy policy URL:** https://github.com/devrazzak/reeldock/blob/main/docs/privacy-policy.md
(public repository; GitHub renders the Markdown).

**Support / homepage URL:** https://github.com/devrazzak/reeldock

## Review notes (optional field)

```
To test: open https://www.facebook.com/reel/, https://www.youtube.com/shorts or https://www.instagram.com/reels/,
click the video and unmute it. Switch to another tab: playback continues and the next video starts when one ends.
Click the ⧉ button under the up/down arrows on the right to open the floating player.
```
