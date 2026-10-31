# Bello Character Lab — v0.8-P1

An independent procedural-character prototype for the Bello AR project. It uses
the supplied v0.6 character as its visual starting point and the reported v0.7.2
states/actions as its future integration contract. It is **not integrated into
v0.7.2**. No root application files, AI backend, credentials or conversation
storage are included or changed.

## Run the preview

1. Extract the ZIP. Keep the complete `character-lab/` directory together.
2. From its parent directory, run:

   ```sh
   python -m http.server 8000
   ```

   Windows also supports `py -m http.server 8000`.

3. Open <http://localhost:8000/character-lab/>. Do not double-click the HTML file:
   JavaScript modules require an HTTP server.

Three.js r160 is included locally. No npm install, CDN, backend, microphone or
API key is required. The preview can run offline once the local server is running.

Use Wave, Dance, Jump, Spin, Giggle, Peek, Read and Wake. Drag the scene to orbit,
scroll to zoom, or tap directly on Bello. The approximate 10 cm preview mug is a
scale reference. Change his height from 6 to 24 cm; the default is 12 cm.

## Test on the phone in AR

Copy **only `character-lab/`** into your existing repository. Do not overwrite
root files. Review the added folder before committing/pushing. Once that folder
is published by your existing GitHub Pages deployment, its address will be:

<https://ahmed-amro.github.io/minion-ar/character-lab/>

That address becomes available only after you publish the folder; this package
has not deployed it. Use Android Chrome on the previously working AR phone.
An ordinary phone connection to a laptop's **HTTP LAN address is insufficient
for WebXR**; use the HTTPS Pages address for this test.

Start AR, scan a textured horizontal surface, then tap the yellow ring. Use Move
to relocate or cancel relocation. Scene taps trigger a reaction only when they
hit Bello's touch target. AR controls provide size changes, the conversation
state selector, Read, Wake, Wave and Exit AR. The larger preview panel exposes
all eight actions. WebXR uses `local` reference space and required `hit-test`,
with optional DOM overlay. The compact control bar depends on overlay support,
as does the existing application's control UI.

## What changed from the visual baseline

- Shared procedural textures with separate grayscale bump data and restrained
  bump strength. Rounded bib/pocket edges and a larger overall shell improve
  separation from the body. The mouth sits above the bib.
- Iris/pupil depth is reduced. Buffered upper/lower eyelids cover the eye instead
  of scaling the eyeball. Directed gaze and a small brow indicate engagement.
- A small generated reflection environment in the lab improves metal highlights.
  Lighting remains synthetic and fixed; it does not estimate the room lighting.
- A soft, transparent contact blob stays beneath Bello and fades during jumps.
  This is an approximation, not a physically cast shadow.
- Reactions have eased entrances/exits and smoothed local transforms. Standing
  breathing is subtle. Hip/knee/ankle pivots and a local boot-floor correction
  improve the procedural sitting/action poses. This is not a skinned skeleton.
- Reading enters/exits over about 1.25 seconds. Props remain present during a
  conversation; the page/activity clocks pause while the gaze turns forward.
- Reading starts after 30 quiet seconds. New autonomous activities, activity
  variety and exploration are deferred to subsequent prototypes.

Speaking animation is a stylized mouth rhythm, not audio-synchronized lip sync.
The character remains recognizable; this is a refinement, not the final original
GLB design. No external character, stock animation or AI-generated asset is used.

## Conversation and interruption rules

The selector simulates `idle`, `listening`, `thinking`, and `speaking`. It sends no
audio or text anywhere. All three active states pause autonomous scheduling and
reading progress, cancel a current short reaction, and smoothly turn attention
forward. Reading remains seated; returning to idle resumes the page clock.

An action requested during an active state is queued. Only the most recent
request is retained. On returning to idle it runs; if seated, Bello stands up
first. Wake exits reading with a transition. It does not end a conversation by
itself. Auto Off stops future automatic reading; it does not prevent explicit
Read or terminate an existing reading session.

The host should skip `update()` while hidden, not placed, relocating or tracking
is unavailable. This lab does so. Delta time is capped at 50 ms to avoid activity
time jumps after suspension. Attention is based on explicit events, not gaze,
face detection, continuous microphone capture or scene understanding.

## Files

| File | Responsibility |
| --- | --- |
| `index.html`, `lab.css`, `lab.js` | Independent UI, preview lighting, reference mug and AR harness |
| `character.js` | Public character API, measured bounds, materials, eyelids and disposal |
| `geometry.js` | Adapted v0.6 procedural geometry and separate chair/magazine builders |
| `animation.js` | Sole owner of animated transforms and expressions |
| `behavior.js` | Pure event/time-driven behavior logic; no DOM or Three.js |
| `vendor/` | Pinned Three.js r160 and its MIT license |
| `tests/` | Dependency-free Node behavior and CPU geometry/lifecycle tests |
| `INTEGRATION.md` | Proposed changes for the main application conversation |
| `TEST_RESULTS.md` | Completed checks, limits and phone test checklist |
| `assets/README.md` | Contract for a future rigged GLB comparison |

## Automated checks

With Node.js 18 or newer:

```sh
cd character-lab
npm test
```

No dependency installation is needed. Tests use the vendored Three.js through a
small Node-only resolver. Canvas calls are stubbed for the CPU tests, so passing
does not validate rendered pixels, WebGL, mobile performance or AR tracking.

## Current limits

- Browser visual and real-device AR acceptance remain pending. See test results.
- Many separate procedural meshes/materials remain. A future GLB should merge
  appropriate parts and use texture atlases. No performance claim is made for
  the target phone before measurement.
- Sitting, grips and eyelids are intentionally lightweight approximations.
- No depth occlusion by real objects, obstacle avoidance, desk-edge detection,
  persistent anchors or real-world navigation is implemented.
- The synthetic environment and shadow suit a first comparison but cannot make
  every room look convincing. Metal highlights can differ from real lighting.
- Current work is static and local: no operating-cost change or AI dependency.
