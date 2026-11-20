# Reels Background Player

A Chrome extension (Manifest V3) that keeps Facebook Reels playing while you work in other tabs,
moves to the next Reel automatically when one finishes, and can show Reels in a floating mini player
(scroll, drag or arrow keys to change Reel). Works in Chrome 116+ on macOS, Windows, Linux and ChromeOS.

- Uses Facebook's own `<video>` elements and its own "Next Card" button. Nothing is downloaded,
  re-streamed, faked or looped.
- Popup built with [`@rax-ds/ui`](https://www.npmjs.com/package/@rax-ds/ui) (React 19, Tailwind CSS v4).
- One permission (`storage`) plus host access to `facebook.com` only. No analytics, no network requests.

## How it works

Findings from inspecting facebook.com (Nov 2026) shaped the design:

| Observation on facebook.com/reel                                                                                                                                           | Consequence                                                                                                         |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Chrome does **not** pause an audible video in a background tab. Facebook does: its player pauses ~3 ms after `visibilitychange` reports `hidden`.                          | A page-world script answers visibility checks with "visible" while background playback is on.                       |
| When a Reel ends, `ended` fires and Facebook replays the same Reel (no `loop` attribute, no auto advance).                                                                 | `ended` is the completion signal. A `loop` fallback exists in case Facebook switches.                               |
| Each Reel card has `data-video-id` equal to the Reel id in the URL (`/reel/<id>`).                                                                                         | The current Reel's video is found by id, not by brittle class names.                                                |
| Navigation buttons are `role="button"` with `aria-label="Next Card"` / `"Previous Card"`.                                                                                  | Navigation clicks Facebook's own button, matched by accessible name.                                                |
| Synthetic `ArrowDown` key events are ignored by Facebook.                                                                                                                  | No keyboard strategy.                                                                                               |
| In a hidden tab, "Next Card" changes the URL but the new video never starts: scroll animation and IntersectionObserver need rendering, which Chrome stops for hidden tabs. | After navigating in a hidden tab, the extension starts the new Reel's video itself, keeping the user's mute/volume. |
| Facebook's own `ended` listener runs after ours and replays the old Reel.                                                                                                  | While managing a hidden tab, any video other than the current Reel's is paused when it starts.                      |
| Facebook keeps its own mute state and applies it to every new Reel; muting only the `<video>` element does not change it.                                                  | Mute / unmute presses Facebook's own Mute button, so the choice persists across Reels.                              |
| Moving Facebook's (MSE-backed) `<video>` into a Document Picture-in-Picture window keeps it playing; moving it back restores Facebook's page.                              | The mini player shows Facebook's own element; nothing is copied or re-streamed.                                     |
| Chrome's autoplay check uses the video's own document. A wheel scroll is not a user activation, so `play()` inside the mini player window can be blocked.                  | Each new Reel is started while still in Facebook's page (which has the user's click), then moved into the window.   |

```text
src/
├── page-world/visibility-guard.iife.ts  MAIN world, document_start: Page Visibility override (toggle via <html> attribute)
├── content/
│   ├── main.iife.ts                     composition root: settings, messaging, status port, mini player wiring
│   ├── session/reel-session.ts          completion → navigate once → verify → hand over playback (page or VideoStage)
│   ├── mini-player/                     Document PiP window (wheel, drag, keys, buttons) + launch button on the page
│   ├── reels/reel-dom.ts                the only file with assumptions about Facebook's markup
│   ├── reels/reel-navigator.ts          ordered strategies: Next Card button, then scroll (visible tab only)
│   ├── reels/reel-route.ts              /reel/<id> parsing
│   └── video/                           active-video fallback, loop-restart detection
├── background/service-worker.ts         keyboard shortcuts only; stateless
├── popup/                               React UI (settings, controls, live status)
└── shared/                              settings schema, typed messages, status model
```

Key decisions:

- **Event driven, no polling.** One capture-phase listener per media event on `document` covers every
  current and future `<video>`, so there are no per-element listeners to leak or duplicate. Facebook's
  `pushState` navigation is observed through the Navigation API. Tabs playing audio are exempt from
  Chrome's intensive timer throttling, so the few timeouts used (navigation verification) stay reliable.
- **Two JS worlds.** The visibility guard must run in Facebook's world to affect its player. The rest
  runs in the isolated content-script world, which keeps its own DOM prototypes and therefore still
  sees the real `document.hidden`. The worlds communicate through one attribute on `<html>`.
