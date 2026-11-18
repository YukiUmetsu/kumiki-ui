# ArtCraft F1 V25 — solid but edge-feathered source nose wax

Experimental, opt-in only in [PR #461](https://github.com/YukiUmetsu/kumiki-ui/pull/461); no approved realistic portrait. CC0 Christopher Campbell exact photo 608×1082, original SHA256 `f8d28cbede8c8c14f9902a328b6e979e353fd9ebe6efb454bda3152586b929c2`. Actual [V24 Chromium screenshot](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43817128712), artifact 14203641032, failed artist review: nose ROI SSIM V23 .560533 → V24 .557073, despite bright bulb .532048 → .558529, and dark core near (405,631) stuck [140,103,93] vs source [29,4,4]. Source-vs-render structural integrity and full face remain unapproved.

## Physical correction (five axes)
- Topology: original V24 nose bulb / long dorsum / far sidewall / septal underplane paths unchanged; a real solid core behind near/far attached V23 rims. No new nose dots or removed paths.
- Stroke direction: existing source oblique wax grain and documented asymmetric near/far paths stay native.
- Edge: extend existing `featherContacts` opt-in to **opaque** stroke-built wax iff `blendRadius>0`; apply native softly feathered **alpha** solely to undercoat, paper contact and wax mark boundary, never blur finished RGB pigments. This avoids a cut-paper opaque nose.
- Variation: `underpaintGradient` holds multiple original pigment values through pressure-bounded paper-tinted wax; individual native pits/clumps stay registered with paper seed.
- Chronology: an intersection of old hand-nib progress mask and the new alpha edge mask ensures early cels cannot reveal finished pigment ahead of the stroke; later full undercoat remains solid inside.

Four existing named CRAYON1 shapes only are switched to opaque core in an opt-in V25 form. Every default (historic opaque and open) remains unchanged; V24 exact shape negative control stays available. Same Storybook folder offers V25 3× macro; Vitest verifies wire contract, no duplicate, original timeline, all other art, and premature wax reveal. Chromium 608×1082 native 1×/3× proof must be independently inspected, including frame 210 and 299.

References: [Philadelphia Museum of Art wax-on-paper terminology](https://legacyweb.philamuseum.org/doc_downloads/conservation/DescriptiveTerminologyforArtonPaper.pdf); [Mould et al., Simulating Wax Crayons](https://people.scs.carleton.ca/~mould/papers/crayon.pdf). Learned medium texture only; no art/images copied.

**HARD STOP**: Official ArtCraft 9.1 threshold, 18 annotated anatomy landmarks, faithful 1×/3× source value planes, actual 300-frame acting and independent art approval are not met. Keep draft and unmerged if opaque mask creates a soft plastic patch or hard oval.

## Independent actual V25 pixel review — ARTISTIC REJECT

Native actual [Chromium run 43819506279](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43819506279), artifact 14204292139, 608×1082 1× and 3×; direct inspection and scikit-image comparison against frozen CC0 screenshot:

| Source crop RGB SSIM | V24 open baseline | V25 opaque nose |
| --- | ---: | ---: |
| Full portrait | .361959 | **.361674** |
| Nose x340..493/y570..684 | .557073 | **.548200** |
| Bright bulb x374..411/y594..633 | .522314 | **.500784** |
| Septal x412..451/y627..664 | .515725 | **.495639** |
| Near dark core x389..415/y628..645 | .190615 | .191387 |

Source RGB (405,631): [29,4,4]; actual V25 [140,103,93]. Source far (450,627): [74,22,18]; actual V25 [145,111,101]. The opaque skin improves paper contact but still overpaints the recessed source cavity; the whole portrait remains flat, two dark bean shapes look detached, and V25's nose fidelity **regressed**. V26 independently tests local wax paint-order inversion to expose the cavities without adding new nodes. No claim that simple darkening passes ArtCraft.
