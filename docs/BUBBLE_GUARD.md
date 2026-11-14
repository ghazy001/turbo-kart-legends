# Bubble Guard — Milestone 4 defense

Historical implementation record. Current pickup weights, recovery tuning and AI timing supersede the original fixed-box distribution below; see [Item balance](ITEM_BALANCE.md).

## Delivered behavior

Bubble Guard is an original procedural defensive item. Collect it, then use **E / either Shift**, standard gamepad **X / square**, the HUD card or phone **ITEM** to activate. It lasts **five simulation seconds or one Spark Bolt / Banana Trap contact**, whichever comes first. Each course now has three rewards of each type; row/column assignment remains deterministic, not weighted roulette. Only Quick Race, VS and cup races use items. Time Trial and Free Drive remain item-free.

Protection and held inventory are separate. Activation consumes the held guard; the player may collect/use another attack while protected. A second held guard cannot stack or refresh the active one and remains available after expiry/break. Fresh presses are required, using the existing normalized input buffering and neutral/rearming behavior.

The shared item hit path checks pre-existing immunity first, so an already harmless contact does not waste the shield. Otherwise a shield consumes exactly one attack and immediately disappears. It preserves speed, lateral slip, position, steering, drift charge, boost and action cooldown. It grants no extra immunity: a second hit in the same tick can apply the normal slowdown. An armed own banana can also consume protection after owner grace. Existing slowdown is not healed by activation. Walls and physical kart contact are unaffected.

Shield time advances only on the existing fixed item clock. Pause freezes the bubble, countdown and timer, and disarms held use. Recovery clears the shield with the racer's existing item state. Restart and cup-round creation reset all inventories/protection. Finished racers cannot activate or display protection. Expiry/break/activation events use the existing bounded event list and once-only audio cursor.

## AI

The existing useItem decision now handles defense. A racer holding a guard predicts up to 0.85 s of relative bolt motion or a ground trap contact along its current forward/lateral velocity. It checks owner exclusion/grace, arming, remaining life, height and bolt rail obstruction. It does not activate for harmless passing/retreating/high/expiring shots, an unarmed distant trap, existing immunity or an active shield. AI submits the same normalized action; pursuit steering, pace, catch-up, recovery and race rules are unchanged. This short linear prediction is intentionally simple; human combat balance remains open.

## Visuals, HUD and audio

`BubbleGuardVisuals.tsx` follows interpolated racer poses using three bounded instanced pools: up to four transparent bubbles, eight thin orbit rims and four break/expiry pops. The original cyan bubble has a subtle pulse, speeding up near expiry. It adds no lights, shadow maps, physics bodies or GLB downloads. Geometry/materials are created once through R3F and disposed on unmount; pulse/motion derives from simulation time and freezes while paused.

The item card shows an original Bubble Guard icon and Activate action. A separate active-status strip stays visible with an empty inventory or another item, with a countdown, shrinking duration bar and ONE HIT label. Live notices distinguish a protected hit from normal damage; the countdown avoids per-frame screen-reader announcements. Reduced-motion CSS disables meter transitions. Original synthesized activation/break/expiry cues respect mute/pause and do not replay missed events.

## Files

- `src/game/config/itemConfig.ts`: third item definition, five-second tuning and prediction horizon. `CombatModelId` keeps actual GLB models distinct from procedural items.
- `src/game/items/ItemSystem.ts`: slot shield timer, pickup mix, action consumption, one-hit protection, expiry events, defensive decision, guard/block counters.
- New `src/game/render/BubbleGuardVisuals.tsx`; `ItemVisuals.tsx` mounts it under the existing active-item world.
- `src/game/ui/ItemHUD.tsx`, `src/styles/items.css`: icon/action, active countdown/status, accessibility and styles.
- `DrivingAudio.ts`, pause help, phone help and development diagnostics: new cues, instructions, counters and a normal-input guard pickup line.
- GLB rendering/helper tests now use the narrower CombatModelId; supplied banana/Hutt ball sources and derivatives are unchanged.
- New `src/game/tests/bubbleGuard.test.ts` and updated item/audio tests.
- Root design/architecture/roadmap/README/scope and phone docs updated.

No dependencies, new network messages, movement/collider changes, race rules or camera changes were introduced. Tuning constants are centralized. The complete six-item milestone and position-weighted item distribution are still future work.

## Verification

Checks completed on 2026-11-07:

- `npm run typecheck`, `npm run lint` (zero warnings), `npm run build` and `git diff --check` passed; production build completed (728 modules; Vite build 2.40 s after TypeScript validation). No new dependencies were installed.
- Focused item/guard/audio/real-GLB checks: **55 tests / four files passed**. The guard suite adds 15 behavioral cases including both-course distribution, one-hit bolt/trap protection, same-tick double hits, expiry, non-refresh, immunity priority, no healing, pause/recovery/restart, render-interval consistency and defensive AI paths/actions. Existing movement/input/race tests are retained.
- A first full run passed 285/286 tests with one exhaustive GLB audit hitting its five-second CPU timeout. That audit now has a dedicated 15-second budget, with every assertion unchanged. A later loaded run hit existing 60-second long-race timeouts; no assertion failures were reported. The final normal `npm run test` rerun passed **286/286 tests across 25 files in 139.66 s**, using the existing two-worker script.
- A separate 4,000-tick local profile measured ~7.77 s with items enabled; guard prediction accounted for ~31 ms across 4,934 checks. This is a local diagnosis, not a target-device performance guarantee or a replacement for regression tests.
- Browser QA collected Bubble Guard through normal pursuit inputs, activated it with keyboard E, consumed the held item and showed the translucent bubble following the kart. The HUD displayed the five-second countdown and shrinking bar with an empty slot. Later observation showed protection expired and inventory could hold Banana Trap. Pause/resume and trap use still worked. The race had progressed into validated lap two; a development reload occurred during tooling work, so a full browser finish is not claimed in this pass.
- Protected-hit behavior and active-shield pause/cleanup are unit-tested; a real-phone, physical-gamepad or new protected-hit browser pass is not claimed. Browser logs showed only the existing Three.Clock deprecation warning, without a render error.
- Captured gameplay: `docs/milestone-4/guard/active-guard.png`. The ordinary `/` Home route is restored with development autodrive removed.
- Renderer showed 220 geometries and 35 textures after loading, compared with the prior 217/35 counts: three procedural geometries and no additional textures. The guard has at most three pool draws, with no shadow/light additions. Timings captured while long CPU tests were running are not meaningful release-performance comparisons.


## Remaining manual work

Physical phone/gamepad use, real Wi-Fi, audiovisual listening, adversarial human balance and cross-browser/device frame budgets remain manual. A unit-tested defensive decision is not a claim that every possible driving trajectory is predicted; drift/turn/jump changes can occur after activation. The shield is cosmetic around the kart's existing hit envelope and does not enlarge collision shapes. It does not repair source driver rigging or change local asset-release permissions. The existing upstream Three.Clock deprecation remains documented separately.
