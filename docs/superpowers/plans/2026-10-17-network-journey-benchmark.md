# A Message's Journey — cinematic explainer benchmark

**Status:** implementation plan; no completed-explainer or release claim.  
**Primary acceptance production:** *What Happens When You Press Send?* — 90 seconds, eight connected chapters, 2D explanations over a coherent 3D world.  
**Secondary regression:** preserve the existing *How a Computer Processes Information* reference for focused camera, tracking, and exploded-assembly tests. Do not replace or rewrite it.

## Purpose and non-goals

Prove that **existing public Kumiki components can teach one real subject clearly through a coherent cinematic experience**, not merely demonstrate effects. The viewer should be able to explain the difference between DNS, a secure connection, network forwarding, a messaging service, and delivery after watching. The Storybook version must teach without sound and let viewers investigate the explanation interactively.

Keep **one MG1 frame clock**, existing MotionDirector (MD1), CinematicCameraDirector (CC1), VT1, DiagramStage, infographic components, ExplodedView3D, Storyboard, and Three.js viewport. No new renderer, animation runtime, NLE, video exporter, audio engine, shader/postprocessing stack, live networking, or simulated packet protocol. Narration and SFX are **typed cues only**; on-screen captions and adjacent transcript carry the lesson.

**Frame contract:** `fps = { num: 30, den: 1 }`, `durationFrames = 2700`; absolute frames `[0, 2700)`, last rendered frame `2699`. Eight consecutive, nonoverlapping chapter ranges. Author both **1920×1080 (16:9)** and **1080×1920 (9:16)**; don't crop landscape footage to make portrait. Square is optional. Keep source contents and educational claims invariant across aspects.

## Story and shot map

Each chapter needs one factual takeaway, one visually demonstrated causal relationship, a readable title/caption, an intentional hold, and an interactive question. A chapter is **not accepted** if its graphics merely decorate narration. Shot recipes may use multiple camera movements inside a chapter, but maintain one contiguous eight-chapter timeline.

| Chapter / frames (seconds) | Learner's takeaway / suggested on-screen claim | Visual explanation and cinematic direction | Principal reused systems |
|---|---|---|---|
| **1 · Press Send** `[0,270)` (0–9) | “Your message leaves the app, not directly for the other phone.” | Premium 3D phone; type and send one warm-colored message. Establishing shot → motivated push into the screen. Show a visible hold after Send. | CC1 `establish`/`dolly`, MD1 cues, typography |
| **2 · Find the Service** `[270,540)` (9–18) | “The app needs an address for its messaging service.” | Phone UI resolves into a **service** hostname/IP diagram, not the recipient's phone. Show cached-address shortcut. 3D screen framing hands off to an explanatory 2D graph. | DiagramStage, VT1 **handoff A**, camera `inspect` |
| **3 · Protect the Connection** `[540,870)` (18–29) | “TLS protects the connection between this device and the service.” | Depict a bounded sender→service connection and lock it; show the server-side boundary. Optional separate label: **E2EE is a different design**. Avoid an uninterrupted encrypted tunnel through the server to the recipient. | MD1 grouped animation, mask/progressive reveal, overlays |
| **4 · From Message to Packets** `[870,1230)` (29–41) | “Encrypted transport data travels inside network packets.” | One recognizable message becomes a protected data representation, then illustrated packet glyphs. Show distinct **payload identity** and **network packets**; avoid suggesting one message always equals one packet. Camera takes over the foreground packet. | VT1 **handoff B**, MD1 stagger/data flow, CC1 `follow` |
| **5 · Through Routers** `[1230,1710)` (41–57) | “Routers forward packets toward their destination using routing information.” | Fly through interconnected routers; highlighted packet follows a plausible multi-hop path while unrelated traffic moves independently. Brief orbit/hold at a router reveals the next-hop decision. | CC1 `fly-through`/`orbit`/`follow`, MD1 tracks, diagram paths |
| **6 · The Messaging Service** `[1710,2100)` (57–70) | “The service receives, processes, and may temporarily store or queue a message.” | Track traffic into server. Explode a **conceptual logical stack**—connection endpoint, application processing, optional queue/storage—clearly labeled as a model, not literal hardware internals. | ExplodedView3D, CC1 `exploded`/`inspect`, MD1 |
| **7 · Reach the Recipient** `[2100,2430)` (70–81) | “A connected recipient may receive it now; an offline recipient may get it later.” | Track service→recipient transport separately. Switch **online/offline** scenarios: live delivery vs queued/waiting. Delivery indicator must not imply the person has read the message. | MD1 conditional authoring variants, CC1 `follow`, VT1/overlays |
| **8 · See the Whole Journey** `[2430,2700)` (81–90) | “The service connects both devices; networks carry data between them.” | Camera pulls back to the connected world, then an identity-preserving 2D network overview names **device → service → recipient** with the two transport legs. End on a clear summary held long enough to read. | CC1 `detail-to-overview`, VT1 **handoff C**, infographic |

