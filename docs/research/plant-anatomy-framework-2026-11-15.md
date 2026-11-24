# Plant anatomy framework (FLORA1) — research, 2026-11-15

The owner asked for the plants and trees framework to come next after ANIM1. It is first in the order agreed for
missing frameworks:

1. plants and trees;
2. facial expressions;
3. the ANIM1 gaps.

## Duplication found

Each style draws its own vegetation:

- **ukiyo-e:** pine, cherry, willow, reeds, bamboo, persimmon, the sacred tree and the rice field, in
  `ukiyoe-motifs.ts`, `ukiyoe-trees.ts` and about 20 other UKIYO1 files;
- **paper:** silhouette trees in `paper-scenery-kit.ts`, and leaves, ferns and petals in `paper-botanical-kit.ts`;
- **coloured pencil;**
- **the 3D nature world.**

None of it shares architecture, calendars or species data.

## Craft source: Rex Vicat Cole, *The Artistic Anatomy of Trees* (1915)

The text was read from the Internet Archive (identifier `artisticanatomyo1915cole`). The rules used:

- **Ch. XII: bud plans decide the branch anatomy.** "Each species of tree has its buds arranged on the twig in a
  definite manner… there are about six or seven [methods]." The plans are:
  - opposite pairs at right angles (ash, maple, horse chestnut);
  - single buds in two rows (beech, elm, lime);
  - three or more rows, spiral (oak, cherry, plum, willow, poplar);
  - crowded in groups (spruce, Scots pine, fir).
- **Ch. XII: the twig repeats the bough.** "The twig does bear a very remarkable likeness to the larger parts; in many
  cases it is indeed a replica in miniature of the bough."
- **Ch. XIII: the leader.** When the end bud lives, the leader is straight. When a side bud takes over each year, the
  branch becomes "a succession of curved steps… leading the branch outward curve by curve". Opposite buds with a failed
  end bud give "a succession of forks".
- **Ch. XIII: twigs on a level bough.** "On a horizontal bough the twigs forming on the under side curve upwards, while
  those on the upper side grow outwards" (flat sprays).
- **Ch. XIII: young and old trees differ.** A young Scots pine's "tall spire has been replaced by a flat mop-like head"
  in old age, and the lower boughs decay.

## Science

- **Leonardo's rule.** The branch cross-sections above a fork add up to the one below it. Eloy (*Physical Review
  Letters*, 2011) explains this by self-similar skeletons sized to resist wind; field data are scattered. FLORA1 uses a
  pipe exponent of 2.
- **Phyllotaxis.** Successive leaves are a fixed fraction of a turn apart: 1/2 alternate, 1/3 beech, 2/5 oak and
  apricot, 3/8 poplar and pear, 5/13 willow and almond (Wikipedia, Phyllotaxis).
- **Crown types.** Excurrent conoid crowns and decurrent rounded crowns (Wikipedia, Crown (botany)).

## Species data

24 plants, with sizes and descriptions from Wikipedia species articles (retrieved 2026-11-15). Values quoted from a
source are graded "reported"; the rest "estimated". Examples:

- black pine to 40 m, needles in pairs, 6–12 cm;
- red pine with orange-red scaly bark;
- sugi to 60 m and 4 m across, bark peeling in vertical strips;
- mountain cherry 20–25 m, with "coetaneous" flowers (opening with the leaves);
- plum flowers 2–2.5 cm, fruit ripe June–July;
- willow leaves 4–16 cm, phyllotaxis 5/13;
- maple 6–10 m and 4.5–10 m wide, with 5–9-lobed leaves;
- ginkgo leaves dropping within 1–15 days;
- zelkova bark flaking in patches to orange;
- camphor girths over 20 m in Japan;
- wisteria racemes to 2 m, twining clockwise;
- lotus leaves to 1 m and flowers to 35 cm;
- susuki 0.8–2 m;
- reed 1.5–4 m with panicles 15–50 cm;
- paulownia leaves 15–40 cm, opposite;
- morning glory flowers 4–5 cm.

