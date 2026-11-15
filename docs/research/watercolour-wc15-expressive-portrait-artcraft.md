# WC15 — Watercolour faces, root-aligned brushwork and attached acting

## Visual finding / acceptance status

**Unapproved artistically, but real browser capture required.** Previous WC14
native Chromium reference contact sheet (`wc14-qa/ensemble-final-preview.png`,
the accepted browser output of PR #266) revealed two critical weaknesses:
1. Faces look like smooth 2D vector masks with thin black contours and round,
   overly exposed eyes, rather than translucent watercolor.
2. Eyes, brows, nose, hair and fabric had insufficient anatomically
   directed *brush* hierarchy; the back hair was static while the face and
   fringe made small independent head rotations.

Adding more global speckle is a failed shortcut. The source needs recognizable
large shape planes and independent painterly strokes before grain and effects.

## References and source study (style-guided, not traced)

| Reference | Actual observation | Construction decision |
| --- | --- | --- |
| [Charles Reid, *Watercolor Secrets*, seated woman in blue](https://www.pinterest.com/pin/491666484289677684/) | Very large luminous unpainted regions; eye/nose information concentrated in small, irregular warm/dark notes; loose blue garment dissolves at its edges | Use local face color accents with uneven `C`/`Q` paths, reduce brow/eye black contours; never add global face-wide noise |
| [Charles Reid, standing/seated woman in loose gray watercolor](https://www.pinterest.com/pin/226939268710029906/) | Forehead/nose plane bounded by paper-white passages; wet cheek reds, sparse eyelids, dark-blue jacket masses and unfinished hems | Add named cheek/cool nose-wing and fabric value shapes; keep light reserves between the patches |
| [Charles Reid, bearded man study](https://k.sina.cn/article_7015005298_p1a2207c7200100imox.html) | Beard growth is an irregular, broken tonal mass; warm skin and cool collar meet through soft and hard edges | Use dark/warm side and chin beard washes plus detached dry-brush direction, rather than perfectly even hatching |
| [John Singer Sargent, Smithsonian American Art Museum](https://americanart.si.edu/artist/john-singer-sargent-4253) | Fine watercolor portrait effects are achieved with expressive value placement; white paper provides high-value contrast | Favor reserved light and concentrated shadows around sockets/lips over a full-skin heavy texture field |
| [Sargent, *A Selection of Drawings and Watercolors*, Metropolitan Museum](https://resources.metmuseum.org/resources/metpublications/pdf/John_Singer_Sargent_A_Selection_of_Drawings_and_Watercolors_from_The_Metropolitan_Museum_of_Art.pdf) | The museum catalog discusses thin transparent wash modeling against paper white and economical accent strokes | Layer plane-specific translucent watercolor, not synthetic canvas blur; maintain opaque figure foundations for modern compositing reliability |

References are for **craft** only; no pixel-precise recreation, source photo,
artist likeness or proprietary bitmap has been added to the repository.

### Actual ArtCraft construction map

Source image crops were inspected qualitatively, not independently
registered/aligned to the current original characters. Thus numerical
pixel-fidelity or style-equivalence tests are **not authorized** by these
references. Native generated face crops and actor-to-actor topology checks
are the direct output evidence. No v6 five-axis release gate is claimed.

| Region | Root / attachment | New original brush marks | Negative control / quality check |
| --- | --- | --- | --- |
| Eye and socket | face → near/far socket → aperture clip → inset gaze/iris | narrow organic almond clip, wet orbital dark shape, broken brow pigment | no floating round sclera or iris outside aperture; blinking stage stays independent |
| Cheek and jaw | facial foundation → malar/zygomatic planes | `malar-light-uneven-brush`, `cheek-cool-broken-plane`, `malar-second-colour-note`, `chin-cool-turn-and-reserved-skin` | no flat triangular wedge with one uniform saturation |
| Nose and lip | nose dorsum/wing → philtrum → mouth | `nose-saddle-left-plane`, `nose-wing-sienna-pigment`, `nasolabial-edge-falloff`, `lip-gesture-not-outline` | no closed dark outline around lips |
| Hair and beard | skull → crown/temple/curl flow; beard anchored to jaw | `crown-unbroken-light-ribbon`, `crown-shadow-broken-ribbon`, `root-following-gouache-dry-runs`, `beard-chin-salt-pigment` | no evenly spaced scribble noise or static hair while rotating face |
| Jacket | neck → connected shoulders → fabric/coat silhouette | shoulder bloom, violet reflected wash, chest falloff, lapel lift, broken dry-brush seams | no detached sleeve pieces; preserve opaque connected torso under wash |
| Performance | common pivot at (331,415), each original actor time-offset | shared `HEAD_PERFORMANCE` keys from head to back/front hair and beard; independently authored gaze/blink | no hairline crawl during turn, no shared clock or global timer |

### New comparison toggle

Existing Storybook category **Video Production / Film Looks /
Watercolour & Brush / 02B Two-Character Film** exposes **Expressive watercolor
brush layers**, checked by default. Turning it off removes WC15
plane-specific brush groups and wet hair/cloth accents but retains intact
anatomy, baseline opacity, film motion and paper. This compares *actual
same-timestamp* before/after painting without shipping extra duplicate
characters or adding another Storybook category.

### Required release checks

- `npx vitest run tests/watercolour-portrait.test.tsx tests/watercolour-portrait-ensemble.test.tsx`
- `npx tsc --noEmit` through the repository's changed-tests/type safety workflow
- `npx playwright test -c playwright.storybook.config.ts tests/e2e-storybook/watercolour-portrait-ensemble.spec.ts` — native 960×540 and 540×960 full renders, face crop and before/after toggle
- Verify actual **normal-speed** frame progression in a browser (not just
  deterministic seek); MP4 final output and audio continuity remain separate QA.

## Not yet complete

An aesthetically convincing hand-painted portrait still needs finer
human-specific proportions, much less literal eye outlining, expressive
facial emotion and richer intentional edge loss. The arbitrary full-body
character engine and motion (gestural hands, legs, speech phonemes,
interaction), realistic animal figures and native MP4 artistic signoff
are still open. No claims of world-class/reference-matched fidelity.