**Narrative throughline:** one warm message identity (`message-001`) remains recognizable as an application payload across representations. Its visual continuity is pedagogical, **not** a claim that the same physical packet survives end-to-end. Other packets are background traffic. Use continuous camera travel when it clarifies location; use intentional cuts when it avoids disorientation or implies otherwise false physical continuity.

## Technical truth contract

This is a **representative client–server messaging architecture**, not a trace of a specific app or claim about all internet traffic. Document these assumptions in Storybook and in the transcript:

- **DNS** resolves a messaging **service hostname** to an address when necessary; caching, prior lookup, or an already-open connection can eliminate this step on Send. DNS does not resolve the recipient's phone from their chat identity.
- **TLS (Transport Layer Security)** generally protects a client–service connection; each recipient–service connection has its own transport security. Routers forward encrypted traffic without reading its protected application plaintext. **End-to-end encryption, when used, is separate**: it changes whether the service can see message content. Don't imply all chat apps use E2EE.
- **Encapsulation** is illustrative. Application messages, encrypted records, transport segments/QUIC packets, and IP packets are **different layers**; a single message does not map to a fixed number of IP packets. Do not visualize TLS as a literal physical tunnel.
- **Routing** may involve multiple hops; paths can vary, and routers forward primarily according to IP forwarding/routing decisions. Illustrated hop sequences, timing, and geography are **not measured**.
- **Delivery** depends on service/application design, recipient connectivity, queues, and notification behavior. Push notification ≠ guaranteed delivery or decryption; “delivered” ≠ “read.” Do not depict an ACK/receipt as proof a person read anything.
- Every simulation control changes **illustrative authored events**, not actual measured latency, protocol negotiations, encryption strength, or packet-routing algorithms. Clearly label pedagogical abstractions.

## Visual system and educational direction

Use one cohesive, navigable **stylized** 3D world: sender phone, service-entry node, routers/links, messaging-server assembly, recipient phone. Pale brushed-metal surfaces, off-white labels, controlled teal network lines, **one warm amber identity** for the message, restrained dark environmental lighting, purposeful depth and parallax. Keep unrelated packets visually subordinate. No generic neon network wallpaper, gratuitous particle storms, excessive glow, or constant camera movement.

Establish orientation before each unfamiliar concept; introduce no more than one new major concept at once. Camera movements must reveal a fact (where, how connected, what happens next); finish with a hold that leaves essential labels readable. Author semantic caption content separately from visual geometry so landscape and portrait can be independently composed. Supply clear visual hierarchy and contrast; test delivery-size text, not just fullscreen Storybook screenshots.

**36 independent packet objects** is a motion-system stress fixture, **not** a factual packet count. Use 1–3 emphasized message-trace glyphs; the rest represent other simultaneous network activity. Use frame-addressable deterministic paths, staggered launches, holds and opacity, with no per-packet RAF or random runtime integration. Seed decorative variation. If a packet moves along a route, anchors/labels must stay consistent with that route while seeking or reversing.

## Existing Kumiki contracts and integration

