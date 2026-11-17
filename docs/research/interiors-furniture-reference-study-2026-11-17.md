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

## Second round: church, Japanese rooms, trend rooms, craft

The owner asked for the details of a church interior, for interesting rooms found online and on Pinterest, and for
Japanese interiors; then, mid-way: "current implementation needs more craftsmanship, details, realism".

### Sources

| Subject | Fact used | Grade | Source |
| --- | --- | --- | --- |
| Chartres elevation | three storeys: arcade, a thin triforium, a clerestory as tall as the arcade; quadripartite vaults; plate tracery (two lancets under a rose) | reported | [Britannica: Chartres Cathedral](https://britannica.com/topic/Chartres-Cathedral), [Ohio State: Chartres Cathedral](https://ohiostate.pressbooks.pub/exploringarchitectureandlandscape/chapter/chartres-cathedral/), [chartrescathedral.net](https://chartrescathedral.net/?p=214) |
| Gothic proportions | Amiens vault about 42 m over a 14.6 m nave; the arcade about half the height | reported | [Wikipedia: Amiens Cathedral](https://en.wikipedia.org/wiki/Amiens_Cathedral), [Structurae](https://structurae.net/en/structures/amiens-cathedral) |
| Compound piers, groins | piers of a core and four colonnettes; vault cells meet in groins carried by ribs | reported | [Wikipedia: High Gothic](https://en.wikipedia.org/wiki/High_Gothic) |
| Tatami | mats laid so that no four corners meet (shūgi-jiki); heri on the long edges | reported | [JAANUS: tataminome](https://www.aisf.or.jp/~jaanus/deta/tOri/tataminome.htm), [kyo-tatami: chashitsu](https://kyo-tatami.com/world/chashitsu/) |
| Tea room | four and a half mats; the ro cut in the floor; nijiriguchi about 60 cm; earth walls; low, partly sloping ceiling; windows showing their lattice | reported | [Wikipedia: Chashitsu](https://en.wikipedia.org/wiki/Chashitsu), [Musubi Kiln: inside a chashitsu](https://musubikiln.com/blogs/journal/inside-chashitsu-the-japanese-tea-room) |
| Shoin room | tokonoma with tokobashira, chigaidana, fusuma, shoji, ranma, nageshi; battens parallel to the alcove | reported (shoin parts), estimated (heights) | [towa: washitsu and sukiya](https://towa-aq8.pages.dev/en/knowledge/washitsu-sukiya/) |
| Trend rooms | Pinterest's 2026 trend reports: Japandi calm, natural materials, Cotswold-cottage interiors, dark warm palettes, period detail, aged metals | observation only (trend press, not a measured source) | [Decoholic](https://decoholic.org/the-pinterest-predicted-interior-trends-about-to-explode-in-2026/), [Mala Art Co](https://malaartco.com/blogs/news/2026-home-trends-according-to-pinterest-predicts), [Shrops Design](https://shrops-design.co.uk/blogs/news/interior-design-trends-2026-pinterest-predicts-luxury-home-styles) |
| Church furniture, Japanese pieces | pew pitch, altar height, pulpit height, andon, hibachi, kotatsu, byōbu leaf size | estimated (furnishing guides and common knowledge; not sourced here) | — |

The trend rooms are original designs from what the boards show in general (materials, palettes, pieces), not copies of
any one pinned image.

### Rules in the code

- A vault is two crossing tunnels of the *same* profile stretched to the bay, or the ribs float off the groins.
- Stained glass is mostly blue and ruby with small whites; its light indoors is a weak, coloured pool, not a white
  patch; a dim church is metered low so the glass glows.
- Japanese rooms are laid out from the mat: no four corners meet, posts stand on the module, the tokonoma takes one ken.
- A room reads as built through its joinery: skirting, cornice, rails, panelling, sills, architraves, glazing bars,
  curtains, a door, pictures, and a few lived-in objects.

### Faults found in review and fixed

- The first vault's cross tunnels were lower than the main tunnel, so the diagonal ribs floated; the apse half-dome hid
  its windows. Both rebuilt (stretched cells; one cell per apse face).
- About thirty stained windows let in clear-glass sky light and the sun shafts were scaled by the whole ray length, so
  the church glowed white; glass now transmits a sixth, shafts are capped and occluded.
- Glass emission blew out to pastel; measured exposure (7.2×) and set emission so the palette shows.
- The reredos niches were cut only through a thin face, hiding the saints; the eagle was a blob under a board.
- Open gables in the minka showed sky; the tea room's windows were not cut and its back wall closed the alcove.
- Shaft samples read as grain in every sunlit room; they are now smoothed in their own buffer.
- Fireplaces sat inside the wall once panelling was added; they now stand in chimney breasts.
- Copper pans mirrored the room and read as white plates; banker's lamp shade and globe were wrong shapes.

## Limits

See the spec. Human visual review is not recorded.
