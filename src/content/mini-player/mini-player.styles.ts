/** Styles for the mini player window. Plain CSS: the Picture-in-Picture document has no Tailwind. */
export const MINI_PLAYER_CSS = `
* { box-sizing: border-box; }
html, body { margin: 0; height: 100%; background: #000; overflow: hidden; font-family: system-ui, sans-serif; }

.player { position: fixed; inset: 0; user-select: none; touch-action: none; cursor: grab; }
.player.dragging { cursor: grabbing; }
.player[data-navigation='off'] { cursor: default; }

.stage { position: absolute; inset: 0; transition: transform 220ms ease, opacity 220ms ease; }
/* !important: players such as YouTube keep rewriting the video's inline style (size, position, scale), also here. */
.stage video {
    position: static !important; width: 100% !important; height: 100% !important; max-width: none !important;
    margin: 0 !important; transform: none !important; object-fit: contain !important; display: block !important;
    background: #000;
}
.dragging .stage { transition: none; }
.stage.leave-next { transform: translateY(-14%); opacity: 0; }
.stage.leave-previous { transform: translateY(14%); opacity: 0; }
.stage.enter-next { transform: translateY(14%); opacity: 0; transition: none; }
.stage.enter-previous { transform: translateY(-14%); opacity: 0; transition: none; }

.spinner {
    position: absolute; top: 50%; left: 50%; width: 36px; height: 36px; margin: -18px 0 0 -18px;
    border: 3px solid rgb(255 255 255 / 0.25); border-top-color: #fff; border-radius: 50%;
    animation: spin 800ms linear infinite; display: none; pointer-events: none;
}
.player.busy .spinner, .player.buffering .spinner { display: block; }
@keyframes spin { to { transform: rotate(360deg); } }

.paused-icon {
    position: absolute; top: 50%; left: 50%; width: 64px; height: 64px; margin: -32px 0 0 -32px;
    border-radius: 50%; background: rgb(0 0 0 / 0.5); color: #fff;
    display: none; place-items: center; pointer-events: none;
}
.paused-icon svg { width: 32px; height: 32px; }
.player.paused:not(.busy):not(:hover) .paused-icon { display: grid; }

.controls { position: absolute; display: flex; gap: 10px; opacity: 0; transition: opacity 150ms ease; }
.controls.side { right: 10px; top: 50%; transform: translateY(-50%); flex-direction: column; }
.controls.bottom { left: 50%; bottom: 18px; transform: translateX(-50%); align-items: center; gap: 16px; }
.player:hover .controls, .controls:focus-within { opacity: 1; }

button {
    width: 40px; height: 40px; border: 0; border-radius: 50%; padding: 0; cursor: pointer;
    background: rgb(0 0 0 / 0.55); color: #fff; display: grid; place-items: center;
}
button:hover { background: rgb(0 0 0 / 0.8); }
button:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
svg { width: 22px; height: 22px; fill: currentColor; }
button.large { width: 52px; height: 52px; }
button.large svg { width: 28px; height: 28px; }

.progress { position: absolute; left: 0; right: 0; bottom: 0; height: 3px; background: rgb(255 255 255 / 0.25); }
.progress-bar { height: 100%; width: 0; background: #fff; }
`;
