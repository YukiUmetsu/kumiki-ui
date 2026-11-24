# Chinese ink wash — the INK1 brush

`ink-wash-core` is the vector brush under the RIG1 ink look: pressure-shaped strokes on an absolute frame, with flying white, spreading water and xuan-paper grain. `ink-brush` deposits wet ink into a paper-fibre raster.

**For pictures and films in Chinese ink use [INK-FILM1](chinese-ink-film.md)**, which replaces the earlier INK1 characters, landscapes and film stage.

- **Code:** [ink-wash.ts](../../registry/video/ink-wash.ts) (`InkWashSpec`, `evaluateInkWash`, `inkOutline`, `flyingWhite`, `inkPaperGrain`), [ink-brush.ts](../../registry/video/ink-brush.ts), [ink-wet-paper.ts](../../registry/video/ink-wet-paper.ts).
- **Stroke:** authored points with pressure, a brush width, tone, pigment load, water and a deposit timeline. `INK_TONES` names five values.
- **Time:** deposit, absorption, spreading and drying are pure functions of the frame.
- **Check:** `npx vitest run --project unit tests/ink-wash.test.tsx`.

## Making a video in Chinese ink

| Need | Use | Storybook (Video production / Film Looks) |
|---|---|---|
| A whole film, wide and upright | `InkFilm` data with `InkFilmPlayer` ([INK-FILM1](chinese-ink-film.md)) | Chinese Ink / Film |
| Handsome and beautiful figures | `ink-cast`: `inkShuiyue`, `inkQingfeng`, `inkMomei` | Chinese Ink / Characters |
| Places and weather | `ink-scenes` | Chinese Ink / Scenes |
| Plants, animals, land, buildings, marks | `INK_BOOK` | Chinese Ink / Motifs |
| Titles and seals in any script | `inkLettering`, `inkSeal` | Chinese Ink / Titles And Seals |
| A photograph as ink | `inkPicture` | Chinese Ink / Any Picture In Ink |
| Any rigged subject (people, animals, vehicles) | RIG1 `RigScene look="ink"` ([universal rig](universal-rig.md)) | Universal Rig / In Ink |
| Wet brush on paper, up close | `InkBrushCanvas` (`ink-brush`) | Chinese Ink / Ink Brush |
| Ink printed in spot colours | [INK-RISO1](ink-riso-press.md) | Risograph |

Put a RIG1 or other React layer over an ink film with `children` of the stage; keep its figures out of the caption area.
