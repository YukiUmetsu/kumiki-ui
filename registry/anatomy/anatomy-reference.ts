/**
 * ANAT1 reference knowledge: measured ranges, growth, joint norms, canon checks and surface anatomy for artists.
 *
 * Evidence grades used throughout:
 *   M  measured population data shipped here (ANSUR II, CDC growth, CDC ROM, Farkas norms)
 *   A  primary clinical table verified for this pack (AAOS ROM via Hendriks et al. 2020)
 *   B  standard anatomy/clinical fact, widely cited, not re-measured here
 *   S  derived from the sculpted MakeHuman model (useful for drawing, not population data)
 */
import ansurData from "./data/ansur-ii-ranges.json";
import modelTables from "./data/model-tables.json";

export type Sex = "female" | "male";
export interface AnsurStat { kind: string; unit: string; description: string; mean: number; sd: number; p1: number; p5: number; p25: number; p50: number; p75: number; p95: number; p99: number;
  ratioToStature?: { mean: number; sd: number; p5: number; p50: number; p95: number }; onStature?: { slope: number; intercept: number; r: number; residualSd: number } }
interface AnsurPop { n: number; age: Record<string, number>; bmi: Record<string, number>; measurements: Record<string, AnsurStat>; byGroup: Record<string, { n: number; p50: Record<string, number> }> }
export const ANSUR = ansurData as unknown as { source: Record<string, unknown>; female: AnsurPop; male: AnsurPop };
export const ANSUR_MEASURES = Object.keys(ANSUR.male.measurements);

/** A measured ANSUR II statistic (mm, kg for weightkg). */
export const ansurStat = (sex: Sex, key: string): AnsurStat | undefined => ANSUR[sex].measurements[key];

/**
 * Predict a coherent set of adult dimensions (mm) for a given stature from ANSUR II linear regressions, plus the
 * residual SD (how much real people of that height vary). Good for drawing a specific person consistently.
 */
export function predictFromStature(sex: Sex, statureMm: number): Record<string, { value: number; residualSd: number }> {
  const out: Record<string, { value: number; residualSd: number }> = { stature: { value: statureMm, residualSd: 0 } };
  for (const [k, m] of Object.entries(ANSUR[sex].measurements)) if (m.onStature) out[k] = { value: Math.round(m.onStature.intercept + m.onStature.slope * statureMm), residualSd: m.onStature.residualSd };
  return out;
}

export { STATURE_FOR_AGE, normalQuantile, statureForAge } from "./anatomy-growth";

/** Model-derived tables (heads tall by age, calibration against ANSUR, preset landmark/joint positions). Grade S. */
export const MODEL_TABLES = modelTables;

