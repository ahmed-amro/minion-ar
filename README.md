# Bello AR — v0.6: voice commands + textured 3D appearance

This is a drop-in update for your existing `minion-ar` GitHub Pages repository. It preserves the functioning v0.5 WebXR placement, touch interactions, 6–24 cm resizing, relocation, sounds, and autonomous chair/magazine routine.

## New in v0.6

- **🎙 Talk (push-to-talk):** Tap once and say a short English voice command, then Bello performs it. The mic only listens after you press the button; it is not a persistent AI listener. Some Android WebXR sessions may refuse simultaneous mic use, so test preview first.
- **Supported voice commands** (you may say *Bello* first, or not): `dance`, `jump`, `wave`, `spin`, `giggle` / `laugh`, `peekaboo`, `read your magazine`, `take a break`, `wake up`, `stop`, `bigger`, `smaller`, `move`, `mute`, `sound on`.
- **Spoken reply option:** Short synthesized English replies using the device's text-to-speech voices. Toggle **🗣 Replies: On/Off** in **⋯**. The existing original cartoon chirps can be muted separately.
- **Fallback controls:** Under **⋯**, buttons for Dance / Jump / Wave / Read / Wake if the microphone fails in immersive AR.
- **Test voice in preview:** Before starting AR, use the `🎙 Test voice in preview` button. Try *Bello, dance!* to confirm speech recognition on your phone first.
- **Improved surface appearance:** Textured denim weave, matte yellow skin grain, brushed metallic goggles, slightly rough gloves/boots, wood-grain chair, extra clothing stitching, goggle rivets, glove fingers, and shoe soles. All materials/textures are generated in JavaScript on the device with small 256×256 canvases. No external 3D files, asset downloads, or image licenses.

## Deploy via GitHub Pages

1. Extract the ZIP.
2. Open `https://github.com/ahmed-amro/minion-ar` → **Code** → **Add file** → **Upload files**.
3. Replace `index.html`, `app.js`, `style.css` in the repo root, then **Commit changes**. Keep the existing `.nojekyll` and README if you wish.
4. Wait for **Actions** → successful Pages deployment.
5. Open `https://ahmed-amro.github.io/minion-ar/` in Chrome, and check that the top says **PROTOTYPE 0.6**. Reload if an old version is cached.

## Phone test

1. In 3D preview, tap **🎙 Test voice in preview** and allow the microphone. Say **“Bello, dance!”**. The status should display the recognized phrase and Bello should dance.
2. Press **Start AR**, place Bello on a flat surface, then press **🎙 Talk** and say **“Bello, jump!”**. The spoken reply uses your device's speech engine if enabled.
3. Try **“Bello, read your magazine!”**, then **“Bello, wake up!”**.
4. Check that the normal tapping, **Move Bello**, **− / +**, **⋯ → Play**, **Auto: On**, and **sound toggle** still work.
5. If the microphone does not work during immersive AR, first check whether it works in **3D preview**. Then use the command buttons in **⋯** as a fallback, and report the error toast / screenshot.

## Important limitations

- **Voice commands are not conversational AI**. This milestone uses command matching and the browser's built-in speech recognition and speech synthesis. Natural, open-ended conversation will be a later milestone with an AI backend/API.
- **Speech recognition is browser-dependent.** Chrome on Android commonly provides `webkitSpeechRecognition`, but it may be unavailable or fail while WebXR is active. This app disables the mic button if no recognition API exists and offers manual alternatives.
- **Speech privacy:** this project does not record, save, or send audio to our server. However, browser speech recognition on Android may use a remote speech service; microphone input may be processed by the browser/provider. GitHub Pages hosts only static files.
- **The new textures are a visually richer procedural 3D model, not a film-quality rigged GLB character.** The next art step would be replacing the procedural mesh with an original custom textured/rigged GLB model, while keeping the AR and voice code.
- The idle timer measures interaction with the app, **not** whether you actually look at Bello. Desk-edge avoidance remains unimplemented.

## Implementation

Three.js 0.160 via CDN with a strict import map; `immersive-ar`, `hit-test`, optional `dom-overlay`, `local` reference space; local CanvasTextures and WebAudio; Web Speech API for push-to-talk; SpeechSynthesis for short voice replies. No Python, billing, API keys, authentication, or backend required.
