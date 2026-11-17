import type {FilmDocument} from "../../registry/video/film-document";

/** Real 24fps FilmStage bridge. This is an original print-to-print
 * physical paper collage, not a new video player or crossfade. */
export const RISO76_TORN_COLLAGE_FILM:FilmDocument={
  schemaVersion:1,
  id:"riso76-original-torn-zine-collage",
  fps:{num:24,den:1},
  drift:0,
  outputs:[
    {id:"landscape",width:960,height:540},
    {id:"portrait",width:540,height:960},
  ],
  scenes:[
    {id:"first-original-edition",recipeId:"slot",durationFrames:52,
      content:{slot:"riso76-original",label:"Original print I: ocean currents",
        props:{edition:1}}},
    {id:"torn-paper-relief",recipeId:"slot",durationFrames:120,
      transition:{kind:"cut"},
      content:{slot:"riso76-collage",
        label:"A ragged hand-torn fibre edge reveals a second original printed zine"}},
    {id:"second-original-edition",recipeId:"slot",durationFrames:60,
      transition:{kind:"cut"},
      content:{slot:"riso76-next",
        label:"Original print II: branching delta, with full ink detail"}},
  ],
};
