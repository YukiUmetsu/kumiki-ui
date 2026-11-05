# Object Story

**Registry item:** `object-story`
**Source:** `registry/video/object-story.ts`, `registry/video/object-story-react.tsx`

## Purpose

A narrated scene where the same objects stay on stage and every spoken phrase changes something the viewer can see. It replaces a sequence of text cards with a small film of objects that arrive, count, connect, hand things over and get measured. It suits faceless explainers, where the picture alone has to hold attention.

## Story

```ts
const compiled = compileObjectStory({
  schemaVersion: 1, id: "billing-gap", fps: { num: 30, den: 1 }, durationFrames: 240, width: 1920, height: 1080,
  objects: [
    { id: "bill", label: "Bill", art: "invoice", value: { format: { kind: "currency", currency: "USD", precision: 0 } } },
    { id: "slip", label: "Slip", art: "receipt", value: { format: { kind: "currency", currency: "USD", precision: 0 } } },
  ],
  beats: [
    { id: "bill-total", startFrame: 0, endFrame: 120, arrangement: { kind: "solo", objects: ["bill"] },
      caption: { text: "The bill says $120", emphasis: ["$120"] }, ops: [{ kind: "set-value", object: "bill", value: 120 }] },
    { id: "slip-total", startFrame: 120, endFrame: 240, arrangement: { kind: "pair", objects: ["bill", "slip"] },
      caption: { text: "The slip says $100" }, ops: [{ kind: "set-value", object: "slip", value: 100 },
        { kind: "measure-gap", a: "bill", b: "slip", label: "$20", atFrame: 180 }] },
  ],
}, { measure: createStoryTextMeasure() });
```

Then draw any frame:

```tsx
<ObjectStory plan={compiled.plan} frame={frame} renderObject={(object, size) => <MyArt name={object.art} {...size} />} />
```

- A **beat** is one spoken phrase. Beats run end to end, with no gaps.
- An **arrangement** (`solo`, `pair`, `row`, `stack`, `ring`) names everything on stage. An object added to it arrives, a kept one travels to its new place, and one left out exits.
- **Operations** say what changes: `set-value`, `level`, `connect`, `disconnect`, `transfer`, `absorb`, `measure-gap`, `mark`, `highlight`. Each must finish inside its beat. A link lasts while both ends stay on stage and bows over objects between them. A mark lasts for its beat unless it sets `persist`. `level` fills a meter from 0 to 1, for how much of something there is when no figure is known, so it shows a direction without implying a measurement.
- `focus` pushes in on one object and quiets the others. `carried` starts a story with objects already on stage, so a scene can continue the previous one.

## Text

Labels sit under their objects. The one caption per beat goes through `planExplainerLayout`, so it is measured with real font metrics and placed clear of every object. It reveals word by word, and Japanese reveals by character. A kept caption is placed again if the stage moves, without replaying its reveal. If it cannot fit at the smallest size the compile fails with `caption-no-room`. It never overlaps.

## Pacing

`plan.pacing` reports the frame ranges with a visible change, the longest wait between them and changes per minute. A beat that changes nothing is a `beat-without-change` error, unless it declares `hold: true`. A wait above `maxStillSeconds` (2.5 s by default) is a `still-stretch` warning that names the frame. Camera push and caption reveal do not count as changes, so they cannot hide an empty stretch.

## Diagnostics

`invalid-spec`, `unknown-object`, `unknown-arrangement`, `beat-order`, `beat-gap`, `op-outside-beat`, `object-not-on-stage`, `value-not-declared`, `level-out-of-range`, `no-link`, `beat-without-change`, `caption-no-room`, `too-many-objects`, `still-stretch`.

## Rendering and accessibility

`renderObject` supplies the art, so the stage works with any illustration set or photo. Colours come from `--km-shot-*` tokens. `settled` shows each beat's finished state for reduced motion. State is a pure function of the frame, so shuffled seeks match linear playback.

## Limits

Beat timing comes from the caller. It is as exact as the narration timing supplied. Arrangements are fixed layouts of up to six objects, not a free canvas.
