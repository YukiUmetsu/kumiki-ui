# Subject-led explainer shots

Photo-first composition for a sentence that names a real thing. ContentGen chooses the spoken words, licensed image, diagram and absolute reveal frame; Kumiki renders only those inputs. This does **not** perform search, relevance classification or asset licensing.

## Components

- `SubjectStage`: one prominent subject and a legible explanation. Landscape subject (120,220,980×640), explanation (1140,220,660×640). Portrait subject (116,420,848×620), explanation below. Without a subject the diagram gets the full safe width.
- `DeviceFrame`: flat laptop, monitor or phone bezel; supplied screenshot is **contained**, never cropped. Optional screenshot highlight uses normalized screen coordinates and only appears at the one change frame. The bezel never animates.
- `IconPlate`: square 280×280 supplied mark (contained) or an original generic ledger graphic. The name (≤40 characters) stays visible; the sourced claim (≤88 characters) appears at the cue. An icon plate owns the claim, so there is no duplicate stage caption.
- `evaluateOneChangeHold`: pure frame evaluator with one reveal frame, no state or timers. The change-specific flags are `showConnector` (`connect`), `emphasizeSubject` (`show`), `showNextStep` (`move`), `showComparison` (`compare`), and `showRing` (`ring`). The caption appears only after the cue. A verified device highlight is eligible only for `connect` or `show`.

## Bookkeeping example

The utterance is “Accounting software files each invoice from the inbox into the ledger.” The window is `[3188,3488)` and the one change occurs at absolute frame `3212`. At frame 3188, show a ledger screenshot in a laptop and the inbox node only. At frame 3212 show the verified screenshot row highlight, the inbox-to-ledger connector and “software files each invoice”. Hold without any additional movement through frame 3487. Seeking back to 3190 reconstructs the earlier state.

```tsx
const window = { startFrame:3188,endFrame:3488,changeFrame:3212,change:"connect" } as const;
<SubjectStage frame={frame} window={window} orientation="landscape"
  subject={{
    mode:"device",device:"laptop",src:licensedScreenshot,alt:"Ledger interface",
    highlight:{x:.08,y:.42,width:.84,height:.12}
  }}
  title="Where does the invoice go?" caption="software files each invoice"
  explanation={sample=><CauseDiagram connected={sample.showConnector} />}
/>
```

Only highlight a genuinely identified region of the screenshot. Omit `highlight` when no reliable region is known. Do not guess vendor logos or invent a device for a sentence that is only about a paper receipt. Use `mode:"scene"` for a receipt photograph, `mode:"icon"` for a licensed square mark (or original ledger glyph), or omit `subject` for diagram-only.

## Registry installation

Install `subject-stage`. Its registry dependency closure includes `device-frame`, `icon-plate` and `one-change-hold`, all independently installable.

Storybook: **Video Production / Subject Led Explainers**. Check 3188, 3211, 3212, 3213, 3400 and 3487 with landscape and portrait toggles. Example graphics are original deterministic SVG fixtures, not authentic third-party accounting screenshots.

## Composition, typography, and color

The root composition is a CSS inline-size container. Title/caption font sizes use `cqw` against the actual frame width, **not** the browser viewport. The entire SVG/device/diagram scales with its region. When composing a real diagram, author layouts for the region's output coordinates: 660×640 in landscape, 848×540 in portrait; the Storybook bookkeeping example uses Kumiki's existing `DiagramStage` and `createDiagramTimeline` instead of drawing another animation engine.

Consumers can customize the visual language with inherited CSS variables, including `--km-shot-surface`, `--km-shot-ink`, `--km-shot-muted-ink`, `--km-shot-accent`, `--km-shot-font`, `--km-shot-subject-surface`, `--km-shot-node`, and `--km-shot-device-*` metal/bezel/glass colors. `accent` and `background` props remain supported.

No continuous camera drift, interpolation, or looping decoration occurs in any shot; a reduced-motion toggle would not change the result. Scene photos may be cut or moved by a separate caller, but not inside this hold recipe.

## QA

The Storybook gallery includes laptop, monitor, phone with an actual portrait-oriented UI asset, screenshot-only, icon, generic glyph, receipt scene, diagram-only, and individual semantic-action examples. Seek 3211 → 3212 → 3400 → 3211 to verify the one-frame change, unchanged hold and reversible state.

Run:
```bash
npm run typecheck
npm run test -- tests/subject-led-explainer.test.tsx
npm run catalog:check
npm run registry:validate
node scripts/registry-fixture.js --item=subject-stage
npx playwright test -c playwright.storybook.config.ts tests/e2e-storybook/subject-led-explainer.spec.ts
```
The browser test compares stage pixels at 3212 and 3400 and saves both landscape and portrait screenshots for visual inspection.