| Concern | Existing entry point / rule | New work permitted |
|---|---|---|
| Time and orchestration | `compileMotionDirector`, `MotionDirector`, `AnimationGroup`, `CinematicShot`, `motionTimelineGroup`, `directorCuesBetween`; **MG1 is the only clock** | Author one MD1 direction over canonical chapter/shot IDs. No new scheduler or clock. |
| Camera | `CameraSequence`, `CameraShotRecipe`, `compileCinematicCamera`, `cameraSequenceGroup`, `CinematicCameraDirector`; `createThreeCameraTargets` | Build targets from absolute-frame world bounds; author semantic shots, independent portrait plans and bounded diagnostics. Reuse CC1 pose-mode viewport. |
| 3D motion | Existing Three scene lifecycle and `updateFrame(frame, evaluation?)` pattern; MG1 numeric channels and optional Three renderer | Prefer `x/y/z` scalar tracks for world-space packet positions, resolved from one evaluation. **Do not pretend the existing `Vec2` data-flow recipe supports `Vec3`.** |
| 2D flow | `sequentialDataFlowRecipe` currently uses `Vec2` waypoints without per-waypoint times; `DiagramStage` provides graph/packet visualization | Reuse unchanged for 2D. Extend with optional timed **2D** waypoints only if a concrete lesson requires it and backward-compatible tests are provided. For 3D, use a small reusable absolute-frame route sampler/adaptor, not a second engine. |
| Transitions | VT1 `VisualScene` → `compileVisualTransformation` / `VisualTransformation` or MD1 `sceneContinuityRecipe` | VT1 is **2D/SVG only**. Derive stable-ID 2D snapshots/overlays at three handoffs; coordinate with the 3D camera, but never claim native 3D geometry morphing. |
| Diagram and infographic | Existing `DiagramStage`, `InfographicView` / semantic layout, progressive reveals and storyboard shots | Bind to shared factual source model; no independent hand-edited diagram facts. Promote new adapter to `registry/` only if genuinely reusable; otherwise keep demo-local. |
| Server detail | `ExplodedView3D`, projected annotation mechanism | Reuse assembly controls for **conceptual service layers**; explicitly label abstractions and qualify occlusion/annotation behavior. |
| Presentation | Existing `MotionScrubber`, `StoryboardShots`, Storybook stories | Extend rather than fork playback/navigation; one selected frame drives 3D, 2D, captions, chapter state and diagnostics. |

**Compilation example (API wiring, not a new API):**

```ts
const camera = compileCinematicCamera(
  CameraSequence({ id: "network-camera", title: "A Message's Journey",
    fps: { num: 30, den: 1 }, durationFrames: 2700,
    output: { width: 1920, height: 1080 },
    shots: chapterShots.map(ch => CameraShotRecipe(ch.recipe, ch.camera)) }),
  targets,
);
if (!camera.ok) return renderDiagnostics(camera.diagnostics);
const motion = compileMotionDirector({
  schemaVersion: 1, id: "network-journey", title: "A Message's Journey",
  fps: { num: 30, den: 1 }, durationFrames: 2700,
  targets: subjectIds,
  scenes: vt1SceneSnapshots,
  children: [cameraSequenceGroup(camera.plan), ...chapterMotionNodes],
});
if (!motion.ok) return renderDiagnostics(motion.diagnostics);
// One frame / one MG1 evaluation feeds Three.js, SVG overlays, cues and scrubber.
```

`chapterShots`, `chapterMotionNodes`, `subjectIds`, `targets` and the diagnostic view are **benchmark authoring data/adapters**, not already-existing Kumiki exports. Align exact IDs, timings and scene/shot contracts with `director-types.ts` and `cinematic-camera-types.ts`. Avoid persisting Three.js `Object3D` instances in authoring JSON. Do not recompute camera plans on every React render or every scrub tick; key compilation to authored inputs and target revision.

### Three required *real* VT1 handoffs

- **A · Phone UI → service lookup graph** (late chapter 2): convert the visible phone-screen graphics to a semantic 2D SVG snapshot, then reorganize its hostname/address element into a DNS graph; maintain the same `semanticId` on the label being tracked. The 3D camera holds an appropriate screen pose during this overlay handoff.
- **B · Protected message → packet glyphs** (chapter 4): show an authored message icon/lock group splitting into a 2D field of packet glyphs using VT1 mappings with explicit fallback for incompatible shapes. 3D packet objects animate into view on the **same frame schedule**, but are not native VT1 destinations.
- **C · Projected network → overview infographic** (chapter 8): at the chosen camera pose, construct a **screen-space 2D snapshot** with stable node IDs and transition it via VT1 to the final semantic infographic. Avoid confusing a projection/crossfade with geometric 3D-to-2D morphing.