export interface CanonCheck { canon: string; finding: string; data: string; grade: "M" | "S" | "B" }
const A = (s: Sex, k: string) => ANSUR[s].measurements[k].p50;
/** Classic drawing canons tested against measured data, so drawings avoid idealised errors. */
export const CANON_CHECKS: readonly CanonCheck[] = [
  { canon: "Arm span equals height (Vitruvian)", grade: "M",
    finding: "Span slightly exceeds stature, more in men.", data: `ANSUR II p50 span/stature: women ${(A("female", "span") / A("female", "stature")).toFixed(3)}, men ${(A("male", "span") / A("male", "stature")).toFixed(3)}.` },
  { canon: "The crotch is at half height", grade: "M",
    finding: "The crotch sits a little below half height in adults; far lower in small children (short legs).", data: `ANSUR II p50 crotch/stature: women ${(A("female", "crotchheight") / A("female", "stature")).toFixed(3)}, men ${(A("male", "crotchheight") / A("male", "stature")).toFixed(3)}. Model at 2 years ≈ 0.39.` },
  { canon: "Wrists hang at the crotch", grade: "M",
    finding: "Holds well for adults standing with arms relaxed.", data: `ANSUR II p50 wrist height vs crotch height: women ${A("female", "wristheight")} vs ${A("female", "crotchheight")} mm, men ${A("male", "wristheight")} vs ${A("male", "crotchheight")} mm.` },
  { canon: "Foot length equals forearm length", grade: "M",
    finding: "Close in adults.", data: `ANSUR II p50 foot vs radiale–stylion: women ${A("female", "footlength")} vs ${A("female", "radialestylionlength")} mm, men ${A("male", "footlength")} vs ${A("male", "radialestylionlength")} mm.` },
  { canon: "Shoulders are wider than hips in men, narrower in women", grade: "M",
    finding: "Bony shoulder width (biacromial) exceeds hip width in men; in women the two are nearly equal, so the hips read wider once the deltoids are lean.", data: `ANSUR II p50 biacromial vs hip breadth: women ${A("female", "biacromialbreadth")} vs ${A("female", "hipbreadth")} mm, men ${A("male", "biacromialbreadth")} vs ${A("male", "hipbreadth")} mm.` },
  { canon: "An adult is eight heads tall", grade: "S",
    finding: "Eight heads is the heroic/fashion ideal. Average adults measure about 7.5 heads; a two-year-old about 5; a one-year-old about 4.6.", data: "MakeHuman lattice (vertex–menton head height): woman 25 y 7.78, man 25 y 7.59, age 2 4.94 (see MODEL_TABLES.byAge)." },
  { canon: "The eyes are halfway down the head", grade: "S",
    finding: "True for adults (the eye line is at 0.49–0.53 of head height measured from the chin); in children the eyes sit below the middle because the cranium is large.", data: "MakeHuman lattice eye line / head height: age 2 ≈ 0.44, age 10 ≈ 0.47–0.49, adults ≈ 0.49–0.53." },
  { canon: "The face divides into equal thirds", grade: "M",
    finding: "Real thirds are unequal: the middle third (nasal root to nose base) is usually the shortest and, in men, the lower third the longest.", data: "Farkas NA white men tr–n 67.1, n–sn 54.8, sn–gn 72.6 mm; women 63.0, 50.6, 64.3 mm (via Al-Sebaei 2015)." },
  { canon: "The space between the eyes equals one eye width", grade: "M",
    finding: "The intercanthal gap is usually slightly wider than one eye (about 1–3 mm).", data: "Farkas NA white men en–en 33.3 vs ex–en 31.3 mm; African American men 35.8 vs 32.9 mm." },
  { canon: "The nose is as wide as the gap between the eyes", grade: "M",
    finding: "Holds within a few percent for North American white adults but not for many groups: African American noses average about 23% wider than the intercanthal gap.", data: "Farkas al–al vs en–en: NA white men 34.9 vs 33.3, women 31.4 vs 31.8; African American men 44.1 vs 35.8, women 40.1 vs 34.4 mm." },
  { canon: "The hand covers the face from chin to hairline", grade: "M",
    finding: "Close in adult men.", data: `ANSUR II p50 hand length men ${A("male", "handlength")} mm vs Farkas NA white men tr–gn ≈ 194 mm (67.1 + 54.8 + 72.6).` },
  { canon: "The ear spans brow to nose base", grade: "M",
    finding: "Ears are a little longer than the nose height and keep growing with age.", data: `ANSUR II p50 ear length men ${A("male", "earlength")} mm vs Farkas n–sn 54.8 mm. Ear length increases about 0.22 mm per year in adults (Heathcote, BMJ 1995; grade B).` },
];

export interface SurfaceForm { id: string; region: "head" | "neck" | "torso" | "arm" | "hand" | "pelvis" | "leg" | "foot"; kind: "bone" | "muscle" | "fat" | "tendon" | "crease";
  where: string; shows: string; draw: string }
