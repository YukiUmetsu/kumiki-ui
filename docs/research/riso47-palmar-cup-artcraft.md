# RISO47 — redraw original metacarpal cup and tuck support digits

**Art status: source candidate, not artist-approved.** Built on open RISO46 PR #460. Previous 1× native f160 screenshots show the root problem: a flat, nearly rectangular positive palm and three long horizontal rake-like support fingers on the recipient. Additional tiny screened ink marks cannot fix macro form.

## Authenticated reference study (not copies)

1. **Proko, [Muscle Anatomy of the Hand](https://www.proko.com/course-lesson/how-to-draw-hands-muscle-anatomy-of-the-hand/)**. Palmar thenar volume begins near the wrist; the dorsal thenar egg is shorter. The thumb–index web is taut when spread, cupped/inward when pinching, and forms a compressed rim when close. No single ellipse can represent both the thenar base and the index web. **Source intervention:** redraw the actual main palm positive contour with a rounded radial thumb buttress, ulnar heel, and unequal MCP shoulders. Keep earlier RISO46 thenar lobes physically attached.
2. **Proko, [Details for Realistic Hands](https://www.proko.com/course-lesson/how-to-draw-hands-details-for-realistic-hands/)**. During opposition the thumb turns across the other fingers, rather than forming a fifth parallel finger. In a cup, the three supporting PIP/DIP hinges fold inward and their profiles shorten. **Source intervention:** increase distinct, ANAT1-bounded support PIP/DIP flex and receiver-only MCP cup rotation without moving the original index-to-paper pinching joint, fingernails or printed segments.
3. **[NCBI Bookshelf, clinical Froment sign photograph](https://www.ncbi.nlm.nih.gov/books/NBK564355/figure/article-23735.image.f3/)**. The image visibly separates the opposed thumb/index rim from the folded little/ring/middle mass; its projection shows overlapping joint silhouettes and bounded negative spaces. **Caveat:** Froment's sign depicts compensation due to weakness, so the photographed IP flex is not a normal hand-angle prescription. We study only topology, web attachment and relative depth; no tracing, copied pixels or pathology-based fitting.
4. **[RISOTTO Studio, printing FAQ](https://risottostudio.com/pages/printing-faq)** and [the Risograph process](https://risottostudio.com/pages/what-is-risograph-printing). Distinct translucent spot layers, screen frequencies and paper absorption produce the tactile edge; small 0–10% vector coverage may disappear physically. **Source intervention:** keep the original solid RED positive skin surface, actual separately screened BLUE incisions, inherited RISO20 dot gain, print registration and opaque paper knockouts. Never fake volume with RGB blur or third paint.

## Shape graph and expression of depth

**Macro:** the old primary palm was one soft-edged rectangle with its bottom boundary nearly parallel to the wrist, ending in an even row of four digit roots. The new **single true red closed path** starts at the radial wrist and passes through a thumb abductor buttress; it follows four distinctly high/low knuckle crests, an ulnar heel and an irregular wrist seam. Fourteen original cubics give real curvature continuity, not an airbrush or replaced CSS icon. Both actors have independent contour control parameters; right/left are true source-coordinate mirrors.

**Meso:** preserve the inherited RISO45 index/thumb contact and **all original 3-bone PIP/DIP finger paths**. The f160 control path uses RISO45's separately articulated, empirically QA-passing receiver MCP +34/+30/+26, original clinically bounded PIP .56/.56/.57 and DIP .49/.47/.48. We also tested a tighter +44/+40/+36 MCP plus stronger PIP/DIP cup; real two-frame finger-axis checks **rejected** the candidate: the receiver's index/middle white corridor collapsed to 2.64 source units at f156 (minimum required is greater than 3). Increasing MCP root splay merely moved the defect. The rejected stronger curl was fully reverted without weakening assertions. This iteration now targets the positive **palm volume** rather than claiming solved 3/4 finger projection.

**Micro:** preserve 18 prior individual RISO30 hand ArtCraft strokes per hand, the RISO37 cobalt nail, tendon and skin crease engraving, RISO46 RED/BLUE thenar lobes, all 12 original red index+support bone segments, true ink screen/dot gain and paper reserve.

**Time, print and depth:** full 240-frame, 24fps film. The opaque paper passes between red index on top and thumb/support below; no new front layer for the other fingers. Storybook remains in its original Risograph/ArtCraft group; pose control includes 144,154,156,160,166; all physical plate/zoom/rig/aspect controls remain.

## Release-grade checks

- All inherited source-white axis gaps must remain **strictly above three** film-source units at each 2-frame sample for both humans and both hands. If a new cup breaks the corridor, repair the **source MCP location or rotation**, never reduce test thresholds.
- Exact signed red path geometry: closed, 14+ cubics, significant printed area, mirrored chirality, differentiated actors and original named `left-glove` / `right-glove` source parts.
- Unit/e2e: RISO30–46, original 960×540 and 540×960 print film, original red/cobalt dot separation, f160/166 actual index-paper source contact, thumb physically beneath paper, full Storybook render and TypeScript.
- **Artistic HOLD until** both 1× full-film and 6.2×/7.4× source crops are visually reviewed for real palm/finger negative spaces, individual support fingertip silhouettes, skin-value planes and reference anatomy. If still rake/claw-like, keep the PR draft and focus on major joint/projection redraw, not adding decorative texture.

No external image files, source-photo pixels or paid dependencies were imported.
