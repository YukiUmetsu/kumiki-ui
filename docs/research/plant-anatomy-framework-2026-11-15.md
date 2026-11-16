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
- **Chinese ink:** trees in the shanshui and cinematic landscapes;
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

## Next

Apply FLORA1 to the ukiyo-e trees, comparing with the Hiroshige and Hokusai references. Today the UKIYO1 cherry's
branches are straight spokes with dot flowers, where FLORA1 calls for sympodial elbows, notched five-petal blossom and
lenticel bark.