- **Navigation lock.** A Reel can report completion several times (`ended`, replay, every loop). Only
  the first completion of a Reel id triggers navigation, and only when no navigation is running. A
  failed navigation is reported and retried the next time the Reel finishes.
- **Mini player as a `VideoStage`.** The session only knows a small interface (`present`, `release`);
  before Facebook changes card the video is given back to its place in the page, and the new Reel's
  video is moved into the window. Failed navigation shows the same Reel again.
- **Service worker holds no state.** Settings live in `chrome.storage.sync`; the popup streams status
  from the content script over a port, so the worker is never woken for status updates.

## Install (development build)

Requirements: Node 22+, pnpm 10+, Chrome 116+.

```bash
pnpm install
pnpm build
```

1. Open `chrome://extensions`, turn on **Developer mode**.
2. **Load unpacked** → select the `dist` folder.
3. Reload any Facebook tab that was already open.

During development `pnpm dev` rebuilds on change (reload the extension in `chrome://extensions` for
content-script changes).

## Use

1. Open a Reel on facebook.com and click it once, then click **Unmute**. Chrome only allows sound after
   you interact with the page; the extension never works around that.
2. Switch to any other tab. The Reel keeps playing and the next Reel starts when it ends.
3. The popup shows playback state, whether the tab is in the background, the current Reel and the last
   auto next, and has Previous / Play-Pause / Next controls.
4. **Mini player:** click **Mini player** at the bottom right of the Reels page. A floating window opens
   on top of every app; move and resize it anywhere. Inside it:

    | Input                              | Action                                            |
    | ---------------------------------- | ------------------------------------------------- |
    | Scroll down / up (wheel, trackpad) | Next / previous Reel                              |
    | Drag up / down                     | Next / previous Reel                              |
    | Click                              | Play / pause                                      |
    | `↓` / `↑`                          | Next / previous Reel                              |
    | `←` / `→`                          | Back / forward 10 seconds, like Facebook's player |
    | `Space`, `M`                       | Play/pause, mute                                  |
    | Buttons on hover                   | Previous, next, mute, ±10 s, play/pause           |

    A spinner shows while a Reel loads. Mute uses Facebook's own Mute button, so the choice carries
    over to the next Reels.

    Auto next keeps working inside it, also while the Facebook tab is in the background. Closing the
    window puts the Reel back into Facebook's page and keeps playing.

| Shortcut      | Action                     |
| ------------- | -------------------------- |
| `Alt+Shift+P` | Play / pause               |
| `Alt+Shift+N` | Next Reel                  |
| `Alt+Shift+A` | Toggle Auto next           |
| `Alt+Shift+B` | Toggle Background playback |

"Skip forward / back 10 seconds" have no default key, because Chrome allows four suggested
shortcuts; assign them at `chrome://extensions/shortcuts`. On macOS `Alt` is `Option`. Change them at
`chrome://extensions/shortcuts`. Shortcuts work while
Chrome is focused (any tab).

## Test

```bash
pnpm test         # unit + integration (Vitest, happy-dom)
pnpm typecheck
pnpm test:e2e     # real Chrome with the extension loaded; needs Chrome for Testing or Chromium
```

- **Integration tests** run `ReelSession` against a fake Reels page that reproduces the verified
  Facebook behaviour, including the replay-after-`ended` that caused a real bug during development.
- **End-to-end** (`tests/e2e`) launches Chrome with the built extension over raw CDP. Playwright is
  deliberately not used: it keeps every page "visible", which hides the behaviour under test.
  facebook.com requests are answered with `tests/e2e/fixture/reels.html`, a page that behaves like
  Facebook's player (pauses on hidden, IntersectionObserver autoplay, replay on end). The Facebook tab
  is sent to the background by activating another tab in the same window. Branded Google Chrome 137+
  ignores `--load-extension`; set `CHROME_PATH` to Chrome for Testing. On Linux CI run it under
  `xvfb-run`.
- **Live check on facebook.com** (`tests/live`): `pnpm build:live` produces a script that runs the same
  production modules in a logged-in Facebook page (paste into DevTools console) and records every
  navigation in `window.__reelsLive`.

## Verification status (21 Nov 2026)

