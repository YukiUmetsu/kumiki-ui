import type {FilmDocument} from "../../registry/video/film-document";

/** An entire separately authored two-drum print shares just one set of
 * stencils from folded close to open. Absolute 24fps FilmStage time only. */
export const RISO78_ACCORDION_FILM:FilmDocument={
  schemaVersion:1,id:"riso78-original-continuous-riso-leporello",
  fps:{num:24,den:1},drift:0,
  outputs:[
    {id:"landscape",width:960,height:540},
    {id:"portrait",width:540,height:960},
  ],
  scenes:[
    {id:"closed-original-print-leporello",recipeId:"slot",durationFrames:40,
      content:{slot:"riso78-closed",label:"One closed original printed paper accordian"}},
    {id:"unfolding-single-original-ink-master",recipeId:"slot",durationFrames:144,
      transition:{kind:"cut"},
      content:{slot:"riso78-unfold",label:"One continuous print unfolds on alternate physical paper creases"}},
    {id:"full-original-flat-edition",recipeId:"slot",durationFrames:64,
      transition:{kind:"cut"},
      content:{slot:"riso78-open",label:"Full original two-drum artwork, no lost ink source details"}},
  ],
};