Each handoff must have explicit source/destination snapshots, identity mapping, sampled start/mid/end frames, one authored continuity decision, and a documented fallback reason if morphing is unsupported. Preserve the meaningful hierarchy and facts when a visual representation changes.

## Storybook deliverables

Place feature-specific stories under **`Explainers / A Message's Journey`**; keep existing camera, MotionDirector, and computer-reference stories intact.

1. **Complete Experience** — all eight chapters, play/pause, one frame scrubber, keyboard seeking, chapter strip, on-screen caption/transcript, 16:9/9:16 variants, and readable story summary.
2. **Eight Chapter Lessons** — deep-link to each chapter; show a concise “What you learn,” a visual explanation, one clear misconception corrected, and a knowledge-check prompt. Controls must affect what is demonstrated, not just decorative style.
3. **Interactive Investigations** — *Cached DNS* (show lookup or reuse), *TLS versus E2EE* (show who can access which contents), *Latency* (adjust illustrative waiting/transit and label nonphysical simplification), *Router path* (choose between preauthored valid illustrative paths), *Online versus offline delivery* (queue/wait versus immediate receive). Controls recompute deterministic authored variants with validated bounds; never claim live simulation.
4. **Director View** — same timeline and scene as Complete Experience; toggle camera frustum/path/target IDs, subject bounds, safe/exclusion regions, active MD1 groups, cue markers, CC1 diagnostics, and named VT1 handoffs. Keep guides **off** in the learner view and inaccessible to exported graphics.
5. **Integration Regression** — silent/reduced-motion fallback, missing/unavailable WebGL state, alternative theme, portrait layout, and chapter-transition boundary states. Avoid duplicating the full film per story; share one authoring model.

Storybook is an interactive *lesson*, not an animation debug page. Each investigation follows **Predict → Reveal → Explain**: ask a concrete question, let the learner change one meaningful variable, then show the consequence and its network-level reason. Example checks: “Does DNS find the recipient’s phone?” (No, it locates the service); “Can the messaging service read TLS-protected content?” (After TLS termination, potentially yes unless E2EE protects the payload); “Does delivered mean read?” (No). The main player defaults to learner mode; inspection tools remain opt-in. Caption/transcript must explain factual content even if animations are paused, unavailable, or reduced. Static reduced-motion state should display the chapter's meaningful resolved illustration and explanation, not an unexplained final-frame-only image.

## Delivery phases — complete vertically, then expand

- [ ] **P0 · Freeze learning/story contracts.** Write one canonical chapter manifest (`id`, frame range, learner claim, visual proof, caption/transcript, misconception, shot objective, target IDs, interaction). Validate 8 contiguous ranges and truthful terminology before building motion. Record expected shots and three VT1 handoffs.
- [ ] **P1 · Shared world + 2D teaching skeleton.** Build deterministic phone/router/server/recipient scene and semantic source diagrams; wire existing Storybook playback, chapter navigation, captions and portrait layouts. Render **one complete chapter** before expanding to all eight.
- [ ] **P2 · Timed 3D packet motion + camera planning.** Animate 36 independent packet objects from MG1 at absolute frames; keep highlighted payload continuity separate from background traffic. Author/compile 8+ motivated camera beats using CC1, including dolly, tracking, router orbit, fly-through, exploded inspection and overview. Confirm hard constraint failures remain visible.
- [ ] **P3 · Concept handoffs and service detail.** Implement three genuine VT1 2D representation handoffs; coordinate them with 3D pose/visibility and update `ExplodedView3D` conceptual service layers. Reject fake VT1 handoffs or private replacements for reusable directors; keep story-specific objects and visual metaphors in the demo.
- [ ] **P4 · Actual interactive lessons.** Implement DNS reuse, TLS/E2EE boundary, illustrative path/latency, online/offline variants, then Director View, using the same compiled scene. Check that control changes alter both caption truth and visual state.
- [ ] **P5 · Hardening and review.** Run unit, integration, Storybook/Playwright, registry and visual checks; measure cold/warm compilation, random seeks, browser frame time and memory. Fix observed educational and composition defects; document unresolved limits. Stop without claiming video or audio production readiness.

