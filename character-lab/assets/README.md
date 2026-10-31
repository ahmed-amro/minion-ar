# Future GLB comparison asset

No GLB is included in this first prototype. Keep asset work in this directory.
The procedural character remains the fallback and visual reference.

Proposed authoring contract:

- Originalized yellow companion, prominent goggle, blue workwear, dark boots.
- Standing sole plane y=0, +Y up and +Z forward. Use metres or declare authoring
  units; normalize by measured standing height when loading. Put root placement
  outside the animated rig. Export in-place motion rather than baked desk travel.
- Skeleton with shoulders/elbows, hips/knees/ankles and simple hands. Provide
  named prop sockets for the magazine and future toys. Add eyelid and mouth morph
  targets and independent eye control; no heavy facial simulation.
- First clips: idle, wave, sit_down, read_loop, stand_up and jump. Later add the
  remaining existing gestures before considering replacement of the main avatar.
- Align the seated pose with the chair and grips; use entry/exit clips. Crossfade
  compatible clips and add procedural gaze/breathing without conflicting tracks.
- Starting budgets: 10–20k triangles, 20–35 bones, 3–5 materials, 1K atlases, under
  about 5 MB transferred. These are authoring targets, not measured guarantees.
- Export base color, normal and roughness/metalness data with correct color
  spaces. Start with ordinary embedded textures; consider KTX2/compression after
  profiling with matching Three.js r160 loaders/decoders.
- Keep chair, magazine and other reusable props separate. Document author,
  license, provenance and permitted redistribution for every external asset.

An adapter should expose the same public API as `character.js`. Do not make the
behavior scheduler depend on a particular skeleton or mesh hierarchy.
