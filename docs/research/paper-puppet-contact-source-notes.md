# Paper puppet contact: preliminary source observations

Status: **research in progress**, not an ArtCraft source or release gate pass. These public-domain stills inform a future original paper actor's static contact silhouette; neither establishes pivot locations or motion timing. A motion reference, labeled board, measured source and candidate masks, construction manifest, five-axis evidence and actual render review remain to be completed before implementation can be qualified.

## Sources and observed details

1. Auguste Edouart, [*James Tooley*](https://www.metmuseum.org/art/collection/search/656554), 1844, cut-paper silhouette. The Met labels the work public domain. Its [original image](https://images.metmuseum.org/CRDImages/dp/original/DP-16322-001.jpg) is 1955 × 4000 pixels; SHA-256 `98c1f530ef4f9e2b4f1c923cfc318c0d372fcbde8d1b1deaa65c7632197f6bb9`. The inspected hand crop is x=850, y=1450, width=640, height=760. A continuous dark sleeve and hand meet the cane; several curved, fine light marks imply finger divisions inside the silhouette. They are not individually cut fingers. The cane joins underneath the hand. A light neck/collar gap, top-hat brim and pointed shoes support the full pose's readable profile.
2. Anonymous American, [*Two Men, One Cutting a Silhouette*](https://www.metmuseum.org/art/collection/search/370831), 1830–1900, cut paper and ink wash. The Met labels the work public domain. Its [original image](https://images.metmuseum.org/CRDImages/dp/original/DP140863.jpg) is 3143 × 3868 pixels; SHA-256 `46e7140709c884522225ce1c8e47f09c6e2c500b294afb65534df4b70a2aa894`. The inspected crop is x=850, y=1800, width=700, height=650. One hand grips the upper edge of a paper strip, with a small light opening between bent fingers and the strip; the other hand holds scissors, whose slender blades cross near the paper edge. The two hands are separated by a long irregular light gap. The source is a still: exact physical layering and hinge construction cannot be determined from it.

## Feature-to-construction hypotheses

| Feature | Source observation | Candidate construction to investigate | Evidence required |
|---|---|---|---|
| Sleeve-to-hand | Continuous silhouette at cuff in source 1 | Overlapping opaque hand and sleeve sheets with hidden pivot; preserve contour under rotation | Source and actual 1×/3× crop, extreme-pose continuity |
| Holding a narrow prop | Source 1 places the hand over the cane; source 2 has a hand/paper opening | Authored contact geometry and depth ordering; retain meaningful openings | Matched contact landmarks, visible gap and no prop drift through motion |
| Finger detail | Source 1 uses subtle interior lines; source 2 uses a real light opening | Choose interior marks or true cut-through according to each intended feature, not a uniform finger motif | Labeled source and render masks, inspect at final size |
| Negative space | Source 2 keeps a long asymmetric gap between hands | Independently authored arm shapes with clearance at contact | Source-to-render gap masks and stress poses |

These observations are technique references, not instructions to copy the composition or personal likeness. Obtain an actual permitted motion example and determine independent joint/pose observations before selecting a rigging API or writing an actor. Exact images remain linked rather than bundled; source checksums enable re-verification.

## Portrait reference retrieval (not an acceptance result)

The two candidate photographs described in PR #359 can be fetched directly from the Library of Congress; earlier claims that local source bytes were unavailable no longer apply to this environment. The TIFF files are kept in `/tmp` for this working session, not committed. The links and checksums allow them to be retrieved and checked again:

- [Woman facing right, Library of Congress item 99472203](https://www.loc.gov/item/99472203/): [TIFF](https://cdn.loc.gov/master/pnp/cph/3c20000/3c24000/3c24700/3c24798u.tif), 3295 × 4096, SHA-256 `e48783007dd0b535017ecb0677e6f88d954258c45f39485dbff76a6cfa5f3025`. Wikimedia's [file history](https://commons.wikimedia.org/wiki/File:African_American_woman,_head-and-shoulders_portrait,_facing_right_LCCN99472203.jpg) describes its large copy as an upscale from 824 × 1024; pixel dimensions alone must not be treated as independent fine-detail resolution. The record labels the image public domain; archival access restrictions on original albums are distinct from the digital file's rights.
- [Warren G. Harding profile, Library of Congress item 2006691556](https://www.loc.gov/item/2006691556/): [TIFF](https://cdn.loc.gov/master/pnp/cph/3a00000/3a01000/3a01900/3a01972u.tif), 1154 × 1536, SHA-256 `720a3b83d01489e759b0a815ea167bfbc878a3c6746bd0c260f19cf9f543cad7`. The Library states no known restrictions on publication. Wikimedia's [file history](https://commons.wikimedia.org/wiki/File:Warren_G._Harding,_head-and-shoulders_profile_portrait_LCCN2006691556.jpg) identifies its large copy as an upscale from 481 × 640; verify effective detail before accepting it as a high-resolution anatomy source.

These files have **not** yet been independently annotated with 18 source landmarks, matched to actual render landmarks or five value planes, or subjected to the portrait fidelity gate and independent visual review. Neither retrieval nor hashing approves PR #359. Select a more detailed source if the available effective resolution cannot support the required observations.
