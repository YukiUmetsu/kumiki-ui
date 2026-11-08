# Particles in practice: how film and studios use them

**Researched:** 2026-11-08. **Purpose:** learn from real work when each particle kind earns its place, and turn what repeats into a catalog an agent can use. The pieces are in Storybook under **Video production → Particles** (each kind beside its common mistake) and **Video production → Particle Moments → Choose Particles**. The rules are data, in `PARTICLE_GUIDE` (`registry/visual/particle-guide.ts`).

Each row was read on its source page unless marked otherwise. Names appear here only as research citations; library code and stories stay anonymous.

## What the work shows

| Kind | Example | What they did | Source and weight |
|---|---|---|---|
| Motes | Cinematography reference on dust | Motes are "a pause, a prayer, a house that remembers": countable specks in a hard shaft with dark air around it. "Motes need a dark surround and a hard beam"; if the whole room looks milky, it has gone too far. Fast camera moves smear specks into noise. Cited films: *The Assassination of Jesse James*, *The Tree of Life*, *Blade Runner 2049* | [Melies: dust motes](https://melies.co/cinematic-techniques/atmosphere/dust-motes), [Melies: particles](https://melies.co/cinematic-techniques/effects/particles), practitioner reference, moderate |
| Motes, haze | *American Cinematographer*, Jay Holben | "We see light only by way of its reflection or refraction." Light must be "directed toward the lens — but not necessarily directly into it." Haze should be a "consistent layer … without any definition"; too much reduces contrast to "a gray blob" | [ASC Shot Craft](https://theasc.com/blog/shot-craft/smoke-and-fog), professional body, high |
| Mass of particles | *Foundation* titles, Imaginary Forces | Particles build the Mural of Souls, "almost living when you get close to it", hinting at the scale of the world and at psychohistory: individuals unpredictable, the mass predictable. The team simulated hundreds of iterations to balance density and reflectivity | [Frame.io](http://blog.frame.io/2022/09/12/made-in-frame-imaginary-forces-foundation/), studio interview, high |
| Dots forming images | *The Morning Show* titles, Elastic | Simple patterns of coloured dots form images of factory labour, escape, one force dominating another and climbing a hierarchy, leaving the viewer to relate them to the show | [Promax Brief](https://oldbrief.promax.org/article/elastic-does-a-lot-with-dots-in-morning-show-main-titles), trade press, moderate |
| Assemble | Event-film logo reveals | Designers rebuild a phone maker's event particle animation with cloners and fields; tutorials explode a logo into thousands of particles and reverse it so they "reform the graphic" | [Greyscalegorilla](https://greyscalegorilla.com/blog/make-apples-far-out-looping-logo-particle-animation-in-cinema-4d), [MacMost](https://macmost.com/exploding-logo-effect-in-apple-motion.html), tutorials, low to moderate |
| Sparks | *F1: The Movie*, ILM | Real sparks and flame bars were kept where possible and extended digitally only where the story needed it. VFX supervisors recommend shooting practical fire as elements to mix with CG | [ILM](https://www.ilm.com/building-belief-at-200mph-ilms-invisible-work-on-f1-the-movie/), [VFX Voice](https://vfxvoice.com/meeting-the-challenge-how-would-you-solve-three-big-vfx-problems/), from search summaries, high |
| Flow | Data-visualisation libraries | Particle flows show direction and velocity, and "particles are approximate" where a precise value must be read; density is re-derived from the values when they change | [FlowGL](https://chartts.pages.dev/docs/charts/flow-gl), [ApexSankey](https://apexcharts.com/apexsankey/docs/particle-flow/), library documentation, moderate |
| Bokeh, snow | Editors and stock guidance | Light overlays use screen or add blending; layered particle work puts large defocused discs in front and sharp detail behind; seasonal snow works as one restrained detail with depth of focus | [PremiumBeat](https://www.premiumbeat.com/blog/free-prism-bokeh-overlays), [AI Designer](https://www.aidesigner.ai/backgrounds/particle-drift), [Brand Industry](https://docs.thebrandindustry.com/news/how-a-single-snowy-insert-transformed-a-boring-christmas-tr--9246104), vendor and trade, low |

**Not found:** no studio breakdown of embers in a title sequence could be confirmed; the ember rules rest on the general practical-fire guidance above and on physical behaviour.

## Patterns that repeat

1. **Particles have a cause.** Dust shows only in a backlit beam, embers rise from heat, sparks come from a hit. Without a cause they read as a filter on the lens.
2. **Countable, not soup.** Specks you could count read as air; a uniform haze reads as fog or a mistake. Restraint is the premium look.
3. **A mass can mean something.** Many particles forming one picture says that one thing is made of many: a society, a team, a brand's work.
4. **Physical behaviour.** Real sparks fly fast, bounce and die; embers rise and cool; dust drifts slowly. Productions keep practical elements because physics reads as real.
5. **Particles are approximate.** In an explainer, a flow shows direction and rough volume; the number goes on a label.

## What changed in this library

| Pattern | Change |
|---|---|
| 1. Cause | `motes` take a `beam` and vanish outside it; `film`-style moments pair motes with god rays on the same light; `particle-unmotivated` warns when motes have no beam |
| 2. Countable | Each kind has a countable ceiling in the guide; `particle-soup` warns above it |
| 3. Meaning | New kind `assemble`, with `sampleShapeTargets` to read a silhouette, and the **Assemble Into Mark** moment |
| 4. Physics | `sparks` fly in closed form with drag, gravity and one bounce; `particle-sparks-linger` warns past 60 frames; embers carry heat and cool |
| 5. Approximate | New kind `flow` and the **Particle Flow** moment, which writes the value on a label; `particle-approximate` reminds on every flow |
| Jobs | Every spec can name a `job` (`atmosphere`, `weather`, `impact`, `reveal`, `identity`, `data`, `bridge`); a job the kind does not suit is reported as an error diagnostic |
| Search | Each kind and moment is a catalog entry of type `effect`, searchable by what the shot needs |

## Not done

- **No human review.** An agent checked frames; nobody has approved the look or listened.
- **No fluid, smoke or collisions.** These need a stateful simulation and a fixed-step bake to seek exactly; the closed-form kinds cover the uses above without one.