| Check                                                                                                                                                                                                  | Result               |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------- |
| Unit + integration tests (44)                                                                                                                                                                          | Pass                 |
| Typecheck (strict), Prettier                                                                                                                                                                           | Pass                 |
| E2E in Chrome for Testing 153: background playback (tab truly hidden), popup, mini player (open, wheel, drag, auto next while hidden, close, one-click pause, mute carry-over, ±10 s keys) — 27 checks | Pass                 |
| facebook.com, manual probes in a hidden tab: Facebook pauses on hidden; guard prevents it; "Next Card" + hand-over plays 3 Reels in a row                                                              | Verified             |
| facebook.com, production modules (live harness), visible tab: auto next with sound, 6 Reels, never navigated wrongly                                                                                   | Verified             |
| facebook.com, installed extension in Chrome on macOS: background playback and auto next                                                                                                                | Verified by the user |
| facebook.com, mini player prototype (same move-the-video approach) in Chrome on macOS                                                                                                                  | Verified by the user |
| facebook.com, mini player in the installed extension                                                                                                                                                   | **Not yet run**      |
| Windows                                                                                                                                                                                                | **Not yet run**      |

Manual checklist (run on macOS and Windows before publishing):

1. Load `dist`, open a Reel, click Unmute.
2. Switch to another tab and keep working. Sound should continue and change Reel after each ends.
3. After 3–4 Reels open the popup: "In background", "Playing", last auto next "Moved".
4. Switch back: one video playing, the visible card matches the URL.
5. Open the mini player; scroll with the wheel/trackpad, drag, use arrow keys; let a Reel end; switch
   to another app; close the window and check Facebook's page still plays normally.
6. Try `Alt+Shift+N` / `Alt+Shift+P` from another tab; reload Facebook and repeat; restart Chrome.

## Known limitations

- **First interaction is required.** After opening or reloading the Facebook tab you must click the
  Reel (and Unmute for sound) once. Until then Chrome allows only muted playback.
- **Depends on Facebook's markup** in `src/content/reels/reel-dom.ts` (`data-video-id`, "Next Card").
  If Facebook changes it, auto next stops and the popup shows "Facebook may have changed its page".
  The scroll fallback only works while the tab is visible.
- **English accessible names.** Button labels are matched in English. With Facebook in another
  language, add that language's labels to `NAVIGATION_LABELS`.
- **The page believes it is visible** while background playback is on. Facebook may count views or
  preload as if the tab were in front.
- **Returning to the tab** while auto next ran in the background: Facebook catches up its scroll
  position when rendering resumes. In testing it stayed in sync; if it ever shows a different card than
  the one playing, click Next once.
- **Sleep and occlusion.** A sleeping Mac stops all playback. Chrome may discard a background tab under
  memory pressure (tabs playing audio are protected, paused ones are not).
- **Mini player needs a click on the page.** Chrome only opens a Picture-in-Picture window from a user
  gesture inside the page, so the popup and keyboard shortcuts cannot open it. Chrome 116+ only.
- **macOS full-screen apps.** Chrome's Picture-in-Picture windows (video PiP too) do not appear over
  apps in macOS full screen, which run in their own Space. Use **Window → Fill** or Option-click the green
  button to fill the screen without a new Space; the mini player then stays on top. An extension
  cannot change this.
- **Mini player and Facebook's page.** The video element is moved out of Facebook's page while the
  mini player shows it, so that card looks empty on Facebook until the window is closed.
- Tabs that were open before the extension was installed or reloaded need a reload; the popup offers a
  button for that.

## Troubleshooting

| Symptom                              | Fix                                                                |
| ------------------------------------ | ------------------------------------------------------------------ |
| Popup says "Reload the Facebook tab" | Click **Reload tab** (content script is not in that tab yet).      |
| "Chrome blocked playback"            | Switch to the Facebook tab and click the Reel once.                |
| Plays but no sound                   | Click Facebook's Unmute button on the Reel once.                   |
| Pauses when switching tabs           | Check that **Background playback** is on; reload the Facebook tab. |
| "Could not move to the next Reel"    | Facebook changed its page; see `reel-dom.ts`.                      |

## Privacy

No data leaves the browser. The extension reads only the Reel id from the URL and the state of
Facebook's video elements on facebook.com, stores two booleans in `chrome.storage.sync`, and uses no
remote code.

## Future improvements

- Detect Facebook's UI language and use its labels, or find the Next button by position relative to
  the current card as a second fallback.
- Optional "stop after N Reels" or sleep timer.
- Badge with the playback state, so the popup is not needed for a quick glance.
- Localise the extension's own UI (`_locales`) for the store listing in more languages.

## Publish

`pnpm package` builds `release/reels-background-player-<version>.zip`. Store listing text, permission
justifications and the privacy policy are in [`docs/chrome-web-store.md`](docs/chrome-web-store.md) and
[`docs/privacy-policy.md`](docs/privacy-policy.md).
