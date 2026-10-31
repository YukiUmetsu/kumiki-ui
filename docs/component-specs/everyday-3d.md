# Everyday 3D Objects — Cinematic Desk Kit (P0)

Status: **implemented first-phase desk kit and three recipes**; not a claim that all 55 requested objects or all six proposed recipes are shipped. The goal of this slice is an inspectable, original, frame-addressable system for ContentGen and the existing Storybook/FFmpeg pipeline.

## Installation and ownership

Install the `everyday-3d-scenes` registry item for the object kit, deterministic interaction evaluator, stage set, device models, and scene recipe module. Its dependency on `crafted-3d-hero` provides the viewer. The Storybook adapter and physical book integration are application-level source in the Kumiki repository and are **not** copied by this registry item; ContentGen consumers must supply their own compatible adapter for the existing `page-turn-story` bridge. Do not copy/maintain an independent camera, render loop, browser exporter or page curl engine.

| Concern | Owner |
|---|---|
| Physical objects, shapes, pivots, material parameters | `registry/craft/everyday-objects-3d.ts`, existing `registry/domains/technology-3d.ts`, `registry/craft/hero-stage-set.ts` |
| Pure seekable transfer trajectory | `registry/craft/everyday-interactions.ts` |
| Typed recipes, validation, composition, camera | `registry/video/everyday-scenes-3d.ts` |
| Existing paper bending and hardcover hinge | `src/components/video/scene-book-3d.tsx` |
| WebGL/lighting/shadows/camera and frame synchronization | Existing `HeroAssetViewer`, `VideoExportStage` |
| Authoring and export preview | `src/components/video/everyday-3d.stories.tsx` |

## Supplied objects

- **Walnut desk**: 160 × 80 cm, stitched leather desk mat, satin steel legs, bespoke walnut albedo/relief; optional minimal satin white-lacquer top. This uses `createStageSet('desk', {deskFinish:'walnut'|'white'})`.
- **Laptop**: 13-inch-class anodized shell, keyboard, trackpad, glass display, a real hinge, deterministic `open` and `wake`. `createLaptop({screen:{title,status}})` paints a high-resolution editable dashboard; default still works without a screen option.
- **Smartphone**: machined frame and camera system, editable notification `{title,body,icon}`, `notify` and `turn`, displayed flat in desk compositions via an explicit placement transform.
- **Paper / invoice**: dimensioned A4-ish sheet with separate fiber edge, matte coated face and original printable canvas containing `sender`, `title`, `reference`, up to eight `rows`, `total`, `status`. The print stays as pixels on a textured planar surface rather than 3D extruded letters.
- **Folder**: opening hinged cover, pocket, contrasting lining, printed label and satin-brass details; `open`, `lift`, `slide`.
- **Pen**: metallic barrel, taper, rubber grip and clip; `lift`, `slide`.
- **Hardcover book**: cloth-bound boards, title print, rounded corners, gilt border, spine, patterned endpaper and a hinged front board; textured left/right leaves plus the reused physically bending page mesh. The `page-turn-story` adapter places the book horizontally on the walnut mat.

Not yet supplied: desktop monitor, tablet, notebook, receipt/statement variants, paper stack, envelope, office tools, or P1/P2 catalog. Do not substitute generic primitive placeholders for these missing models.

## Programmatic scene API

```ts
import { createEverydayDeskScene, evaluateEverydayCamera,
  validateEverydaySceneSpec, toEverydayBookSpec,
} from './registry/video/everyday-scenes-3d';
import { createEverydayObject } from './registry/craft/everyday-objects-3d';
import { evaluateEverydayInteraction } from './registry/craft/everyday-interactions';

const spec = {
  schemaVersion: 1 as const,
  id: 'customer-invoice', recipeId: 'invoice-to-software' as const,
  fps: {num:30, den:1}, durationFrames:150,
  width:1920, height:1080, deskFinish:'walnut' as const,
  content: {
    title:'Invoice handoff', caption:'From document to record',
    document:{title:'INVOICE',sender:'NORTH STUDIO',reference:'REF 0042',
      rows:[{label:'Research',value:'$ 220.00'}],total:'$ 220.00',status:'APPROVED'},
    software:{title:'Invoices',status:'Saved to records'},
  },
};
validateEverydaySceneSpec(spec);
const composition = createEverydayDeskScene(spec);
composition.pose?.({id:'play',frame:93,fps:30});
const camera = evaluateEverydayCamera(spec,93);
// After rendering, call composition.dispose() to free meshes and GPU textures.

const paper = createEverydayObject('invoice',{document:spec.content.document});
paper.pose?.({id:'lift',frame:36,fps:30});
paper.dispose();

const transfer = evaluateEverydayInteraction({
  from:[-4.2,.12,3.4],to:[-6.4,.12,-1.35],
  startFrame:42,endFrame:117,clearance:2.5,
},93);
// transfer.position and transfer.yaw are entirely determined by frame 93.
composition.dispose();
```

