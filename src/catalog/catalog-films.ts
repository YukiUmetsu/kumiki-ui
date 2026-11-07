/** Finished films for the catalog. This file holds text only, so the local CLI can read it without any media. */
export interface CatalogFilm {
  id: string;
  title: string;
  summary: string;
  /** The pack that makes this film possible. */
  registryItem: string;
  storyExport: string;
  keywords: readonly string[];
  meta: string;
  portrait?: boolean;
}
export const CATALOG_FILMS: readonly CatalogFilm[] = [
  { id: "the-drop", title: "The Drop", registryItem: "ray-world-water-drop", storyExport: "the-drop", meta: "26 s, 16:9, 1080p master. Sound locked to named moments",
    summary: "A camera dives through water drops into real places, upstream, until a drop forms in a real glacier cave.",
    keywords: ["water drop", "refraction", "lens", "macro", "photograph", "iceland", "waterfall", "glacier", "ice cave", "endless zoom", "ray traced", "cinematic", "showcase", "impressive"] },
  { id: "plaster-valley", title: "The Plaster Valley", registryItem: "ray-world-terraced-relief", storyExport: "plaster-valley", meta: "22 s, 16:9, 1080p master",
    summary: "A terraced plaster island on a terracotta table: a river steps down its layers, and blue ice sweeps over it.",
    keywords: ["relief", "topographic", "model", "terrain", "contour", "plaster", "terracotta", "product shot", "tabletop", "ice", "river", "ray traced", "cinematic", "showcase", "impressive"] },
  { id: "the-drop-vertical", title: "The Drop, vertical", registryItem: "ray-world-water-drop", storyExport: "the-drop-vertical", meta: "26 s, 9:16, 1080 by 1920 master", portrait: true,
    summary: "The same film framed for a phone: the lens widens on a tall frame, so the drop keeps its place.",
    keywords: ["portrait", "vertical", "shorts", "reels", "tiktok", "phone", "9:16", "water drop", "refraction", "cinematic", "showcase", "impressive"] },
  { id: "where-water-begins", title: "Where Water Begins", registryItem: "shader-fx", storyExport: "where-water-begins", meta: "18 s, 16:9, FilmDocument with shaders and recorded sound",
    summary: "A short film from one JSON file: Iceland photographs, five shader effects, a shader cut and recorded ambience.",
    keywords: ["film document", "json film", "shader", "iceland", "water", "photograph", "ambience", "recorded sound", "showcase"] },
  { id: "billing-gap", title: "The Billing Gap", registryItem: "film-document", storyExport: "billing-gap", meta: "21 s, 16:9, FilmDocument with foley",
    summary: "A short explainer from one JSON file: a bill and a receipt disagree, and neither is wrong.",
    keywords: ["film document", "json film", "explainer", "receipt", "bill", "object story", "foley", "showcase"] },
];
