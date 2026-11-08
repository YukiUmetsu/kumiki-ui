/** Effects and moments for the catalog, built from the one guidance table so search, docs and stories agree.
 * It imports nothing: the browser catalog and the CLI each pass in the guide, so both read the same data without a build step.
 */
import type { RawEffect } from "./catalog-core";

interface Guide { effect: string; title: string; jobs: readonly string[]; use: string; avoid: string; settings: string }
interface Moment { id: string; title: string; job: string; effect: string; summary: string; storyExport: string; keywords: readonly string[] }
/** The craft story that shows each effect beside its common mistake. */
const CRAFT_STORY: Readonly<Record<string, string>> = {
  "mesh-gradient": "mesh-gradient-chapter-bridge", "liquid-metal": "liquid-metal-logo-sting", "god-rays": "god-rays-light-with-a-source",
  "grain-gradient": "grain-gradient-evidence-card", water: "water-living-still", "halftone-dots": "halftone-print-to-photograph",
};
interface ParticleKind { kind: string; title: string; jobs: readonly string[]; use: string; avoid: string; settings: string }
interface ParticleMomentRow { id: string; title: string; job: string; kind: string; summary: string; storyExport: string; keywords: readonly string[] }
/** The craft story that shows each particle kind beside its common mistake. */
const PARTICLE_CRAFT: Readonly<Record<string, string>> = { motes: "dust-in-the-light", embers: "rising-embers", sparks: "sparks-on-the-hit", bokeh: "bokeh-before-the-subject", fireflies: "fireflies-at-night", assemble: "assemble-many-into-one", flow: "flow-from-source-to-destination" };
export function catalogParticles(guides: Readonly<Partial<Record<string, ParticleKind>>>, moments: readonly ParticleMomentRow[]): RawEffect[] {
  const rows = Object.values(guides).filter((guide): guide is ParticleKind => Boolean(guide && PARTICLE_CRAFT[guide.kind]));
  return [
    ...rows.map(guide => ({ id: "particle:" + guide.kind, title: guide.title + " particles", summary: guide.use, registryItem: "environmental-effects-fiber",
      storyId: "video-particles--" + PARTICLE_CRAFT[guide.kind], keywords: ["particles", guide.kind, guide.title], jobs: guide.jobs, use: guide.use, avoid: guide.avoid, settings: guide.settings })),
    ...moments.map(moment => {
      const guide = guides[moment.kind]!;
      return { id: "particle:" + moment.id, title: moment.title, summary: moment.summary, registryItem: "particle-moments", storyId: "video-particle-moments--" + moment.storyExport,
        keywords: ["particles", ...moment.keywords, moment.kind], jobs: [moment.job, ...guide.jobs.filter(job => job !== moment.job)], use: moment.summary + " " + guide.use, avoid: guide.avoid, settings: guide.settings };
    }),
  ];
}
export function catalogEffects(guides: Readonly<Record<string, Guide>>, moments: readonly Moment[]): RawEffect[] {
  return [
    ...Object.values(guides).map(guide => ({ id: "effect:" + guide.effect, title: guide.title, summary: guide.use, registryItem: "shader-fx",
      storyId: "video-shader-fx-craft--" + CRAFT_STORY[guide.effect], keywords: [guide.effect, guide.title], jobs: guide.jobs, use: guide.use, avoid: guide.avoid, settings: guide.settings })),
    ...moments.map(moment => {
      const guide = guides[moment.effect];
      return { id: "effect:" + moment.id, title: moment.title, summary: moment.summary, registryItem: "shader-fx-moments", storyId: "video-shader-fx-moments--" + moment.storyExport,
        keywords: [...moment.keywords, moment.effect], jobs: [moment.job, ...guide.jobs.filter(job => job !== moment.job)], use: moment.summary + " " + guide.use, avoid: guide.avoid, settings: guide.settings };
    }),
  ];
}
interface StudioRecipeRow { id: string; title: string; jobs: readonly string[]; use: string; avoid: string; settings: string; storyExport: string; keywords: readonly string[] }
/** Studio video recipes: finished product shots in React Three Fiber, each with its jobs and rules. */
export function catalogStudioRecipes(guides: readonly StudioRecipeRow[]): RawEffect[] {
  return guides.map(guide => ({ id: "studio:" + guide.id, title: guide.title, summary: guide.use, registryItem: "studio-recipes", storyId: "video-studio-recipes--" + guide.storyExport,
    keywords: ["3d", "studio", "product shot", ...guide.keywords], jobs: guide.jobs, use: guide.use, avoid: guide.avoid, settings: guide.settings }));
}