## References (public domain or CC0, Wikimedia Commons)

- **Siebold and Zuccarini, *Flora Japonica*, plates:**
  - pl. 10 *Paulownia*;
  - pl. 11 *Prunus mume*;
  - pl. 45 *Wisteria*;
  - pl. 82 *Camellia japonica*;
  - pl. 112 *Pinus densiflora*;
  - pl. 113–114 *Pinus thunbergii*, filed as *P. massoniana* (the Commons description confirms the identity);
  - pl. 121 *Chamaecyparis obtusa*;
  - pl. 124 *Cryptomeria*;
  - pl. 136 *Ginkgo*;
  - pl. 145–146 *Acer palmatum*.
- **Hokusai:** *Bullfinch and Weeping Cherry*, *Irises and Grasshopper* (MET, CC0) and *Morning Glories and
  Tree-frog*.
- **Hiroshige:** *Plum Garden at Kameido* (Rijksmuseum, CC0) and *Tea-house at the Willow Bridge* (MET, CC0).
- **Ogata Kōrin:** *Irises at Yatsuhashi* (MET, CC0).

## Visual checks done

The 24 species were rendered in January, April, July and November, and the sheets in light, dark and 390 px widths.
Defects found and fixed along the way:

- cedar and hinoki were bare poles: they now have dense sprays filling a cone;
- pine pads were too small and the tiers too few;
- maple twigs grew below the ground and tangled: now one layered dome;
- wisteria never reached its trellis;
- morning glory leaves were giant: leaf sizes now come from the species' leaf length over height;
- the cherry in bloom read as brown blobs: it now shows blossom clouds over half-open red young leaves;
- the plum bloomed in April: sheets now sample each species' own bloom and autumn months;
- winter grasses were green: they are now straw;
- bamboo looked like ferns: now sparse hanging leaf fans.

No owner review yet.

## Applied to UKIYO1

The ukiyo-e pine, cherry and willow are now grown by FLORA1, and a plum motif (`ume`) was added. See the UKIYO1
reference study, section "Trees grown by FLORA1".

## Round two: crowns and trunks in detail (2026-11-16)

The owner asked for more detail in trees, from more physics and more real images and videos.

**References studied** (CC0 or public domain, Wikimedia Commons):
- Lone trees: Tree in green wheat field (Unsplash), In the shade of the lone tree (Unsplash) and Lone Tree Near Farm
  Fields.
- Zelkova serrata in summer (Clementina) and in autumn (Luck097).
- A golden Ginkgo biloba in autumn.
- Cherries in flower: Prunus serrulata var. spontanea (Jardin des Plantes), near the Imperial Palace, and
  Thick-pink-blossom-tree.
- Ozaki Kumano-jinja Pinus thunbergii, and Mighty gnarled tree (bark and limbs).
- J. Needham, *Studies of Trees in Pencil and in Water Colors*, second series (Internet Archive scan): a painter's
  lessons.
- Videos: few usable ones were found. "Tuuleheide Viimsis 2020" (CC0) shows trunks swaying in gusts. "October storm"
  shows only storm damage. The sway rates come from the literature instead.

**Measured.** Sky pixels were classified by colour (rules checked against mask images, with clouds kept as sky). The
crown envelope is the tree mask closed over small gaps, with holes filled. The measures:

