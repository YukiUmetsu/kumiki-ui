---
name: kumiki-architecture
description: Use when drawing, painting, animating or reviewing buildings in Kumiki in any art style (houses, town streets, temples, castles, farmhouses, classical columns, apartment blocks), especially when doors are the wrong size for the people, storeys are too tall or short, roofs have the wrong pitch for their covering or climate, ordinary town roofs curve like temples, columns are too fat or thin, or a street of houses is all copies.
---

# Kumiki architecture (ARCH1)

The pack `architecture` decides *how big and how built*. Your style decides *how it looks*. Read the
[spec](../../docs/component-specs/architecture.md).

1. **Start from a person.** Doors are about 2 m tall, storeys about 3 m floor to floor, and windows sit about 0.9 m
   above the floor (`HUMAN_SCALE`). Check stairs with `checkStair` (2 risers + 1 tread ≈ 63 cm).
2. **Pick the type by place and period** (`BUILDING_TYPES`). Use its storeys, bays, roof and notes, then build it with
   `buildingElevation(type, { seed })` and paint the parts by role.
3. **Roofs.**
   - The pitch follows the covering and the climate (`ROOF_PITCHES`): thatch is steep, clay tile low, and a flat roof
     hides behind a parapet.
   - Town roofs are straight; temples and castle keeps curve (their eaves sag and lift at the corners).
4. **Columns** are their order's height in diameters (`CLASSICAL_ORDERS`), spaced 1.5–4 diameters apart.
5. **Streets.** Neighbours share walls and vary a little: use a different seed per house in `StreetElevation`. Never
   copy one facade.
6. **Review.** Put a person beside the door and compare storey heights and the roof pitch with the type. Record what
   you checked.
