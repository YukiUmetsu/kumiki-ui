---
name: kumiki-costume
description: Use when dressing any person or character in Kumiki in any art style for a place, a period, a role or an occasion (traditional, historical, folk or modern clothing anywhere in the world), especially when costume is chosen by period alone, mixes countries or centuries, the wrong side of a wrap is on top, or a garment's silhouette (sleeves, skirts, drapes, hats) is guessed.
---

# Kumiki clothing and costume (COSTUME1)

The pack `costume` decides *what people wore, where, when and by whom*. Your style decides *how it looks*. Read the
[spec](../../docs/component-specs/costume.md) for the API; this is the working order.

1. **Query by tags, not by period alone.**
   - Use `findOutfits` and `findGarments` from `registry/costume/costume-query.ts`, for example
     `"region:eastern-asia year:1780 worn:women occasion:festival"`.
   - Regions follow the UN M49 tree: "asia" finds Japan and India.
   - Use `country:` (ISO codes), `era:` (heian, edo, joseon, ming, victorian …), `role:`, `slot:`, `cut:`,
     `fabric:` and `climate:`.
2. **Read the record.** Check the period's grade (reported or estimated), the description and the drawing notes.
   Never mix garments from different places or centuries unless the scene means it.
3. **Construct, then paint.**
   - `garmentShape(g)` (or `CostumeFigure`) gives the front-view construction on ANAT1's measured person: hem and
     sleeve lengths, skirt spread, trousers, bands, drapes and hats.
   - Paint over it in your style.
   - Keep the details that identify a garment: left over right for kimono and hanfu (the top collar runs from the
     viewer's right down to the left, a "y"), the sari's end over the left shoulder (the viewer's right), the
     kamishimo's wings, the furisode's hanging sleeves, the hakama's five front pleats.
   - **Fold by the cloth** (`registry/costume/costume-drape.ts`):
     - soft silk makes many narrow folds, stiff wool, brocade or skins a few broad ones (`bendingLength`,
       `foldSpacing`);
     - folds hang from supports (obi, sash, waistband) and deepen with the extra cloth;
     - swags sag between held points;
     - sleeves bunch at the elbow.

     The shape gives `foldShadow`, `foldRidges`, `drapeFolds`, collars, linings, cords, buttons and pleats to paint
     over.
4. **Re-use.** Check `styles` first: UKIYO1 already draws Edo townsfolk (`ukiyoeWardrobe(role)`) and the Heian
   court (`ukiyoe-heian`).
5. **Add a garment.**
   - Cite its article or a museum record.
   - Grade its period (reported only when the source states it).
   - Tag it with region, countries, period, wearer, occasions, slot and cut.
   - Give its silhouette only if the defaults miss its shape.
   - `tests/costume.test.tsx` must pass.