**Code placement:** use `src/motion/network-journey-*` or `src/explainers/network-journey-*` for story-owned world, curriculum, and compositions. Only reusable geometry/animation adapters belong in `registry/`, with a clear source-distributed item boundary, focused spec/tests, and explicit optional Three dependency. Never modify existing components simply to match the reference aesthetic.

## Acceptance and evidence (no implied passes)

**Educational:** all eight chapter claims are accurate for the declared example architecture; narration/caption claims match graphics; questions can be answered from the interactive lesson. Validate security boundaries and delivery semantics with a chapter-by-chapter factual review. No unexplained acronym on first use.

**Motion / integration:** compile exactly 2700 frames at 30 fps, 8 contiguous chapters, ≥36 independently addressable moving packet objects, ≥5 distinct motivated camera shots, ≥3 verified VT1 2D handoffs, ≥1 intentional cut and ≥1 continuity-preserving handoff. A single MG1 sampled frame drives all renderers. Verify same-frame output for shuffled seeking and forward/reverse queries; no mutable-history drift.

**Camera / graphics:** projected subject bounds and declared safe regions pass in 16:9 and 9:16 at the actual tested frames. Sample chapter starts, midpoints, ends, every shot boundary, moving-subject extrema and all three handoffs. A real 3D viewport, live 2D graphics, intentional shot pacing and correctly occluded/qualified annotations must be visible; static slide sequences or screenshots of controls alone do not pass.

**Storybook / accessibility:** usable playback + keyboard scrub/chapters, readable explanatory text, 390px control layout, no essential-label clipping, reduced-motion behavior, transcript/accessible alternative to WebGL graphics, and honest WebGL failure fallback. Test at 16:9/9:16, light/dark or two authored themes, and representative delivery sizes. Run axe and Playwright; log manual visual findings separately.

**Engineering:** relevant `npm run typecheck`, `npm run lint`, `npm test`, `npm run build-storybook`, `npm run registry:validate`, `npm run registry:smoke`; clean install fixture **only for any new published registry item**. Tests must exercise frame boundaries, packet-route identity, variants, camera compile errors, serialization where applicable and semantic labels. Commit reproducible example source, representative screenshot evidence, test commands/results and diagnostics; report skipped/unrun checks.

**Performance:** measure cold/warm CC1+MD1 compile duration, timeline memory/serialized size, random seek median/p95, interactive browser frame time and 3D memory/disposal on the actual test hardware. Prefer warmed, memoized compilation and one frame evaluation. State hardware/browser/settings and whether GPU rendering is included; **do not infer FPS from CPU evaluator benchmarks**. Reduce scene complexity rather than hiding drops or relaxing semantic checks.

**Hard failure:** missing semantic targets, invalid timelines, unsatisfied hard camera constraints, essential text overflow, fact/visual contradictions and broken handoff identity must surface visibly and block acceptance. A pretty screenshot is not sufficient.

## Explicit limitations and final report

- Existing viewport has **no motion blur, general depth-of-field or postprocessing guarantee**. Do not fake those effects or add a new renderer for this benchmark. Record limits accurately.
- CC1 occlusion and camera clearance are bounded approximations, not proof of collision-free continuous trajectories; inspect camera paths visually.
- VT1 is 2D/SVG. 3D objects are composed with VT1 outputs through synchronized overlays, not automatically morphed across dimensional spaces.
- MD1 narration/SFX payloads are cues, **not audio assets, mixing, lip sync, or confirmed spoken-word alignment**. No rendered video output is required or claimed.
- No real DNS, TLS, IP, chat server or real-time packet simulation. All paths and latency values are explanatory scenarios.

Final implementation report must distinguish **implemented / tested / visually inspected / not tested / known limitation** and link to exact Storybook stories, benchmark source, screenshot evidence and measured results. Preserve the prior computer reference as a focused regression story.
