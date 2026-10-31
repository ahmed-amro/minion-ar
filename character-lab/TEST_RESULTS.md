# Validation record — v0.8-P1

Date: 31 October 2026. Baseline: supplied v0.6 source package; intended integration
target: user-reported v0.7.2. No main-application integration or deployment was run.

## Completed

| Check | Result |
| --- | --- |
| Syntax of all five JavaScript modules | Passed `node --check` |
| Relative module import paths | All resolve to packaged files |
| Local HTTP serving | HTML, CSS, entrypoint, four character modules and Three.js all return HTTP 200 |
| Node test suite | 13 passed, 0 failed |
| Automatic activity delay | Reading starts after 30 quiet seconds |
| Conversation priority | Listening/thinking/speaking freeze activity and page clocks |
| Deferred actions | Latest request retained; gesture waits for reading exit |
| All eight hooks | Supported; short reactions complete, Read/Wake transition |
| Host placement/scale/rotation | Remain unchanged through animated actions |
| Numerical stability | Animated transforms remain finite |
| Ground clearance | Boot bounds stay above local floor during standing reactions |
| Reading props | Remain visible while engaged, disappear after Wake transition |
| Disposal | Shared geometry/materials/textures disposed once; repeated disposal safe |
| Package | Only `character-lab/` entries; original app/ZIP not edited |

Tests ran with Node.js v24.22.1 and the bundled Three.js r160. CPU geometry tests
stub Canvas API calls; they do not validate texture rendering. An additional
internal software projection was used to inspect standing/reading geometry and
adjust clothing clearance, mouth position and the reading grip. That projection
does not reproduce WebGL depth, material shading or browser layout.

The unscaled measured standing height is approximately **0.82086 asset units**.
The character has 73 mesh nodes and approximately 13.6k triangles counting all
geometry, including hidden props and touch geometry. These are asset counts,
not measured visible draw calls or a phone performance result. The lab displays
actual renderer calls/triangles at runtime for comparison. Its preview mug and
floor are additional geometry and are hidden in AR.

## Not completed

- Real browser visual review, WebGL shader compilation and responsive layout.
  A browser executable was unavailable here; attempted browser downloads were
  blocked/unavailable. No browser rendering success is claimed.
- Android WebXR placement/relocation/touch/DOM-overlay validation.
- Sustained mobile frame rate, thermal behavior and real GPU memory measurement.
- v0.7.2 AI, browser speech, audio controls and backend-unavailable regression.
- GLB loading/rigging: no GLB asset is included in this prototype.

## Hands-on acceptance checklist

Record phone/browser version, lighting and observations when testing.

| Test | Expected | Result / notes |
| --- | --- | --- |
| Preview on desktop and phone | Bello visible; controls usable; no browser errors | |
| All six gestures | Smooth start/end; recognisable motion; no floor penetration | |
| Read, then Wake mid-entry | Smooth reversal; no stuck chair/book | |
| Read, then Listen/Think/Speak | Props persist, page pauses, gaze turns forward | |
| Return to Idle | Reading resumes; no immediate unwanted second activity | |
| Gesture requested while Speaking | Queued until Idle, then runs after standing | |
| Auto Off; wait >30 seconds | No new reading; explicit Read still works | |
| Default/min/max size | 12/6/24 cm; plausible scale beside a real mug | |
| First AR placement | Stable horizontal desk placement; soles grounded | |
| Move and cancel Move | Repositions or restores prior placement | |
| Tap Bello vs empty desk | Only direct character hit triggers reaction | |
| Conversation states in AR | Same behavior rules as preview | |
| Exit/reenter AR | Preview restored; no duplicated behavior or controls | |
| Background/resume | No large animation/time jump | |
| Several minutes in AR | Acceptable motion, heat and stability; record quality setting | |

Known approximation to judge visually: chair seating and magazine grip remain
procedural, not a professionally animated rig; the eyelid is a lightweight cap;
the blob shadow does not reflect actual room lights or occlusion.
