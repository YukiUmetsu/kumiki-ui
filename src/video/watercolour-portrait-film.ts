import type { FilmDocument } from "../../registry/video/film-document";

/** Original portrait, not a photo texture. Both outputs use the same semantic
 * face hierarchy and are authored in their native aspect ratios. */
export const WATERCOLOUR_PORTRAIT_FILM:FilmDocument={
  schemaVersion:1,
  id:"watercolour-naturalist-portrait",
  fps:{num:30,den:1},
  drift:0,
  outputs:[
    {id:"landscape",width:960,height:540},
    {id:"portrait",width:540,height:960},
  ],
  scenes:[{
    id:"portrait-painted-in-stages",
    recipeId:"slot",durationFrames:360,
    content:{slot:"watercolour-illustration",
      label:"Original reference-led watercolor human portraits",props:{subject:"person-portrait",sitter:"sitter-a",seed:83}},
  }],
};
