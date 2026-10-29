# Bello — tiny AR companion, prototype 0.3

A tiny, playful, yellow, original cartoon character in your physical room, using Three.js and WebXR. No API key, backend, or AI required yet.

## What's new in v0.3

- **Mug-sized Bello**: defaults to 12 cm tall in AR (previously ~84 cm).
- **Move Bello**: once placed, tap **Move Bello**, aim the white ring at a new location, then tap the real-world view to place him again. **Cancel Move** restores the old placement.
- **Adjust his height**: use the − and + buttons (6–24 cm, in 2 cm steps).
- **Compact AR toolbar** so Bello does not get covered by a large instruction card.
- Tap the AR view once placed for random waves, dancing, jumping, or spinning.

## Update an existing GitHub Pages site

1. Extract the ZIP file onto your computer.
2. Open the GitHub repository Code page. Choose **Add file → Upload files**.
3. Upload the **three updated files**: `index.html`, `app.js`, `style.css` **to the repository root**. Confirm that they replace the existing versions.
4. Commit changes to `main` and wait for GitHub Actions' Pages deployment to turn green.
5. On Android Chrome, reopen `https://YOUR-USERNAME.github.io/minion-ar/` and verify it says **PROTOTYPE 0.3**. If you still see 0.2, refresh the page or close and reopen the tab.

## How to use

1. Tap **Start AR** and scan a well-lit textured surface (desktop, coffee table, floor).
2. Tap the **white circle** to place Bello. His height is ~12 cm.
3. Tap anywhere in the camera view to trigger an animation.
4. Tap **Move Bello**, point at a different surface, and tap the new white circle to relocate him. You can cancel moving without losing the old position.
5. Adjust height with − / +. Tap **Exit AR** to go back to the 3D preview.

## Files

- `index.html`: UI & Three.js module import.
- `style.css`: responsive dark interface, compact AR toolbar.
- `app.js`: procedural character, WebXR hit testing, movement and reaction controls.
- `.nojekyll`: static GitHub Pages support.

## Notes

- AR uses the `local` reference space; `local-floor` wasn't supported by the tested phone/browser session.
- After initial placement, tapping the **camera view** triggers a random reaction; the **Move Bello** button starts re-placement mode.
- The estimated 12 cm height comes from the character's procedural geometry, not a measurement sensor; phone tracking can vary.
- The camera view is processed by the phone's AR system. Our application has no backend, doesn't store camera images, and doesn't call an AI service.
- Scene understanding may fail on featureless or dark surfaces. AR location is session-local and resets when you exit AR.