/** Surface anatomy that decides whether a drawn body reads as real (grade B: standard anatomy). */
export const SURFACE_FORMS: readonly SurfaceForm[] = [
  { id: "orbital-rim", region: "head", kind: "bone", where: "Bony ring around the eye; the brow ridge above, the cheekbone below.", shows: "Always; deeper set eyes in older and leaner faces.", draw: "The eyeball sits inside the rim: the upper lid tucks under the brow, and the outer corner is set back from the inner (see the side views)." },
  { id: "zygomatic-arch", region: "head", kind: "bone", where: "Cheekbone running back from below the eye to just in front of the ear.", shows: "Its widest point (zygion) sets face width.", draw: "The plane change from front to side of the face; the key light's terminator often runs down it." },
  { id: "temporal-fossa", region: "head", kind: "crease", where: "Shallow hollow above the zygomatic arch at the temple.", shows: "Lean and older faces.", draw: "A soft concave plane at the side of the forehead; don't draw the skull as a smooth egg." },
  { id: "nasolabial-fold", region: "head", kind: "crease", where: "From the side of the nose wing (alare) to beyond the mouth corner.", shows: "Deepens with smiling and age.", draw: "A curved form edge, not a line: light one side, shade the other." },
  { id: "philtrum-and-lips", region: "head", kind: "muscle", where: "Two ridges from the nose base to the upper lip's cupid's bow; orbicularis oris rings the mouth.", shows: "Always.", draw: "The upper lip faces down (usually darker), the lower lip faces up (catches light); the mouth wraps around the dental arch." },
  { id: "jaw-and-masseter", region: "head", kind: "muscle", where: "From the cheekbone down to the jaw angle (gonion).", shows: "Square jaw in lean faces; bulges when clenching.", draw: "The jaw angle sits below the ear lobe; the jawline rises from chin to ear." },
  { id: "sternocleidomastoid", region: "neck", kind: "muscle", where: "From the mastoid (behind the ear) to the top of the sternum and the inner clavicle.", shows: "Forms the V of the neck; the side opposite the turn stands out.", draw: "Two cords converging on the jugular notch; the neck is a tilted cylinder set forward on the torso." },
  { id: "clavicle", region: "torso", kind: "bone", where: "S-curve from the jugular notch to the acromion.", shows: "Lean bodies; the shelf between neck and chest.", draw: "Nearly horizontal from the front, rising slightly to the shoulder; rises with arm elevation (scapulohumeral rhythm)." },
  { id: "trapezius", region: "torso", kind: "muscle", where: "From the skull and spine (C7–T12) to the outer clavicle, acromion and scapular spine.", shows: "Sets the slope from neck to shoulder.", draw: "The neck-to-shoulder line is a curve, steeper in muscular men; it bunches when the shoulders lift." },
  { id: "deltoid", region: "arm", kind: "muscle", where: "From clavicle, acromion and scapular spine to the outside of the mid upper arm.", shows: "Caps the shoulder; widest across the body (bideltoid breadth).", draw: "A teardrop inserting a third of the way down the arm; its front edge borders the chest." },
  { id: "pectoralis-major", region: "torso", kind: "muscle", where: "From clavicle, sternum and ribs into the upper arm, forming the front armpit fold.", shows: "Chest plane; twists into the arm when it lifts.", draw: "Fibres fan toward the armpit. In women the breast sits on its lower half, roughly ribs 2–6, and moves with the arm." },
  { id: "serratus-and-ribs", region: "torso", kind: "muscle", where: "Saw-tooth slips on ribs 5–8 under the armpit.", shows: "Lean or raised-arm poses.", draw: "Small interlocking forms along the side of the rib cage; the rib cage is an egg tilted back." },
  { id: "rectus-abdominis", region: "torso", kind: "muscle", where: "From the lower ribs to the pubis, either side of the linea alba; tendinous bands above the navel.", shows: "Lean bodies; the navel sits at about 60% of height in adults.", draw: "Rounded abdomen in profile; the upper segments are narrower; don't draw a grid on average bodies." },
  { id: "external-oblique", region: "pelvis", kind: "muscle", where: "From the lower ribs down to the iliac crest.", shows: "The flank bulge above the hip bone.", draw: "A soft mass overhanging the iliac crest; compresses on the side the body bends toward." },
  { id: "iliac-crest-and-asis", region: "pelvis", kind: "bone", where: "Top rim of the pelvis; the front point (ASIS) and the line of the groin down to the pubis.", shows: "Lean bodies; the 'V' at the lower abdomen.", draw: "Hip bones tilt with contrapposto: the crest rises on the standing leg." },
  { id: "latissimus-dorsi", region: "torso", kind: "muscle", where: "From the lower back and pelvis into the upper arm, forming the back armpit fold.", shows: "V-taper of the back.", draw: "The back fold of the armpit is lower than the front fold." },
  { id: "scapula", region: "torso", kind: "bone", where: "Shoulder blade on the upper back, spine of the scapula running to the acromion.", shows: "Glides and rotates with the arm.", draw: "Moves outward and upward when the arm rises above the shoulder; wings slightly in a reach." },
  { id: "biceps-and-brachialis", region: "arm", kind: "muscle", where: "Front of the upper arm to the forearm below the elbow crease.", shows: "Flexed elbow; peaks when the forearm supinates.", draw: "The arm is not a tube: biceps in front, triceps behind, the deltoid wedge between." },
  { id: "triceps", region: "arm", kind: "muscle", where: "Back of the upper arm to the olecranon (elbow point).", shows: "Extended arm; a flat tendon plane above the elbow.", draw: "The back contour of the arm swells high and flattens near the elbow." },
  { id: "forearm-masses", region: "arm", kind: "muscle", where: "Flexor mass from the inner elbow, extensor/brachioradialis mass from the outer elbow; tendons at the wrist.", shows: "They cross as the forearm pronates.", draw: "Wide near the elbow, flat and tendon-thin at the wrist; the outer contour is higher than the inner." },
  { id: "knuckle-arc", region: "hand", kind: "bone", where: "Heads of metacarpals 2–5.", shows: "Clenched or flexed fingers.", draw: "The knuckles form an arc with the middle highest; finger lengths fall off from the middle; the thumb's base is a separate mass (thenar)." },
  { id: "gluteals", region: "pelvis", kind: "muscle", where: "Gluteus maximus from sacrum and pelvis into the femur; medius fills the side of the hip below the crest.", shows: "Buttock shape; the trochanteric dimple at the side when contracted.", draw: "The fold under the buttock disappears on the leg that steps back." },
  { id: "quadriceps-and-sartorius", region: "leg", kind: "muscle", where: "Front of the thigh to the patella; sartorius runs diagonally from the ASIS to the inside of the knee.", shows: "The vastus medialis teardrop above the inner knee.", draw: "The thigh slopes inward to the knee; the inner knee is lower and fuller than the outer." },
  { id: "knee", region: "leg", kind: "bone", where: "Patella, patellar tendon to the tibial tuberosity, fat pads either side.", shows: "Always.", draw: "A box-like form, not a hinge line; the kneecap rides up when the leg is straight and the quadriceps contract." },
  { id: "calf-and-shin", region: "leg", kind: "muscle", where: "Gastrocnemius (two heads, the inner lower), soleus, the Achilles tendon; the tibia's flat front-inner face is subcutaneous.", shows: "Always.", draw: "The outer calf contour peaks higher than the inner; the shin is a straight bony edge." },
  { id: "malleoli", region: "foot", kind: "bone", where: "Ankle bones: the tibia's inner malleolus and the fibula's outer malleolus.", shows: "Always.", draw: "The inner ankle bone is higher and further forward than the outer one." },
  { id: "foot-arch", region: "foot", kind: "bone", where: "Medial longitudinal arch from heel to the ball of the big toe.", shows: "Inner foot lifted, outer edge touching the ground.", draw: "From the front the foot is a wedge: high on the inside, low on the outside." },
];

