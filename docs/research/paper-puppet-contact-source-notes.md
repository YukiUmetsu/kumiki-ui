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
