# F1 V26 — source-registered wax cavity deposition order (2026-11-16)

**Experimental, unapproved, draft PR #461.**

CC0 Campbell source: exact 608×1082 screenshot SHA `f8d28cbede8c8c14f9902a328b6e979e353fd9ebe6efb454bda3152586b929c2`. Compare near dark center (405,631) source [29,4,4] vs V25 [140,103,93]; far (450,627) source [74,22,18] vs V25 [145,111,101]. Actual V25 source-normalized nose SSIM .548200, worse than V24 .557073. The physical reason proposed: the native painter places the alar roof after its dark recess, then overpaints the very cavity. This opt-in version reorders only the **two existing** cavity elements to appear behind *no further roof paint*; it retains their named rig and exact full 300-frame time, changes original native wax pressure and source-observed shape, and leaves other elements untouched.

Five axes: native hooked near/foreshortened far topology; distinct curved nib direction; skin/cavity hard-soft edge juxtaposition; unequal width/pressure; original paper-tooth/clumped wax material rather than image filters. This may create *worse* dark stickers; native screenshot comparison and whole-face source check determine acceptance, not code assertions.

Same Crayon ArtCraft Adult Face Lab offers reversible `source-carved-naris` V26 3× story. Existing V25 is exact negative control. Vitest checks source/candidate identity, source dimensions, all unaffected pixels/geometry (by element), actual paint order, malformed anatomy guard and native SSR.

**HARD GATE:** no ArtCraft 9.1 18-landmark source match, SSIM≥.85, artist 1×/3× approval, five-zone realistic lighting, or normal-speed 300-frame validation. This is not a finished human. Keep PR draft and do not merge for artistic release.
