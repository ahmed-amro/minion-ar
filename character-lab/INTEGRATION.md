# Proposed integration contract — review after phone testing

Main application baseline reported by the user: **v0.7.2**. This package has not
inspected or modified its source. The uploaded v0.6 ZIP supplied the geometry.
The following is an integration proposal, not a patch or a drop-in replacement.

## API

```js
import { createCharacter } from './character-lab/character.js';

const bello = createCharacter({ idleDelay: 30 });
scene.add(bello.root);
bello.root.scale.setScalar((heightCm / 100) / bello.standingHeight);

bello.update(deltaSeconds);                // once per active render frame
bello.setConversationState('listening');    // idle/listening/thinking/speaking
bello.triggerAction('wave');               // wave/dance/jump/spin/giggle/peek/read/wake
bello.setAutoEnabled(true);
bello.markEngaged();                       // restart quiet timer for deliberate controls
const state = bello.getState();            // new snapshot, useful for UI/tests
bello.dispose();                          // release owned resources, remove from scene
```

`root` is a Three.js Group. The host owns its position, rotation, visibility and
scale. The module animates descendants only. `standingHeight` is the measured
standing height in asset units, with soles normalized to y=0. `touchTarget` is
the invisible raycast target. No character-owned camera, renderer, XR session,
audio system, microphone or network request is created.

Actions return `started`, `queued` or `disposed`. Unknown action/state names
throw RangeError. Only one deferred action is stored. State and action setters
do not alter AR placement or scale. `getState()` is observational, not writable
internal state. `update` requires finite nonnegative seconds and caps long steps.

## Changes to prepare in the application conversation

1. Inspect the actual v0.7.2 code and map its existing hooks to this API. Retain
   existing UI and backend behavior. Do not import the lab's entrypoint/UI.
2. Replace only the old character builder and its animation writes. Keep host
   placement, relocation, hit testing, tap ray construction, scale controls,
   reference space, command parser, local fallback, AI transport and audio.
3. Remove competing calls to old `animateFace`, `animateBreak` and reaction
   transform code once the new controller owns those transforms. Avoid two idle
   timers scheduling the same activity. Map Read/Wake into `triggerAction`.
4. Forward all four conversation states, including every error/cancel/end path
   back to idle. For an explicit Stop that cancels conversation, set idle first
   and then trigger Wake to clear local activity. Clear app-side queued actions
   according to the app's existing Stop semantics.
5. Direct character taps and parsed actions call `triggerAction`. Deliberate
   unrelated controls call `markEngaged` to postpone new autonomous activity.
   Keep the distinction between attention events and actions.
6. Compute scale using measured height, preserving 12 cm default, 6–24 cm limits
   and the existing increment. Keep `local` reference space. Do not rescale the
   AR placement transform in the animation loop.
7. Skip updates while hidden, unplaced, relocating or tracking is interrupted.
   On resumption, reset the host frame clock; do not catch up elapsed wall time.
8. Point the existing character raycast at `bello.touchTarget`. Preserve the
   current rule that empty-space taps do not trigger character reactions.
9. Reproduce the lab's generated reflection environment only if visually useful
   in the main app; it is a harness feature, not a hidden character dependency.
   Dispose the environment only when the host no longer uses it.
10. Run the main application regression checklist before calling this integrated.

## Dependencies and loading

Character modules import `three` through the host import map. The lab points that
name at its vendored **0.160.0** file. Integration should use the main app's same
Three.js instance/version; do not load another copy, globally swap import maps,
or upgrade Three.js as part of this character change. No addons are needed yet.
Keep the MIT license if redistributing the bundled Three.js file.

The host must use a suitable linear lighting/color pipeline. Character color
maps are sRGB; grayscale bump data remains NoColorSpace. Render settings in
`lab.js` are proposed preview settings and require comparison on the phone.

## Regression gate

- Main preview and AR, first placement, move/cancel move, targeted and empty taps.
- Default/minimum/maximum height and stable placement during every action.
- Every gesture plus Read/Wake; interrupt entry, page turn and exit.
- Local command mode and text/voice AI mode, including backend unavailable.
- Listening/thinking/speaking prevent autonomous starts beyond 30 seconds.
- Stop, recognition failure, API error, cancelled speech, Clear Chat and AR exit
  restore appropriate state without a stuck pose or unexpected deferred action.
- Existing sound/mute/reply controls remain owned by v0.7.2.
- Repeated AR entry/exit and background/resume; no duplicate listeners/timers.
- Sustained phone frame timing, memory stability and acceptable device warmth.

Integration and publication stay in the main application conversation.
