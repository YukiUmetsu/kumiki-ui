# Subject-led explainer shots

Photo-first composition for a sentence that names a real thing. ContentGen chooses the spoken words, licensed image, diagram and absolute reveal frame; Kumiki renders only those inputs. This does **not** perform search, relevance classification or asset licensing.

## Components

- `SubjectStage`: one prominent subject and a legible explanation. Landscape subject (120,220,980×640), explanation (1140,220,660×640). Portrait subject (116,420,848×620), explanation below. Without a subject the diagram gets the full safe width.
- `DeviceFrame`: flat laptop, monitor or phone bezel; supplied screenshot is **contained**, never cropped. Optional screenshot highlight uses normalized screen coordinates and only appears at the one change frame. The bezel never animates.
- `IconPlate`: square 280×280 supplied mark (contained) or an original generic ledger graphic. A name of at most 40 characters and an already-sourced claim accompany it.
- `evaluateOneChangeHold`: pure frame evaluator with one reveal frame, no state or timers. All visual changes use the same `sample.changed` flag.

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
  explanation={sample=><CauseDiagram connected={sample.changed} />}
/>
```

Only highlight a genuinely identified region of the screenshot. Omit `highlight` when no reliable region is known. Do not guess vendor logos or invent a device for a sentence that is only about a paper receipt. Use `mode:"scene"` for a receipt photograph, `mode:"icon"` for a licensed square mark (or original ledger glyph), or omit `subject` for diagram-only.

## Registry installation

Install `subject-stage`. Its registry dependency closure includes `device-frame`, `icon-plate` and `one-change-hold`, all independently installable.

Storybook: **Motion / Subject Led Explainers**. Check 3188, 3211, 3212, 3213, 3400 and 3487 with landscape and portrait toggles. Example graphics are original deterministic SVG fixtures, not authentic third-party accounting screenshots.

No continuous camera drift is applied to screens or icons. Scene photos may be edited by the caller, but camera motion is outside this recipe.