| Measure | Photographs | Result |
| --- | --- | --- |
| Foliage luma ladder, 10/25/50/75th percentile over the 95th | lone tree in wheat, farm tree, ginkgo | .14–.22, .22–.32, .33–.49, .57–.70 (means .18, .27, .39, .61); cherry blossom .20, .40, .58, .76 |
| Sky through the crown | six crowns | 10–26% overall; core 2–14%; outer fifth 17–38% |
| Top third over bottom third (mean luma) | three sunlit crowns | 1.26–1.62 |
| Core over rim (mean luma) | three sunlit crowns | 0.59–0.94 |
| Lit clumps (smoothed at 3 px), equivalent diameter over crown width | six crowns | median 0.5–1.2%, 90th percentile 1.3–3.5% |
| Sky holes, equivalent diameter over crown width | six crowns | median 0.2–0.5%, 90th percentile 0.6–1.5% |

The wheat photograph is colour-graded, so only its ratios are used.

**Reported.**
- Beer–Lambert gap fraction in canopies, P = exp(−G Ω LAI / cos θ), with G often taken as 0.5 (via canopy
  clumping-index papers).
- Horn (1971), *The Adaptive Geometry of Trees*: sunlight is filtered through the crown. The ratio was not measured
  here.
- Jackson et al. (2019), J. R. Soc. Interface:
  - f₀ follows the cantilever beam, f₀ ∝ dbh/H² (after Moore & Maguire 2004);
  - f₀ rose 19% when the leaves fell;
  - damping was 8.6% in summer and 3.9% in winter;
  - a simulated sycamore swayed at 0.26 Hz.
- The coefficient k ≈ 340 m/s is estimated from the uniform cantilever with green wood's E/ρ. The Moore & Maguire fit
  could not be read in full.
- A hanging chain's first mode is ω = 1.2024 √(g/L) (classical mechanics).
- Wikipedia, Autumn leaf color: "The brighter the light … the greater the production of anthocyanins". Carotenoids
  are already in the leaf.
- Lekner & Dorf (1988), Applied Optics 27: wet surfaces darken because light is trapped in the water film. The amount
  used here is estimated.

**From Needham's lessons (quoted).**
- "Leave openings … between the touches of colour."
- "Preserve the highlights on the edges of the sprays and tufts of leaves in the centre of the tree."
- Where the trunk "peers out in the heart of the tree … bold black touches, through which again bits of clear light
  are seen at intervals."
- "Save out the lights where the sky is seen through."
- "Final touches of dark colour, judiciously used, so that the work may not become spotty."

**What the renders changed.** Each change was checked on a review page of eight species at 1×, 2× and 3×:
- Flat ellipse masses became tufts. They first read as coins and pancake stacks, so their lit sides are now made of
  leaf glyphs, with darker leaves beneath.
- Layered tufts stacked into horizontal bars. They now tilt and have softer undersides.
- Hard dark ellipses showed where mass bodies stuck out. The dark body is now the tufts enlarged.
- Twigs ended bare beyond the foliage. Small or thin masses now always get a tuft, and bare tips are clothed in leaf.
- The ladder was applied in linear light although it was measured in luma. It is now converted (power 2.2) and
  anchored at the 75th percentile, which stopped lit tufts blowing out.
- The gap was counted from cut holes only. It now counts what is seen, as on the photographs.
- The polygonal holes looked like pale eyes. They are now smooth and ragged, fringed by leaves.
- A dark ring outlined every blossom puff. Blossom no longer has a dark body.
- The cedar's trunk showed as a stripe through the crown. The leader is now clothed.
- Trunks ended in a cut-stump lip under narrower limbs. The convex crotch tried first was a flat kite, so the limbs
  now swell at the base instead.
- Bark marks crossed at forks. They are now clipped per branch and kept off the swollen bases.
- Trees in rain looked sunlit. They are now dimmed under overcast and dusk, with wet bark.
- In the Seasons lab, full detail moved at 11 fps, so the lab draws medium detail (about 24 fps) while the tree moves.

**Checked numerically** (zelkova, black pine, cedar and maple in July):
- the tuft luma ladder sits inside the measured spread ±0.05;
- the seen gap is 10–22%;
- top over bottom is 1.5–2.2: more top-lit than the photographs, recorded as a limit.

No owner review yet.
