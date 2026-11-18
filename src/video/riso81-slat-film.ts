import type {FilmDocument} from "../../registry/video/film-document";

/** Three source-native exposures for the interleaved printed-paper slat mechanism. */
export const RISO81_SLAT_FILM:FilmDocument={
  schemaVersion:1,
  id:"riso81-interleaved-paper-slat-reveal",
  fps:{num:24,den:1},
  drift:0,
  outputs:[
    {id:"landscape",width:960,height:540},
    {id:"portrait",width:540,height:960},
  ],
  scenes:[
    {id:"stationary-original-print-and-retracted-slats",recipeId:"slot",
      durationFrames:36,
      content:{slot:"riso81-held",label:"Complete original cover with interleaved printed slats retracted"}},
    {id:"single-comb-threaded-through-ordered-paper-slots",recipeId:"slot",
      durationFrames:144,transition:{kind:"cut"},
      content:{slot:"riso81-pull",label:"One pull comb drives all printed slats through ordered paper slots"}},
    {id:"second-original-print-reconstructed-from-slats",recipeId:"slot",
      durationFrames:60,transition:{kind:"cut"},
      content:{slot:"riso81-revealed",label:"Second complete original two-ink image reconstructed from interleaved slats"}},
  ],
};
