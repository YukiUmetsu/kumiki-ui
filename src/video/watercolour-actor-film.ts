import type { FilmDocument } from "../../registry/video/film-document";

/** Frame-addressed production rig proof. Renderer and preview use the same slot. */
export const WATERCOLOUR_ACTOR_FILM: FilmDocument = {
  schemaVersion:1,
  id:"watercolour-character-performance-study",
  fps:{num:30,den:1},
  drift:0,
  outputs:[{id:"landscape",width:960,height:540},{id:"portrait",width:540,height:960}],
  scenes:[{
    id:"watercolour-traveller",recipeId:"slot",durationFrames:430,
    content:{slot:"watercolour-actor",label:"Original traveler walks, waves and speaks on watercolor paper"},
  }],
};
