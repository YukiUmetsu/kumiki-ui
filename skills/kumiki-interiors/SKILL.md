---
name: kumiki-interiors
description: Use when drawing, painting, animating or reviewing rooms and furniture in Kumiki in any art style (chairs, tables, desks, sofas, beds, cabinets, chests, bookcases, lamps, fireplaces, stoves, screens; period rooms such as a Tudor hall, Victorian parlour or Chinese scholar's studio; a Gothic church interior with pews, pulpit, altar and stained glass; Japanese rooms with tatami, shoji, fusuma, tokonoma, a tea room or an irori; Japandi, dark-academia or cottage-kitchen rooms), especially when seats and tables are the wrong height, furniture is from the wrong period or place, a room is a bare box with no joinery, or it is evenly lit with no pools of light.
---

# Kumiki interiors and furniture (INTERIOR1)

The pack `interiors-furniture` decides *how big, how made and from when*. Your style decides *how it looks*. Read the
[spec](../../docs/component-specs/interiors-furniture.md).

1. **Start from the body.** Seats about 45 cm, tables about 75 cm, 25–30 cm between them, counters about 90 cm
   (`ERGONOMICS`). Floor-seated rooms are lower throughout.
2. **Pick pieces by period and place** (`FURNITURE_TYPES`). Use their sizes and construction notes, and build them with
   `buildFurniture(b, id)`; `checkFurniture` checks the heights.
3. **Furnish a room by its style** (`INTERIOR_STYLES`): walls, floor, ceiling and light, then the pieces. Leave the
   clearances (`CLEARANCES`).
4. **Light a room through its windows**, then add fires, candles and lamps. Keep the far corners dark.
5. **Give the room its joinery and objects** (`RoomSpec.trim`): skirting, cornice, dado and panelling, sills,
   glazing bars, curtains, a door, pictures; then the lived-in things of its place. A bare box reads as a blockout.
6. **Churches:** build the nave with `gothicNave` (piers, arcade, triforium, clerestory, exact rib vaults, apse), use
   `stained` glass with pattern `medallion` or `rose`, meter low (`Mood.key`) so the glass glows; furnish with
   `chairRows`, pulpit, lectern, altar and reredos, coronas.
7. **Japanese rooms:** lay `tatami` from `TATAMI_LAYOUTS` (no four corners meet) and build from the mat
   (`washitsu`, `chashitsu`, `minkaIrori`, or their parts); open shoji onto a garden with `interiorBox` and `Mood.burn`.
8. **Make materials read as real:** paint room plates with a light wash (paint about 0.55, ink 0.5); give windows a
   view (`view: "garden"`) and expose for the room; use the knotted `rug`, wood that shows its figure, stone with its
   tooling. Look at a close-up of the hero element (a pier, a capital, a rug, a board) before calling it done.
9. **Review.** Render the pieces and rooms (`FurnitureShowcase`, `RoomLibrary`) and look at seat heights, legs and
   period details before calling it done.