`EverydaySceneSpec` is JSON-serializable, including rational fps, even width/height, total frame count, content and optional finish. Validate externally supplied data before asset construction. A scene `pose` always resets its holders from their authored rest positions before evaluating a requested frame; no integration time, `requestAnimationFrame`, unseeded random values, or historical frame state are involved.

### Scene recipes

1. `cinematic-desk-explainer`: establishes the desk, opens laptop and subtly organizes a folder with an authored camera approach.
2. `invoice-to-software`: document print on the desk, arced lift/translation and a configurable software state shown on laptop. The transfer endpoint is staged beside the device instead of intersecting its display.
3. `epic-book-storytelling`: maps user-supplied 2–12 pages to the existing `page-turn-story`, opens the actual cover and then turns leaves; all frame timing is seekable.

The intended future recipes (investigation, phone/desktop handoff, workspace organization) are not marked complete by this implementation. Audio, narration and sound cues are authored by separate existing video systems. No remote texture, video, font, or license-uncertain asset is bundled in this kit.

### Interactions and named anchors

Each `HeroAsset.parts` map exposes stable pivots and inspectable geometry, for example `laptop-lid-hinge`, `phone-display`, `document-print`, `folder-front-flap`, `pen-barrel-axis`, `front-cover-hinge`, `turning-front-page`. A composed scene prefixes these names (`laptop/laptop-lid-hinge`, `invoice/document-print`, etc.). The whole scene also keeps `item-laptop`, `item-invoice`, `item-phone` holders, and the stage set offers `desk-back`, `mat-left`, `desk-right`, etc. to establish physical layout. Units are explicit (`metersPerUnit`: .05 set, .01 many objects, .1 book), and placement uses their true unit conversion.

`evaluateEverydayInteraction` uses smooth start/end timing with a bounded vertical clearance arch (zero lift at both endpoints), yaw interpolation, no surface intersection at the endpoints. It supports deterministic visual transfers. `lift`/`slide` are object-specific actions; open/notify/turn are executed by the object owners. Expanded semantics such as stacking or tapping are future work and must not be advertised as implemented.

### Camera, lighting and layouts

The recipe evaluator yields a physically motivated camera pose `{position,target,fov}` at any absolute frame; landscape and portrait use separately authored trajectories. The object gallery has five light styles: premium studio, warm documentary, daylight workspace, dramatic evening and neutral showcase. Existing physically based studio key/rim/shadow infrastructure performs the actual rendering. Test the matte paper, metallic device, and translucent/machined details under more than one preset before acceptance.

### Storybook and export

Every story lives under **Video Production → Scene Templates → 3D Everyday Objects**:

- `Object Gallery`: inspect individual objects, angle, finish, action, frame and five lighting presets.
- `Cinematic Desk Explainer`, `Invoice to Software`, `Epic Book Storytelling`: interactive frame-seeking player, direct 16:9 / 9:16 switch.
- Matching `* Capture` stories, plus a portrait invoice capture, use `VideoExportStage` with a fixed 150-frame manifest and no external media rights dependencies.

With Storybook running at port 6006 and a working Chromium/FFmpeg installation:

```sh
npm run storybook -- --host 127.0.0.1 --ci
KUMIKI_BROWSER_EXECUTABLE=/path/to/chromium npm run video:export -- \
  --story=video-production-scene-templates-3d-everyday-objects--invoice-to-software-capture \
  --output=dist/invoice-to-software.mp4
```

`KUMIKI_BROWSER_EXECUTABLE` is optional when Playwright's compatible browser is installed normally. The exporter preflights, captures exact PNG dimensions at each frame, encodes MP4 through FFmpeg, then decodes and checks the complete output with ffprobe. Inspect the produced video at normal playback speed too: automation is not visual approval.

## QA and honest limits

Unit tests check composition, quality gate, named pivots, frame seeking and reversible pose; browser tests check actual WebGL pixels at five nonsequential frames and portrait sizing. Close-up photographic realism is not guaranteed by typed geometry, and these are original procedural assets (not photogrammetry). At wide desk framing, fine print is necessarily small; use camera close-ups or screen-aligned 2D copy when text must be read at normal video scale. Browser/FFmpeg verification results and stills belong in the accompanying PR report.
