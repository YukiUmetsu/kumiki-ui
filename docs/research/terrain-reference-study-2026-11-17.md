# GEO1 reference study: landscapes compared with photographs (2026-11-17)

**Pack:** `terrain` (GEO1). **Spec:** [terrain](../component-specs/terrain.md).
**Status:** agent study and agent review of renders. **Human visual review is not recorded.**

## Why

The first GEO1 landscapes had measured landforms and a physical sky, but six of the nine scenes shared one weakness:
meadow and forest rendered as large, smooth, leaf-like bumps. The Matterhorn-like range had pale rock with smooth
snow, the volcano a plain white cap, the coast a thin strip seen across empty water, and the rolling hills a carpet of
the same bumps.

This study compared each scene with photographs of the real landform and turned what they show into rules for the
heightfield, the ground covers and the camera.

## Method

1. **Search.** Wikimedia Commons was searched by landform and feature, keeping bitmaps at least 900 px wide and
   recording every file's author and licence.
2. **Study.** The images were laid on a board and studied at three scales:
   - macro: composition and silhouette;
   - meso: where snow, rock, forest and fields sit;
   - micro: grain, streaks, edges.
3. **Rights.** No image is copied or committed. The public-domain images were measured. The CC BY and CC BY-SA
   photographs were only looked at.
4. **Iterate.** Each change was rendered directly with `renderTerrain`, in four rounds, and compared with the board.

## Sources

