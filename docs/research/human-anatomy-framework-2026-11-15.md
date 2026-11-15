# Human anatomy framework — sources and evidence (2026-11-15)

Research behind [ANAT1](../component-specs/human-anatomy.md). Each source is graded: **M** measured population data,
**A** primary clinical table verified here, **B** standard anatomy/clinical fact cited but not re-measured, **S** sculpted
model output.

## Data shipped in the pack

| Source | What we use | Rights | Grade |
|---|---|---|---|
| [ANSUR II public release](https://www.openlab.psu.edu/ansur2/) (U.S. Army 2012; women n = 1,986, men n = 4,082) | 93 measurements: mean, SD, p1–p99, ratio to stature, linear regression on stature, group medians. Summary statistics only (`data/ansur-ii-ranges.json`, CSV SHA-256 recorded). `interpupillarybreadth` and `weightkg` are stored in tenths in the CSV and are rescaled. | U.S. Government work | M |
| [CDC 2000 growth charts](https://www.cdc.gov/growthcharts/percentile_data_files.htm) — `statage.csv` (2–20 y) and `lenageinf.csv` (12 and 18 months) | LMS parameters and p5/p50/p95 for stature/length by sex | U.S. Government work | M |
| [CDC normal joint ROM study](https://archive.cdc.gov/www_cdc_gov/ncbddd/jointrom/index.html) (Soucie et al., *Haemophilia* 2011;17:500–507) | Means by sex and age band for hip, knee, ankle, shoulder flexion, elbow, pronation/supination (`CDC_ROM`) | U.S. Government work | M |
| AAOS normal ROM table as reproduced in Hendriks et al., *Plast Reconstr Surg Glob Open* 2020, SDC 1 | Neck, shoulder, elbow, wrist, hip, knee, ankle, toe MTP, thumb and finger ranges (fingers from Richards & Parry) | cited values | A |
| Farkas et al. 2005 / 2007 and Al-Sebaei 2015 (*Head & Face Medicine* 11:4, CC BY 4.0, [PMC4369102](https://pmc.ncbi.nlm.nih.gov/articles/PMC4369102/)) | tr–n, n–sn, sn–gn, ex–en, en–en, al–al by sex: North American white (n = 109/200), African American (50/50), Saudi (75/93) | cited values | M |
| [MakeHuman](https://github.com/makehumancommunity/makehuman) hm08 base mesh, macro targets, default skeleton and weights | the morphable, posable body lattice | CC0 1.0 | S |
| [MediaPipe canonical face model](https://github.com/google-ai-edge/mediapipe/blob/master/mediapipe/modules/face_geometry/data/canonical_face_model.obj) | 468-point average face surface, feature loops | Apache-2.0 (licence copied to `data/`) | S |
| Wikimedia Commons plates (Richer 1890, Gray 1918, Duchenne 1862, Leonardo c.1490, Muybridge 1887) | 22 reference images, licence read per file from the Commons API | Public domain / CC0 | — |

Commonly cited values not re-verified against a primary table (grade B): shoulder internal/external rotation 70/90°,
hip rotation 45/45°, wrist radial/ulnar deviation 20/30°, ankle inversion/eversion 35/15°, trunk flexion/extension/side
bend/rotation 80/25/35/45°, horizontal visible iris diameter ≈ 11.7 mm, adult ear growth ≈ 0.22 mm/year (Heathcote,
BMJ 1995), stature loss ≈ 1 cm per decade after 40. Jaw opening and gaze ranges are drawing estimates (E).

Sources searched but not used: the Fang, Clapham & Chung 2011 systematic review of interethnic facial dimensions
(PMC3074358) is not open access in full text; WHO child growth standards (licence terms) — CDC infant length was used
instead.

## What the data changed in the drawing rules

- **Heads tall:** measured-average adults are ≈ 7.5–7.8 heads (model), not 8; a two-year-old ≈ 5, a one-year-old ≈ 4.6.
- **Crotch:** a little below half height (ANSUR p50 0.480 women, 0.481 men).
- **Span:** exceeds stature (1.018 women, 1.031 men).
- **Face thirds are unequal:** the middle third is shortest; men's lower third longest (Farkas).
- **Nose width = eye gap** holds for North American white adults but not for many groups (African American al–al
  averages ≈ 23% wider than en–en).
- **Teenagers:** MakeHuman's linear age interpolation makes 14-year-olds ≈ 25 cm too short; ANAT1 scales to CDC stature.
- **Landmark placement** needs anatomy, not surface extremes: the jugular notch sits between the clavicle heads, C7 at
  the base of the neck, the iliac crest on the supracristal plane through L4 — surface maxima picked the hands, the
  trapezius or the trochanter instead and failed calibration by 3–6 SD before the fix.

## Calibration findings

See the table in the spec. After fixes, most measures are within ±2 SD of ANSUR ratios; remaining model deviations are
listed there and come from the MakeHuman sculpt (short upper arm, short female foot, long male hand and span).

## Review status

Agent inspection of Storybook screenshots (Chromium) for every story; numerical checks of joint directions and palm
orientation. Human visual review has not been recorded.
