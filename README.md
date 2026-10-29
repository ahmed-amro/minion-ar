# Bello — AR companion, prototype 0.1

A no-backend, no-API-key, Minion-inspired original cartoon companion. Built with Three.js/WebXR.

## Publish on GitHub Pages

1. Create a **public** repository called `minion-ar` (public needed for GitHub Pages on the free plan).
2. Extract the ZIP on your computer. In the repository, choose **Add file → Upload files**.
3. Upload `index.html`, `app.js`, `style.css`, and `.nojekyll` from the extracted folder **to the repository root** (you can also upload this README if needed). **Do not upload the ZIP itself**.
4. Commit the upload to `main`.
5. Go to **Settings → Pages → Build and deployment**: select **Deploy from a branch**, branch `main`, folder `/(root)`, then Save.
6. Open `https://YOUR-USERNAME.github.io/minion-ar/` on Android Chrome over HTTPS. Publishing may take several minutes.

## What to expect

- Desktop: a rotating, breathing 3D preview of Bello. AR button is disabled where immersive AR is unavailable.
- Supported Android Chrome: press **Start AR**; allow camera; scan a textured, well-lit flat surface; wait for a white ring; tap to place Bello; tap again for a random wave, jump, dance, or spin.
- Press **Exit AR** or the system close control to return to the preview.

## Architecture

- `index.html` — HTML and browser import map.
- `style.css` — visual layout.
- `app.js` — Three.js, a procedural character, WebXR hit testing and animations.
- `.nojekyll` — tells Pages to publish static files without Jekyll processing.

Everything runs in the browser. The camera feed is used locally by the AR runtime; no camera recording is intentionally sent to our own servers. Three.js code is fetched from a CDN. This app does not store anything or contact an AI service.

## Known limitations / next steps

- The first model is intentionally constructed from simple 3D shapes; we can later replace it with an expressive, rigged, animated 3D model.
- Taps anywhere after placement trigger an animation, rather than raycasting only the character.
- AR support varies by phone/browser and depends on camera permission and secure HTTPS hosting.
- Moving between rooms may require restarting AR to re-anchor the character.
- Future: blink, look-at-user, better gestures, speech, conversational AI, personal memory.
