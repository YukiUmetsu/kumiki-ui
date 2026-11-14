# Editorial crayon character artistry: field-naturalist hare

Date: 2026-11-14.

## Specific art-direction problem

The previous hero's head and feet were ellipses, its eyes were nearly
circular, its torso a single oval and its flower a symmetrical five-petal
icon. These cues made even the new wax material look like an early-reader
illustration. Mature art demands proportion, asymmetry, restrained value
hierarchy, drafted garment construction and structure-following strokes.

Art references (used as technique, not artwork to reproduce):
- [Philadelphia Museum of Art — terminology for drawings](https://legacyweb.philamuseum.org/doc_downloads/conservation/DescriptiveTerminologyforArtonPaper.pdf):
  real wax crayon clumps and lifts at nib ends; it is not uniform SVG noise.
- [Richard Hull crayon drawings](https://westernexhibitions.com/exhibition/5488/):
  thick varied wax surfaces and controlled scratched marks for mature art.
- [Alvia Alcedo fantasy creature wax art](https://twoucan.com/profile/AlviaAlcedo):
  long gestural fur, rich silhouette and accent colors.
- [Chiaki Akada tiger artwork](https://unknownasia.net/archives/artist_detail.php?aid=216&ymd=20240101):
  selective planes of light, fine animal structure and carefully scaled marks.

## Implemented in original acting rig

- Taller, asymmetric tapered ears and a leaner skull, cheek-light,
  temple-shadow and jowl anatomical color planes.
- Leg and ankle volumes rather than two ellipse-shaped feet, plus
  true boot-shaped painted forms with retained contact anchors.
- A field coat formed from independently blocked lapels, left/right
  panels, shadow and seam paths, pocket details and brass buttons.
- An asymmetric botanical flower specimen, finger/hand glove, leaf
  engraving and subdued earth/olive/slate palette.
- Eyes redrawn as narrow almond forms and all existing visemes
  refined to expressive but smaller facial movements.
- New generic `crayonFormHatching` places bounded, seeded, form-directed
  strokes within the intended anatomical mass. Coat textile, ear fur,
  cheek grain, boot weathering and flower petal lines inherit the
  correct original motion parents, with no free-floating noise.
- Storybook `editorialDetail` from 0 to 1 independently controls hatch
  density while outer silhouette/pose/camera remain identical.
- Editorial captions now read as a field-journal observation rather
  than a child's greeting card.

## Critique / remaining

Still stylized 2D source illustration, not anatomy inferred from a 3D
sculpt. Frame-by-frame silhouette review at 16:9 and 9:16 is needed to
check coat overlap and original motion interpolation. The next step
is a true turnaround and proportional measurements for each region,
followed by more than one mouth and eyelid redraw at key acting poses.

No outside artwork has been copied or imported.
