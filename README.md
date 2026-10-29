# Bello — tiny AR desk companion, prototype 0.4

This builds on the **working v0.3 WebXR/Three.js prototype**, keeping **Move Bello** and the 6–24 cm resizing controls.

## New: tiny autonomous desk life

- Bello stands still at his anchored position while you are tapping the AR scene or using the controls.
- After **30 seconds without a tap/control interaction**, Bello gets bored: shuffles on the spot, fetches a tiny chair, sits down, and reads a magazine.
- Bello keeps quietly reading until you tap the AR view, move him, resize him, or press **Wake Bello**.
- **Try a break** demonstrates the routine immediately without waiting 30 seconds. The button becomes **Wake Bello** while the routine plays.
- **Auto: On / Off** controls whether idle activities start automatically. Off does not disable the manual **Try a break** button.
- Props are 3D and follow Bello's position and size. None of this needs a backend, microphone, AI API, or special assets.

## How to update GitHub Pages

1. Unzip the project.
2. In the repository root on GitHub, use **Add file → Upload files**.
3. Upload/replace **`index.html`, `app.js`, `style.css`**. The `.nojekyll` file is unchanged.
4. Commit to `main`, wait for the Pages deployment green checkmark, and reload on your phone. The heading should say **PROTOTYPE 0.4**.
5. Start AR, place Bello, and press **Try a break ☕**. Check the chair and magazine animation.

## Important limits

- This is a **time-since-last-interaction** approximation of attention, not eye tracking or recognition of whether someone is looking at Bello.
- To avoid wandering off the edge of a table, he only shuffles **in place** for now. We do not have a reliable map of table edges or obstacles.
- Props are cartoon animations, not real-world physics, and the chair and magazine do not interact with physical surfaces.
- The AR camera frames are processed locally by the phone's AR system. This static app does not transmit or store camera frames and has no server/API integrations.
- Browser/XR behavior still needs a hands-on phone test. We validate JavaScript syntax and package structure here, not the full AR runtime.