| ID | Subject | Author | Licence | Used for |
| --- | --- | --- | --- | --- |
| fuji_0 | [Mount Fuji from the ISS](https://commons.wikimedia.org/wiki/File:ISS-46_Mount_Fuji,_Japan.jpg) | NASA / Scott Kelly | Public domain | snow fingers down radial ravines |
| dunes_0 | [Slip face of a Namib dune, Mars](https://commons.wikimedia.org/wiki/File:PIA20281_Slip_Face_on_Downwind_Side_of_Namib_Sand_Dune.jpg) | NASA/JPL | Public domain | brink and slip face (a Martian dune) |
| dunes_1 | [Proctor Crater dune field, Mars](https://commons.wikimedia.org/wiki/File:Proctor_Crater_Dune_Field.jpg) | NASA/JPL/University of Arizona | Public domain | dune crests from above |
| matterhorn_0 | [Matterhorn north face](https://commons.wikimedia.org/wiki/File:Matterhorn_-_North_face_(2).jpg) | duo | CC BY-SA 2.0 fr | observation only |
| matterhorn_1 | [Matterhorn north face](https://commons.wikimedia.org/wiki/File:Matterhorn_(north_face).jpg) | Franco Pecchio | CC BY 2.0 | observation only |
| cliffs_0 | [Seven Sisters panorama](https://commons.wikimedia.org/wiki/File:Seven_Sisters_Panorama,_East_Sussex,_England_-_May_2009.jpg) | Diliff | CC BY-SA 3.0 | observation only |
| hills_0 | [Palouse rolling fields of wheat](https://commons.wikimedia.org/wiki/File:Palouse_Rolling_Fields_Of_Wheat_(230934259).jpeg) | Dana Hutchinson | CC BY 3.0 | observation only |
| monument_0 | [Elephant Butte, Monument Valley](https://commons.wikimedia.org/wiki/File:Elephant_Butte_in_Monument_Valley.jpg) | Dsdugan | CC BY-SA 4.0 | observation only |
| monument_1 | [Monument Valley at sunset](https://commons.wikimedia.org/wiki/File:Monument_Valley_Sunset_MC.jpg) | Christian Mehlführer | CC BY 2.5 | observation only |
| yosemite_0 | [Tunnel View, Yosemite Valley](https://commons.wikimedia.org/wiki/File:Tunnel_View,_Yosemite_Valley,_Yosemite_NP_-_Diliff.jpg) | Diliff | CC BY-SA 3.0 | observation only |

The search for the Bernese Alps returned nothing large enough. The dune references are Martian dunes: they show a dune's
form (brink, slip face) but not Earth's colours.

## Observations → rules

### Forest: Yosemite Valley floor and the slopes in every mountain photograph

**Seen**

- From a distance a conifer forest is a dark, finely textured surface of pointed tops.
- Individual crowns show only near by.
- There are no smooth domes and no bright rims between crowns.

**Was:** domes 6 and 11 m across, with dark rims. Their height swung by half, sampled coarsely, so near by they read
as crumpled leaves.

**Rules**

- Conifers on mountains are cones 4.5 and 7 m across; broadleaf crowns on lowland hills are domes 7 and 12 m.
- Crown heights vary by 40%, not 55%.
- Foliage clumps about a metre across brighten and tilt the light near by and average out beyond about 700 m.
- The shade between crowns is halved.
- Trees cast shadows: the shadow march sees the canopy.

### Farmland: the Palouse

**Seen**

- A patchwork of fields a few hundred metres across: deep green wheat, pale gold, ploughed brown.
- The boundaries curve with the land.
- Fine stripes follow the contours.
- Small woods stand round farmsteads.
- The photograph is taken from above (Steptoe Butte).
- The hills are small loess hills a few hundred metres across, set on broad swells.

**Rules**

- Fields are Worley cells about 260 m across, domain-warped so their edges curve, with one crop each from a measured
  palette.
- Drill rows run along the contours, 2 m apart in height, fading with distance.
- A darker line marks each field's edge.
- Woods are patches a few hundred metres across. Their edges are full-height walls of trees with ragged outlines; the
  grid's ramp had turned every copse into a cone.
- The ground beside a wood takes its normal from the ground alone; the wood's wall had tilted it into a pale rim.
- The camera looks down from 170 m.
- The heightfield adds hills at 1/11 of the field.

### Snow on steep rock: the Matterhorn's north face

**Seen**

- The rock is dark grey-brown, not pale.
- Snow clings to ledges in broken bands along the strata and fills the couloirs.
- Snowfields on gentler slopes are smooth.
- The snow's edges are crisp.

**Rules**

- Fold-range rock is gneiss: the granite colour mixed half with near-black, banded by tilted strata.
- On 45–75° faces, snow lies on ledges along the strata (period about 20 m). It sits in patches drawn out along the
  bands (the noise is stretched along the face) and down the gullies.
- The snowline's transition narrowed from 200 m to about 100 m, roughened by fine noise.
- Near faces carry fractured relief in their own plane.

### Snow fingers: Fuji from the ISS

**Seen**

- The snow cap's lower edge breaks into long white fingers down the radial ravines.
- The cone is dark grey-brown.

**Rules**

- Concavity is measured on the heightfield: the mean height a cell and a half round a point, minus its own.
- In gullies the snow line drops by up to 480 m on a volcano (260 m elsewhere); on spurs it rises.
- The volcano's radial ravines are deepened to 0.06 of the relief.
- Scoria is dark grey-brown, not red.
- The story's volcano shows winter snow.

### Chalk coast: the Seven Sisters

**Seen**

- White cliffs whose tops rise and fall over dry valleys (the "sisters"), capped with grass.
- A dark shingle beach under them.
- Milky green-blue water over the shallows, with a white line of surf.
- The photograph looks along the coast.

**Rules**

- The coast's heightfield is chalk downs cut by seven dry valleys to the field, rising inland.
- A 2 m shingle beach, then a rock platform 1–2 m under the water, then the sea floor.
- No fine relief below 3–12 m: it had broken the platform into islands.
- The past-the-edge land continues the shape, so the cliffs run on to the horizon.
- Chalk is white, with faint flint bands and vertical runnels.
- Water over depths under 7 m turns green-blue. A swash line runs at the water's edge, and broken breakers mark the
  platform's edge.
- The default camera stands 240 m off the cliff foot, 22 m up, looking along the cliffs.

### Mesas: Monument Valley

**Seen**

- Uniform red-orange walls with dark desert varnish hanging in vertical streaks.
- Red talus slopes with ledges below.
- A red sandy floor dotted with dark shrubs.

**Rules**

- Varnish is noise stretched vertically, darkening steep faces by up to half.
- Talus is red, on slopes of 22–30°.
- The floor is sand mixed 70% with sandstone.
- Shrubs are dark specks on flat ground within 1.5 km.
- The floor's crumpled relief is cut to a third.

### Granite walls: Yosemite

**Seen**

- Light grey walls with dark vertical water streaks.

**Rule**

- Granite's streaks were strengthened: darker by up to a third, stretched to 240 m vertically.

## What changed in code

- `geo-render.ts`:
  - covers, crowns, farmland, snow on steep rock, gully and spur snow, rock grain;
  - shingle, shallow water and surf;
  - the canopy in shadows, ground normals beside woods, fractured rock;
  - the coast and hills cameras.
- `geo-terrain.ts`:
  - the coast's downs, beach and platform;
  - smaller hills on the swells;
  - deeper volcanic ravines;
  - the coast continuing past the edge.

## Remaining gaps

- Dunes have no wind ripples. Their brink could be crisper.
- At the nearest distances rock is still noise, not modelled blocks.
- The U-valley's granite reads close to white in full sun.
- No human visual review is recorded.
