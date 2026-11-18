# ANAT5 source-to-construction matrix

**Target:** 320×390 master SVG per character; intended output is a 16:9 animated film scene with close-up inserts.  
**Mode:** style-guided original characters, not pixel-matched copies.  
**Reference rule:** one canonical identity source per character. Secondary images are technique or role benchmarks and must not silently overwrite the primary silhouette.

## Canonical source assignments

| Character | Primary identity source | Secondary benchmark | Explicitly not transferred |
|---|---|---|---|
| Ming scholar | [Met 55.37, rightmost anonymous sitter in IIIF 161536](https://www.metmuseum.org/art/collection/search/51810) | [Met 52.177.8](https://www.metmuseum.org/art/collection/search/51783) for tonal wash and robe volume | The other two sitters in 55.37; the Qing rounded cap and fur coat |
| Seated writer | [Met 2024.180, seated writer](https://www.metmuseum.org/art/collection/search/910543) | [Met 52.177.5](https://www.metmuseum.org/art/collection/search/51780) for subtle face, hair and collar detail | The secondary Qing sitter's identity and costume |
| Standing attendant | [Met 2024.180, standing attendant](https://www.metmuseum.org/art/collection/search/910543) | [Smithsonian F1916.135](https://asia-archive.si.edu/object/F1916.135/) for role hierarchy | Paired coils when the primary image reads as one high tied mass |

## Feature/detail fidelity matrix

| Part / feature | Source crop | Macro proportions | Meso construction | Microdetails | Construction method | Review frame | Status |
|---|---|---|---|---|---|---|---|
| Scholar skull and face | 55.37 rightmost sitter | Three-quarter, narrow but not elongated into a generic oval | Temple, cheek, jaw, chin planes; source contour separate from ANAT1 mesh | Brow ridge, canthi, alar wing, philtrum, vermilion border | Source-authored SVG contour over ANAT1 deformation understructure | Neutral 1× and 3× face | **Fail — current face reads generic** |
| Scholar cap | 55.37 rightmost sitter | Tall squared crown with softened corners | Crown, front panel, side seams, band | Woven edge, cloth grain, irregular ink edge | Separate cap silhouette and material layers | Full head and 3× crown | In progress |
| Scholar moustache/beard | 55.37 rightmost sitter | Chin-attached, three-quarter asymmetry | Moustache, cheek roots, chin substrate, separate fibers | Variable width, taper, root density and split ends | Separate semantic SVG paths | 3× lower-face crop | **Fail — current beard reads as a narrow triangular bundle** |
| Writer face/gaze | 2024.180 seated writer | Small face, lowered inward gaze, inclined head | Eye sockets, lid planes, cheek/nose planes, jaw/neck | Unequal lids, canthi, subtle lip, nose wing | Source-specific contours plus ANAT1/EXPR1 deformation | Neutral and expression 3× | **Fail — current face is too generic** |
| Writer hair | 2024.180 seated writer | Pinned coiffure with asymmetrical mass | Primary bun, secondary coil, ornament and hairline | Fine rooted fibers, pin insertion, floral petals | Overlapping authored masses plus directional strands | 3× hair crop | In progress |
| Attendant face/gaze | 2024.180 standing attendant | Smaller secondary figure, lowered gaze | Head tilt, neck insertion, separate cheek/jaw contour | Lid asymmetry, nose tip, small mouth | Source-specific contour and pose | 1× full / 3× head | **Fail — face still reads like a generic vector portrait** |
| Attendant hair | 2024.180 standing attendant | One high tied mass | Back bun, hairline, pin and ornament | Directional fibers and edge breaks | One asymmetric bun, not paired coils | 3× hair crop | In progress |
| Collars and robes | 2024.180; 52.177.5/52.177.8 technique only | High collar, sleeve and robe volume | Overlap, fabric thickness, fold convergence | Embroidery, seams, wash edges | Separate collar bands, sleeve openings and fold paths | 1× upper body / 3× collar | In progress |
| Ink and support material | 55.37, 2024.180; later portraits as technique only | Restrained warm palette | Layered translucent wash, fine contour, paper/silk support | Edge blooms, dry-line breaks, sparse fibers | Layered SVG washes and source-directed stroke marks | 100% and 300% | **Blocked — local source scans unavailable** |

## Current visual review (CI artifact 14391847050)

- anat5-scholar-neutral.png: the earlier source notes conflated multiple sitter identities; the face is still too smooth and generic at 3×. The tall cap is plausible for the selected 55.37 sitter, but the cheek/jaw contour and beard mass are not yet convincing.
- anat5-attendant-fear.png: the previous paired-coil hair was not supported by the primary 2024.180 attendant; it has been replaced with a single high bun. The face remains too generic and the collar too simplified.
- The full-page reference board sometimes captured remote images before decode completed. The E2E test now waits for every reference image to report complete and naturalWidth greater than zero, and emits separate 3× crops for all three characters.

## Required next iteration

1. Review the fresh 1×/3× screenshots after the current source-lock commit.
2. Rebuild the face silhouette as source-authored curves; keep ANAT1 only as a deformation scaffold.
3. Improve eye, nose and mouth planes with source-relative asymmetry; reduce generic heavy vector outlines.
4. Make the beard a connected cheek-to-chin construction with a broad enough substrate and independent directional fibers.
5. Keep writer and attendant hairstyles distinct; validate the attendant single-bun silhouette against the primary scene.
6. Build and inspect local archival source crops and annotated overlays before any release claim.

## Gate status

- REFERENCE: **blocked** — source records and direct IIIF URLs are documented, but local high-resolution image archives and annotated source crops are not present in this environment.
- CONSTRUCTION: **in progress** — source assignments and part inventory are being tightened.
- SHAPE / DETAIL: **fail** — latest available 3× screenshots still show generic face geometry and weak beard/hair construction.
- MOTION: not yet accepted for this character set.
- DELIVERY: **blocked** — no approved static hero face or independent source/render fidelity evidence.
