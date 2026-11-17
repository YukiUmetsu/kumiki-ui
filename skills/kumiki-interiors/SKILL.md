---
name: kumiki-interiors
description: Use when drawing, painting, animating or reviewing rooms and furniture in Kumiki in any art style (chairs, tables, desks, sofas, beds, cabinets, chests, bookcases, lamps, fireplaces, stoves, screens, period rooms such as a Tudor hall, Victorian parlour, Japanese washitsu or Chinese scholar's studio), especially when seats and tables are the wrong height for the people, furniture is from the wrong period or place, or a room is evenly lit with no pools of light.
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
5. **Review.** Render the pieces and rooms (`FurnitureShowcase`, `RoomLibrary`) and look at seat heights, legs and
   period details before calling it done.
