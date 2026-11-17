import type {FilmDocument} from "../../registry/video/film-document";

/** Three FilmStage exposures for one complete separately printed cover and
 * insert: the source ink is finished before the first paper cut moves. */
export const RISO79_PULL_TAB_FILM:FilmDocument={
  schemaVersion:1,id:"riso79-original-print-window-pull-tab",
  fps:{num:24,den:1},drift:0,
  outputs:[
    {id:"landscape",width:960,height:540},
    {id:"portrait",width:540,height:960},
  ],
  scenes:[
    {id:"two-original-print-masters-under-diecut",recipeId:"slot",
      durationFrames:36,
      content:{slot:"riso79-held",label:"Source-printed stationery cover and sliding two-ink insert"}},
    {id:"single-paper-tab-original-ink-reveal",recipeId:"slot",
      durationFrames:144,transition:{kind:"cut"},
      content:{slot:"riso79-pull",label:"The intact printed insert moves behind three native paper windows"}},
    {id:"printed-paper-reveal-final-hold",recipeId:"slot",
      durationFrames:60,transition:{kind:"cut"},
      content:{slot:"riso79-revealed",label:"Separate original spot inks, stationary cover and end-stop paper grip"}},
  ],
};
