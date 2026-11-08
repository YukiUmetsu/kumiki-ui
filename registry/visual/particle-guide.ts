/** When and how to use each particle kind, as data. The Storybook catalog, the component catalog and `compileEffect`'s diagnostics all read
 * this table, so an agent meets the same rules wherever it looks. The rules come from cinematography and studio work:
 * see docs/30-particles-in-practice.md for the examples and sources.
 */
import type { EffectKind, EffectSpec } from "./environmental-effects";

/** What particles are for in a shot. Naming it is the point: particles with no job are noise on the lens. */
export const PARTICLE_JOBS = ["atmosphere", "weather", "impact", "reveal", "identity", "data", "bridge"] as const;
export type ParticleJob = (typeof PARTICLE_JOBS)[number];

export interface ParticleGuide {
  kind: EffectKind;
  title: string;
  jobs: readonly ParticleJob[];
  use: string;
  avoid: string;
  settings: string;
  /** A catalog sound that suits it, and where it lands. */
  sound: { id?: string; when: string };
  /** How film and studio work uses it, described without names. Named examples and sources are in docs/30-particles-in-practice.md. */
  practice: string;
  review: readonly string[];
  /** Above this many, the particles stop being countable and read as a haze. */
  countable: number;
}

export const PARTICLE_GUIDE: Readonly<Partial<Record<EffectKind, ParticleGuide>>> = {
  motes: { kind: "motes", title: "Motes", jobs: ["atmosphere", "reveal"], countable: 1200,
    use: "Quiet interiors with a shaft of light: an archive, a workshop, a closed room in late sun. The dust proves the light is real, and the light explains the dust.",
    avoid: "Dust spread evenly over the frame, or a milky room. Motes are countable specks inside a hard beam, with dark air around it.",
    settings: "Set `beam` to the light: a hard, narrow cone, backlit toward the camera. About 600 to 900 motes, slow drift, warm white. Keep the camera slow, or specks smear into noise. Pair with god rays on the same light.",
    sound: { id: "bed-cave-air", when: "as quiet room tone" },
    practice: "Cinematographers make dust visible with a hard backlit shaft and a dark surround, and keep it countable: specks in a shaft, not soup in a room. Haze stays light and even, because heavy fog flattens the picture to grey.",
    review: ["Is there a beam the dust sits in?", "Can you count the specks, or is it a haze?"] },
  embers: { kind: "embers", title: "Embers", jobs: ["atmosphere", "bridge"], countable: 400,
    use: "Openings, chapter cards and moments of change, where fire is implied rather than shown. Rising heat gives a dark frame warmth and life.",
    avoid: "Embers that fall, drift sideways like snow, or share one size and colour. Real embers rise, shrink and cool from yellow to red.",
    settings: "About 150 to 250, rising over 4 to 5 seconds each, on a dark warm background, with a few out-of-focus embers near the camera and a grain finish. Bring the title in after the embers fill the frame.",
    sound: { id: "riser-1s-soft", when: "into the title" },
    practice: "Title designers mix practical fire and ash with digital light, and production teams shoot real fire as elements to mix with CG, because practical texture reads as filmed.",
    review: ["Do the embers rise and cool?", "Is the title clear of the brightest embers?"] },
  sparks: { kind: "sparks", title: "Sparks", jobs: ["impact"], countable: 300,
    use: "A hit, a cut, a weld, a moment of contact. A burst marks one exact frame, so it locks the picture to the sound.",
    avoid: "Sparks that float, loop or linger. Real sparks fly fast, arc down, bounce once and die within about a second.",
    settings: "One burst on the impact frame, a spread of about 1.1, a floor to bounce on, a life of 30 to 45 frames, and a short flash of light on the same frame. Put the hit sound's peak on that frame.",
    sound: { id: "impact-medium-soft", when: "with its peak on the impact frame" },
    practice: "Large productions keep real sparks wherever they can and extend them digitally only where the story needs it; motion blur, which a streak gives, is what reads as speed.",
    review: ["Do the sparks start on the hit's frame and sound?", "Are they gone within about a second?"] },
  bokeh: { kind: "bokeh", title: "Bokeh", jobs: ["atmosphere"], countable: 40,
    use: "Giving a flat photograph a lens: soft lights between the camera and the subject make the picture feel shot rather than placed.",
    avoid: "Many sharp, bright discs, or discs over a face or text. Bokeh is out of focus by definition, and it stays quiet.",
    settings: "Twenty to thirty discs close to the camera, low alpha, warm and cool mixed, and a slow sideways camera move so they slide past faster than the subject.",
    sound: { when: "none: it is a lens, not an event" },
    practice: "Layered particle work puts large defocused discs in front and sharp detail behind, with the nearest layer moving most; editors add light overlays with screen or add blending so they behave like light.",
    review: ["Are the discs soft and faint?", "Do they stay off the subject's face and the words?"] },
  fireflies: { kind: "fireflies", title: "Fireflies", jobs: ["atmosphere"], countable: 60,
    use: "Dusk and night scenes that need quiet life: a garden, a field, a shoreline. Each light blinks on its own clock, so the frame breathes.",
    avoid: "A crowd of them, or lights blinking together. A few slow lights read as magic; a swarm reads as a screensaver.",
    settings: "About 20 to 40, low in the frame, a warm yellow-green, blink cycles of about four seconds, over a dark, cool picture.",
    sound: { id: "bed-wind-mountain", when: "as a quiet night bed" },
    practice: "Slow, sparse motion is what particle work sells as premium: density and speed carry most of the effect.",
    review: ["Are there few enough to count?", "Do they blink out of step?"] },
  snow: { kind: "snow", title: "Snow", jobs: ["weather", "atmosphere"], countable: 1600,
    use: "Season, cold and quiet. Snow slows a scene down.",
    avoid: "A uniform curtain of identical flakes. Real snow has near, soft flakes and far, small ones, and it drifts.",
    settings: "Layer near and far flakes, keep the fall slow, add a little wind, and use depth of focus so near flakes blur.",
    sound: { id: "bed-wind-mountain", when: "as a quiet bed" },
    practice: "Seasonal brand work uses snow as a single restrained detail, with depth of focus, rather than a busy overlay that competes with the message.",
    review: ["Do near and far flakes differ?", "Is the snow slower than the words?"] },
  rain: { kind: "rain", title: "Rain", jobs: ["weather", "atmosphere"], countable: 2200,
    use: "Weather, mood and pressure. Rain darkens and tightens a scene.",
    avoid: "Rain with no light to catch it. Rain shows where it is backlit.",
    settings: "Streaks that lean with the wind, gusts for storms, and a backlight or practical light the drops cross.",
    sound: { id: "bed-river-fast", when: "as a bed under the scene" },
    practice: "Like dust, rain is lit from behind so the drops catch the light toward the camera.",
    review: ["Is there light the rain crosses?"] },
  dust: { kind: "dust", title: "Dust", jobs: ["atmosphere"], countable: 900,
    use: "Open spaces with drifting air, where a beam is not available.",
    avoid: "Using it where motes in a beam would explain themselves better.",
    settings: "Sparse, slow and faint. If there is a light shaft in the shot, use motes with a beam instead.",
    sound: { when: "none" },
    practice: "Countable specks read as air; a uniform haze reads as a filter on the lens.",
    review: ["Is it sparse enough to count?"] },
  assemble: { kind: "assemble", title: "Assemble", jobs: ["identity", "reveal", "bridge"], countable: 4000,
    use: "A mark, word or object forming from many parts, or breaking apart. It says that one thing is made of many: a team, a community, a body of work.",
    avoid: "Too few points for the shape to read, an arrival so fast nobody sees it form, and using it with no idea behind it.",
    settings: "Sample the shape from a silhouette with `sampleShapeTargets`, at least 600 points for a mark. Arrive over 2 to 3 seconds with a stagger of about 0.45, hold for a beat, then bring in the name. `dissolve` breaks it apart for an exit.",
    sound: { id: "sting-airy-short", when: "as the last particles land" },
    practice: "A studio built a science-fiction series' mural from living particles: up close every particle moves on its own, but the mass forms a predictable picture, which was the series' idea. Logo reveals in event films assemble and explode marks the same way.",
    review: ["Is the shape clear once it forms?", "Is there an idea behind many becoming one?"] },
  flow: { kind: "flow", title: "Flow", jobs: ["data"], countable: 2000,
    use: "Movement from one thing to another in an explainer: money from a customer to a business, requests to a server, water downstream. Direction and rough volume, at a glance.",
    avoid: "Showing an exact number with particle density. Particles are approximate; put the value in a label next to the flow.",
    settings: "A path of two or more points from source to destination, a steady speed, a small spread, and density that rises with volume. Label the exact figure.",
    sound: { when: "none, or a soft bed for a long flow" },
    practice: "Flow-chart libraries use particles for direction and velocity, and warn that particles are approximate where a precise value must be read; density is re-derived from the underlying values when they change.",
    review: ["Does the flow run from the source to the destination?", "Is any exact value written as a label?"] },
};

