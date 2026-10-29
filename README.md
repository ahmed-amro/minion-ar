# Bello AR — v0.5 · Bring Bello to life

**Builds directly on the working v0.4 desk-life version.** The character, AR placement, 6–24 cm size controls, Move Bello, automatic chair-and-magazine routine, and manual break controls all remain.

## What's new

- **Touch Bello, not the background.** Android WebXR screen taps are raycast against Bello's 3D body; tapping the empty desk no longer launches an animation or wakes him. In ordinary 3D preview, tapping Bello with a mouse/finger works too.
- **6 reactions:** wave, jump, dance, spin, giggle, and peekaboo; selected at random when he is tapped.
- **Expressive face:** Bello blinks and occasionally shifts his gaze. His mouth changes for surprised/giggling reactions. This is an *animation*, not camera eye tracking.
- **Original cartoon sound effects** synthesized locally with Web Audio. No sound assets or copyrighted recordings. **🔊 On / 🔇 Off** toggle included. Chrome may block audio until you explicitly tap a control or interact.
- **Smaller AR overlay:** Place/move and size controls remain on the bottom row. Tap the **⋯** button to expand extra controls: **Play ✨** (manual animation fallback), **Try a break ☕ / Wake Bello**, **Auto: On / Off**, and **Sound On / Off**.
- **Quiet-life behavior still works:** Bello stands and reacts while you engage with him; after 30 seconds of no direct interaction, he gets his chair and reads. **Play** and the reaction tap wake him up immediately. `Auto: Off` disables automatic breaks without removing the manual break demo.

## How to deploy to GitHub Pages

1. Extract the ZIP, then open `https://github.com/ahmed-amro/minion-ar` in your browser.
2. On the **Code** tab, select **Add file → Upload files**.
3. Upload and replace **`index.html`, `app.js`, and `style.css`** in the repository **root**, then commit to `main`. Leave the existing `.nojekyll` in place.
4. In **Actions**, wait for the Pages deployment to show a green checkmark.
5. Open `https://ahmed-amro.github.io/minion-ar/` in Chrome. Confirm **PROTOTYPE 0.5** appears. If not, reload the page or close/reopen its tab.

## Quick phone acceptance test

1. Press **Start AR**, scan a table, tap the white ring, and confirm 12-cm Bello appears.
2. Tap **empty table** away from Bello: no reaction should play.
3. Tap **Bello** himself: he should wave, jump, dance, spin, giggle, or play peekaboo, with a gentle electronic cartoon sound if audio is on.
4. Tap **⋯** then **Play ✨**: a reaction should play even if the Android XR touch ray needs calibration.
5. Turn **🔊 Off** and trigger another reaction: it should be silent. Turn it back on.
6. Try **Move Bello** and the **−/+** controls: check that relocation and 6–24 cm scaling still work.
7. Tap **⋯ → Try a break ☕**: he should bring his chair, sit, and read. Tap Bello to wake him, or press **Wake Bello**.
8. Leave the AR view idle for 30 seconds with **Auto: On** to watch him initiate the routine himself.

## Current limitations

- Attention is based on user taps/control activity, **not** eye tracking, gaze recognition, microphone, or presence detection.
- Desk edges, obstacles, and furniture are not mapped; he stays close to his anchored location instead of walking freely.
- A screen-space touch is converted to a WebXR 3D target ray. Different phone XR runtimes can vary; **Play ✨** is a fallback if direct tapping misses. If that happens, report the phone browser and a screenshot so we can calibrate hit testing.
- Sounds are short **original synthesized tones**, not speech. A voice and AI integration are future roadmap milestones.
- GitHub Pages serves static files over HTTPS; there is no Python backend, API key, voice recording, or camera upload in this version.

## Technical notes

Three.js 0.160 via CDN/import map; WebXR `immersive-ar` with `hit-test` required and DOM overlay optional; `local` reference space. Hit tests are for placement. XR session `select` events provide the `XRInputSource.targetRaySpace` ray for touching the character, independent of the surface reticle. A transparent 3D hit zone is attached to Bello. Web Audio is user-initiated and optional.
