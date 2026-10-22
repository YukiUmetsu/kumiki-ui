# ShortSafeFrame — per-output reserved regions for 9:16 and 16:9 frames

**Status:** Implementing. Automated checks and agent screenshot review are recorded below. Human review is pending.
**Catalog phase:** P0 slice 1 of [17 — Explainer Visual Components](../17-explainer-visual-components.md#3-highest-priority-component-contracts-p0)
**Scope:** Describes each output (9:16, 16:9, 4:5 …) as its own profile: raster size, reserved regions where app UI covers the video, and the content area that remains. It checks a measured layout against that profile, detects outputs that are mechanical crops of another, and draws a non-exporting preview of the reserved UI. It does not lay out scenes, move cameras or place captions itself; it feeds `ExplainerStage`, `placeProtectedText` and CC1.

## Reuse and the gap it fills
- Before this item, `video-platform-presets` carried approximate `safeInset` data that nothing consumed. `ExplainerStage` and `placeProtectedText` used one uniform `safeMargin`, so captions could not respect asymmetric UI such as a deep bottom band.
- CC1 `CameraComposition` already supports `safeRegion` and `exclusions`; `safeFrameCameraComposition()` fills them.
- `placeProtectedText` and `ExplainerStage` gain two optional inputs, `safeRegion` and `avoidRegions`. When an avoid region falls inside a candidate slot, the slot narrows around it instead of being rejected. Existing calls are unchanged.
- `VideoExportStage` refuses to capture while guides are visible or while a frame reports `data-safe-frame-status="error"`.

## Install and inspect
- Registry item: `short-safe-frame` (`safe-frame.ts`, `short-safe-frame.tsx`; depends on `motion-track` types only).
- Storybook: **Visual → Short Safe Frame**.
  - **Independent outputs:** one scene per subject area (technology, finance, logistics), composed separately for 1080×1920 and 1920×1080. Each caption is measured live by `ExplainerStage`. Switch between the preset-inset and custom profiles, English and Japanese, and guides on or off.
  - **Collisions and blind crop:** a portrait made by centre-cropping the landscape, with a caption placed over the description area. The story lists the five resulting errors.

## Minimal usage
~~~tsx
const shorts = videoPlatformPreset("youtube-shorts");
const profile = safeFrameProfileFromInset({ id: "shorts", width: shorts.width, height: shorts.height, inset: shorts.safeInset });

<ShortSafeFrame profile={profile} items={measuredItems} guides={authoring} style={{ containerType: "inline-size" }}>
  {frame => <ExplainerStage aspect="9:16" subjects={subjects} protect={["a", "b"]}
    safeRegion={frame.text.safeRegion} avoidRegions={frame.text.avoidRegions} onLayout={collectItems}>
    <ExplainerVisual>…</ExplainerVisual>
    <ExplainerText>…</ExplainerText>
  </ExplainerStage>}
</ShortSafeFrame>

const report = inspectSafeFrameSet([{ profile: portrait, items: portraitItems }, { profile: landscape, items: landscapeItems }]);
~~~

## Contract
- **Profile:** `{ id, width, height, reserved, padding? }`. Each reserved region is `{ id, rect, edge?, blocks?, appearance?, label? }` with normalized rects.
  - An `edge` region shrinks the content area from that side.
  - A region without `edge` is an interior obstacle, such as an action column next to the caption lane.
  - `blocks` lists what may not enter (default: text and subjects).
  - `padding` adds equal breathing room in px on every side, given as a fraction of the output width.
- **Profiles from presets:** `safeFrameProfileFromInset` turns fractional insets into four edge bands. Preset insets are approximations; replace them with measured overlay geometry when a placement's real UI is known. Platform geometry is never hard-coded.
- **Checks:**
  - `inspectSafeFrame(profile, items)`:
    - Errors: text or a critical subject outside the content area, either one overlapping a blocking region, text over a critical subject, an invalid profile or invalid item.
    - Warnings: a non-critical subject or graphic overlapping reserved UI.
  - `inspectSafeFrameSet(outputs)` adds two errors: a critical ID missing from an output, and `blind-crop` (one output is a centre crop or letterbox of another, detected from two or more shared item rects with 0.2% tolerance).
- **Bridges:** `safeFrameContentRect`, `safeFrameCameraComposition` (CC1), `safeFrameTextConstraints` (text placement), `safeFrameExclusionZones` (px zones for `inspectExplainerPrinciples`).
- **Component:** `ShortSafeFrame` renders a fixed-aspect `div` and forwards its DOM props and ref. The preview is 100% wide; set an explicit px width for capture. Children may be a render function receiving `{ profile, orientation, contentRect, text }`; `useShortSafeFrame()` returns the same object. With `items`, the root carries `data-safe-frame-status` (`ok`, `warning`, `error`, or `unchecked` without items), and `onInspect` fires when the result changes.
- **Guides:** `guides` draws amber hatched reserved regions, generic stand-ins for app chrome (`actions`, `description`, `header`, `progress`), the dashed content area and item outlines coloured by status. They are `aria-hidden`, marked `data-km-exportable="false"`, and block export.
- **Semantics:** the frame is a plain container. Give the scene inside it an accessible name; guides carry no meaning for assistive technology.
- **Customization:** `--km-safe-frame-reserved`, `--km-safe-frame-reserved-edge`, `--km-safe-frame-ui`, `--km-safe-frame-chip`, `--km-safe-frame-chip-ink`, plus the status tokens.
- **Limits:**
  - The checks cover the frames and bounds you pass in; unsampled frames are not proven. Animated scenes should sample critical frames, as CC1 guards do.
  - Collision is axis-aligned rectangles. Rotated or irregular UI must be approximated by its bounding box.
  - Blind-crop detection only recognises centre crops and letterboxes. An off-centre crop is not detected.
  - `ExplainerStage` itself supports only 16:9 and 9:16, so other aspects need a different text host.

## Verification (2026-10-22)
- `npx vitest run tests/visual-constraints.test.ts`: four safe-frame cases (content area and bridges, slot narrowing around interior UI, collision codes and status, centre-crop/letterbox/missing-subject detection) plus the existing protected-text cases.
- Rendered in Storybook at 1100 px wide and reviewed by the agent:
  - Technology/custom, finance/preset (Japanese), logistics/custom (dark appearance), logistics/custom (Japanese) and guides-off: both outputs reported `ok` and captions avoided every reserved region.
  - The collision story reported `subject-outside-safe-area` ×2, `subject-in-reserved-region`, `text-in-reserved-region` and `blind-crop`.
  - No console errors.
  - Fixed after review: the hatch was invisible on dark scenes (now amber), the portrait connector curved backwards, and right-side region labels clipped.
- **Human visual review:** pending.
