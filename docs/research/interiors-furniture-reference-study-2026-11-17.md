# INTERIOR1 study: furniture and rooms (2026-11-17)

**Pack:** `interiors-furniture` (INTERIOR1). **Spec:** [interiors and furniture](../component-specs/interiors-furniture.md).
**Status:** agent study and agent review of renders. **Human visual review is not recorded.**

## Why

The owner asked for a building interior and furniture art framework after the ARCH1 storybook plates and modules.
Rooms and furniture must be at the body's scale and true to their period and place, in any art style.

## Sources

| Subject | Fact used | Grade | Source |
| --- | --- | --- | --- |
| Seat and table | dining seat 43–47 cm with a 75 cm table; 46–48 cm for taller users with 74–76 cm tables; 25–30 cm seat to table | reported (furniture guides, not a primary standard) | [Studio Matrx ergonomics guide](https://www.studiomatrx.org/guides/furniture-ergonomics-guide-india), [buildstatus](https://buildstatus.puri.sm/height-standard-dining-table) |
| Desks and counters | desks 72–76 cm; kitchen counter 36 in (91 cm) | reported | [Popular Woodworking, drafting tables](https://popularwoodworking.com/wp-content/uploads/2010/10/Drafting_Design_Drawing_Tables.pdf) |
| Caveat | standard sizes were calibrated on Western, largely male bodies | reported | furniture ergonomics guides above |
| Thonet No. 14 | 1859; six steam-bent parts, ten screws and two nuts; 36 chairs to a crate | reported | [Wikipedia: No. 14 chair](https://en.wikipedia.org/wiki/No._14_chair), [Brooklyn Museum](https://brooklynmuseum.org/opencollection/print/object/209949) |
| Windsor chairs | strength from wet-dry joinery and long grain; turned splayed legs and a spindle back | reported | [Fine Woodworking: a short history of styles and forms](https://www.finewoodworking.com/2005/11/01/a-short-history-of-styles-and-forms) |
| Chippendale | cabriole legs ending in ball or claw feet, more ornate than Queen Anne | reported | Fine Woodworking (above) |
| Shaker chairs | no arms, ladder backs | reported | [Invaluable furniture guide](https://www.invaluable.com/blog/invaluable-guide-to-buying-furniture/) |
| Tansu | iron-decorated chests | reported (construction not sourced here) | collectors' guides |
| Ming chairs, mattress sizes, clearances | horseshoe and official's hat forms, joined without nails; UK, US and futon sizes; walkways and hearth space | estimated (common knowledge; not sourced in this study) | — |

## Rules in the code

- Build every piece round the seat and table heights; check with `checkFurniture`.
- Make parts the way joiners make them: turned legs with vases and beads, cabriole legs that swell at the knee, splats
  that follow the spine, drawers with handles, framed carcases, buttoned leather.
- Low cultures sit low: cushions, low tables and futons, seen from a standing eye.
- Light rooms through their windows: sky light falls off with distance, so the far corners stay dark; fires, candles
  and lamps make warm pools.

## Faults found in review and fixed

- `room()` did not place its own parts, so a room moved with the first piece placed after it (the Alpine Stube and the
  Art Deco lounge); it now places itself.
- Dark panelled rooms came out pale: exposure now also keeps the brightest few per cent from burning out, and interior
  sky light comes only through the windows.
- Low pieces (a futon, a chabudai) were seen from too low; they are now seen from a standing eye.
- The tiled stove's tiles read as pipes; they are now square glazed tiles.

## Limits

See the spec. Human visual review is not recorded.