export interface AgeChange { age: string; changes: string; grade: "M" | "S" | "B" }
/** How bodies and faces change with age (drawing guide). */
export const AGE_CHANGES: readonly AgeChange[] = [
  { age: "0–2", grade: "S", changes: "Head about a quarter of length at birth, ~4.6 heads at one year, ~5 at two; legs short (crotch near 0.37–0.39 of height); round face, small chin and nose; large eyes relative to the face, set below mid-head." },
  { age: "2–10", grade: "M", changes: "Legs lengthen fastest; heads tall rises toward 7. CDC median stature: 2 y ≈ 86 cm, 6 y ≈ 115 cm, 10 y ≈ 138 cm (both sexes within ~1 cm)." },
  { age: "10–18", grade: "M", changes: "Growth spurt (girls earlier); sex differences appear: broader shoulders and larger jaw/brow in boys, wider hips and breast development in girls. CDC median at 14 y: girls ≈ 160 cm, boys ≈ 164 cm; at 18 y ≈ 163 / 176 cm." },
  { age: "20–40", grade: "B", changes: "Peak stature; facial soft tissue full; joint ranges near adult means (CDC ROM 20–44 band)." },
  { age: "40–70", grade: "B", changes: "Gradual stature loss (about 1 cm per decade, accelerating later); fat shifts to the trunk; jowls and nasolabial folds deepen; ears and nose lengthen; ranges of motion fall (CDC ROM 45–69 band)." },
  { age: "70+", grade: "B", changes: "Thoracic curve increases (head forward), muscle mass and skin elasticity fall, eyes look deeper set as orbital fat changes, ear lobes lengthen." },
];

/** Step-by-step for agents drawing a realistic person in any style with ANAT1. */
export const DRAWING_RECIPE: readonly string[] = [
  "Pick the person: sex, age and build (HumanParams). For a specific height use `stature`; for teenagers the CDC median is applied automatically; check adults against ANSUR II with `predictFromStature`.",
  "Pose with clinical angles (`poseHumanBody`); keep `clamp` on so joints stay in measured ranges, and read `outOfRange` when a pose fights the body.",
  "Choose the camera like a photographer: orthographic for model sheets; for photo-like work use `distance` ≥ 3× the subject's height (a long lens) and a camera height near the subject's chest; wide, close cameras distort.",
  "Render a HumanFrame and lay the drawing down in layers: silhouette → visible contours (weight hints) → terminator (form shadow edge) → five tone bands → details.",
  "Faces: use `createFace` with population norms, place features with FACE_LANDMARKS and the feature loops, irises 11.7 mm wide and overlapped by the upper lid.",
  "Check: head count against MODEL_TABLES.byAge, landmarks (crotch, navel, nipples, knees) against ANSUR ratios, and CANON_CHECKS so no idealised canon slips in.",
  "Translate to the medium last (pencil, ink, collage, riso, paint): the frame decides where the forms are; the painter decides only how they look.",
];