export interface ParticleUseProblem { code: string; severity: "error" | "warning" | "info"; message: string }
/** How a spec uses its particles, from the guide. Reported through `compileEffect`'s diagnostics. Pure. */
export function inspectParticleUse(spec: EffectSpec, count: number): ParticleUseProblem[] {
  const guide = PARTICLE_GUIDE[spec.kind], problems: ParticleUseProblem[] = [];
  if (!guide) return problems;
  if (spec.job !== undefined && !guide.jobs.includes(spec.job as ParticleJob))
    problems.push({ code: "particle-job", severity: "error", message: `${guide.title} is not for "${spec.job}". It does: ${guide.jobs.join(", ")}.` });
  if (count > guide.countable)
    problems.push({ code: "particle-soup", severity: "warning", message: `"${spec.id}" has ${count} ${spec.kind}; above ${guide.countable} they read as a haze, not as particles. Use fewer.` });
  if (spec.kind === "motes" && !spec.beam)
    problems.push({ code: "particle-unmotivated", severity: "warning", message: `Motes "${spec.id}" have no beam. Dust shows in a shaft of light; set \`beam\` to the light.` });
  if (spec.kind === "sparks" && (spec.burst?.life ?? 34) > 60)
    problems.push({ code: "particle-sparks-linger", severity: "warning", message: `Sparks "${spec.id}" live ${spec.burst?.life} frames. Real sparks die within about a second; keep life to 60 or less.` });
  if (spec.kind === "assemble" && (spec.assemble?.targets.length ?? 0) < 300)
    problems.push({ code: "particle-shape-thin", severity: "warning", message: `"${spec.id}" forms its shape from ${spec.assemble?.targets.length ?? 0} points; under 300 the shape will not read. Sample more.` });
  if (spec.kind === "assemble" && spec.assemble && spec.assemble.endFrame - spec.assemble.startFrame < 30)
    problems.push({ code: "particle-too-fast", severity: "warning", message: `"${spec.id}" forms in under a second; the audience will not see it form. Take 60 to 90 frames.` });
  if (spec.kind === "flow")
    problems.push({ code: "particle-approximate", severity: "info", message: `Flow "${spec.id}" shows direction and rough volume, not exact values. Label any number next to it.` });
  return problems;
}
