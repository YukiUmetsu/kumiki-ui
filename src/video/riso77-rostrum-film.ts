import type {FilmDocument} from "../../registry/video/film-document";

/** Absolute 24fps original Rostrum stage: intro sheet, independent staggered
 * cutout mount, and intact final physical collage. The stop-motion cadence
 * lives inside the source slot, not in an invented animation engine. */
export const RISO77_ROSTRUM_FILM:FilmDocument={
  schemaVersion:1,
  id:"riso77-original-print-cutout-rostrum",
  fps:{num:24,den:1},drift:0,
  outputs:[
    {id:"landscape",width:960,height:540},
    {id:"portrait",width:540,height:960},
  ],
  scenes:[
    {id:"uncovered-original-print",recipeId:"slot",durationFrames:36,
      content:{slot:"riso77-original",
        label:"Original cobalt and vermilion ocean-current artwork"}},
    {id:"independent-paper-mounted-cutouts",recipeId:"slot",durationFrames:144,
      transition:{kind:"cut"},
      content:{slot:"riso77-rostrum",
        label:"Three independently printed physical paper cutouts land on the edition"}},
    {id:"finished-cutout-edition",recipeId:"slot",durationFrames:72,
      transition:{kind:"cut"},
      content:{slot:"riso77-hold",
        label:"Finished multilayer original Risograph cut-paper editorial spread"}},
  ],
};
