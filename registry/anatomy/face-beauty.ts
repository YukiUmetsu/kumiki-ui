/**
 * ANAT1 beauty: what the research on facial attractiveness supports, applied to the measured face.
 *
 * The robust findings:
 * - **Averageness:** faces blended from many faces are more attractive than the faces they came from.
 * - **Symmetry:** increasing symmetry alone raises attractiveness.
 * - **Sexual dimorphism:** femininity raises the attractiveness of female faces across cultures; for male faces the
 *   evidence is mixed, and slightly feminised versions were preferred in Perrett et al. 1998.
 * - **Skin:** even, healthy skin colour.
 *
 * Pallett, Link & Lee (2010) measured the best eye spacing and eye-to-mouth distance; both turned out to be the average
 * face's. The golden ratio (Marquardt's mask) is not supported: it describes masculinised fashion-model faces (Holland
 * 2008), and a 2024 systematic review found no association between golden-ratio fit and attractiveness. It is kept here
 * only as a report.
 *
 * `beautifulFace` therefore starts from a face calibrated to measured population means (Farkas norms, ANSUR II
 * breadths), makes it symmetric, opens the eyes and fills the lips to measured attractive values, adds femininity, and
 * places the hairline at Pallett's ratio. Every step is scaled by `beauty` (0 the calibrated average, 1 the full set).
 *
 * Then it takes the shape of a face type (`FACE_TYPE_GROUPS`): beautiful film and music stars of one ancestry (East
 * Asian, South Asian, Black, Latin American, …), by sex, never blended across groups.
 */
import type { Vec3 } from "./anatomy-body";
import { createFace, eyeCentres, FACE_LANDMARKS } from "./anatomy-face";
import { applyEyeShape, findEyeShape } from "./eye-detail";
import faceTypes from "./data/face-types.json";
import type { EyeShapeSpec } from "./eye-detail";
import type { FaceLandmark, FaceParams, FaceStudy } from "./anatomy-face";
import ansur from "./data/ansur-ii-ranges.json";

export interface BeautyEvidence { id: string; finding: string; grade: "reported" | "estimated" | "measured"; source: string; url?: string }

/** A face type's look by default (each can be changed): skin, iris, hair colour, style and curl, eye shape. */
export interface FaceTypeLook { skin: string; eyes: string; hair: { eumelanin: number; pheomelanin?: number }; hairStyle: string; hairCurl?: number; hairLength?: number; fringe?: string; parting?: string; eyeShape?: string }
/** A group of face types: the stars of one ancestry. `norm` is the population norm the face is built on. */
/**
 * A group's bone structure in depth (mm, + forward), against the face this module builds (a European-derived norm):
 * the brow ridge, the nasal root (radix) and bridge (dorsum), the nose's tip, the cheekbones, the lips and the chin.
 */
export interface FaceBone { brow: number; radix: number; dorsum: number; tip: number; cheek: number; upperLip: number; lowerLip: number; chin: number }
export interface FaceTypeGroup { id: string; label: string; includes: string; norm: string; female: FaceTypeLook; male: FaceTypeLook; bone?: FaceBone }
/**
 * A face type: per-vertex offsets (mm) fitted so that the rendered face, read by MediaPipe's face landmarker exactly as
 * the photographs were, matches the stars of one group and sex (frontalised, one photograph a person). `mouthCorner`
 * is how far the corners sat below the lips' midline on their closed, unsmiling mouths (mm).
 */
export interface FaceType { group: string; sex: "female" | "male"; n: number; residual: number; mouthCorner: number;
  /** Per-vertex offsets, x and y (mm), on the canonical 468-vertex face. */
  offsets: number[][];
  /** The photographs measured, with their credits (author, licence, page). */
  sources: { title: string; page: string; licence: string; licenceUrl?: string; author?: string; year?: number | null; yaw: number }[];
  /**
   * Face-shape variants within the type: its stars split in two by face shape (each of several people), each the
   * type plus its cluster's difference (x and y offsets, mm), named by the measures it changes most.
   */
  variants?: { label: string; n: number; offsets: number[][] }[] }
const FT = faceTypes as unknown as { method: string; model: string; groups: FaceTypeGroup[]; types: Record<string, FaceType> };
/** Every face type, keyed "group:female" or "group:male". */
export const FACE_TYPES: Readonly<Record<string, FaceType>> = FT.types;
/** The groups that have face types, in order. */
export const FACE_TYPE_GROUPS: readonly FaceTypeGroup[] = FT.groups.filter(g => FT.types[`${g.id}:female`] || FT.types[`${g.id}:male`]);
/** How the face types were measured and fitted. */
export const FACE_TYPES_METHOD: string = FT.method;
export const findFaceTypeGroup = (id: string | undefined): FaceTypeGroup | undefined => FT.groups.find(g => g.id === id);
/** The face type that matches a population norm: the default when none is asked for. */
const NORM_GROUP: Record<string, string> = { "north-american-white": "northern-european", "african-american": "black", saudi: "middle-eastern" };
/** The face type a set of options resolves to (asked for, or the one matching the norm). */
export const faceTypeOf = (o: { faceType?: string; norm?: string }): string => o.faceType ?? NORM_GROUP[o.norm ?? "north-american-white"] ?? "northern-european";
/** A face type's default look for a sex (0 woman … 1 man). */
export function faceTypeLook(group: string, sex: number): FaceTypeLook | undefined {
  const g = findFaceTypeGroup(group);
  return g ? (sex < 0.5 ? g.female : g.male) : undefined;
}

/** The findings this module applies, each with its source. */
export const BEAUTY_EVIDENCE: readonly BeautyEvidence[] = [
  { id: "averageness", grade: "reported", finding: "Blends of many faces are more attractive than their constituent faces; the more faces in a composite, the more attractive it is.",
    source: "Little, Jones & DeBruine 2011, Phil. Trans. R. Soc. B 366:1638 (review; Galton; Langlois & Roggman 1990)", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC3130383/" },
  { id: "real-faces", grade: "measured", finding: "Face types: modern photographs (1995 on) of film, television and music stars widely seen as beautiful or handsome, by ancestry group and sex, under free licences (public domain, CC0, CC BY, CC BY-SA; measured only, each credited), one photograph a person, frontal, the eyes open, the mouth from closed mouths, measured with MediaPipe's face landmarker. Each type is fitted in the landmark model's own measurement space (rendered, read the same way, corrected); groups are never blended.",
    source: "ANAT1 face types (data/face-types.json; docs/research/face-types-2026-11-16.md)" },
  { id: "bone", grade: "measured", finding: "Bone structure differs by group: the brow ridge, nasal root and cheekbone depth are measured on each group's stars (the landmark model's depth estimates, against the Northern European stars; East Asian brow ridges about 2.7 mm and nasal roots 1.5 mm further back, Asian cheekbones about 1 mm further forward, as the anthropological literature describes). Lips and nose follow soft-tissue norms: lips against the nose-to-chin E-line −4 / −2 mm in Caucasian samples, −0.04 / +1.66 mm in Malaysian Chinese and −1.3 / +0.19 mm in Malay women; lower, less projecting noses in East Asian, Southeast Asian and African-descended faces (estimated amounts).",
    source: "ANAT1 face types (docs/research/face-types-2026-11-16.md); E-line values: IIUM J. Orofac. Health Sci. (Malay and Malaysian Chinese adults)", url: "https://journals.iium.edu.my/ktn/index.php/ijohs/article/download/164/103/2863" },
  { id: "mouth-corners", grade: "measured", finding: "On the same photographs the mouth's corners sit a little below the midline where the lips meet (about 0.7–0.9 mm, by type); a relaxed mouth with lower corners reads as downturned.",
    source: "ANAT1 face types (docs/research/face-types-2026-11-16.md)" },
  { id: "vector", grade: "reported", finding: "In young adults the soft tissue over the supraorbital rim projects about 10 mm beyond the cornea, the infraorbital rim lies about 3 mm behind it and the cheek prominence about 2 mm beyond it (a positive vector); a cheek behind the cornea (a negative vector) goes with a tired, aged look.",
    source: "Jelks & Jelks vector analysis, as summarised in Yaremchuk's infraorbital rim chapter (Plastic Surgery Key)", url: "https://plasticsurgerykey.com/infraorbital-rim/" },
  { id: "symmetry", grade: "reported", finding: "Increasing symmetry alone is sufficient to increase attractiveness.", source: "Little, Jones & DeBruine 2011 (review)", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC3130383/" },
  { id: "femininity", grade: "reported", finding: "Feminine features increase the attractiveness of female faces across cultures; the public prefers above-average femininity in women.",
    source: "Little, Jones & DeBruine 2011; Holland 2008, Aesthetic Plast. Surg. 32:200", url: "https://pubmed.ncbi.nlm.nih.gov/18175168/" },
  { id: "male", grade: "reported", finding: "For male faces preferences are mixed: feminised male faces were preferred in two cultures (Perrett et al. 1998), while other studies found preferences for larger jaws.",
    source: "Little, Jones & DeBruine 2011 (review)", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC3130383/" },
  { id: "dimorphism", grade: "reported", finding: "Larger jawbones, more prominent cheekbones and thinner cheeks are features of male faces; masculinising enlarges the jaw and thins the lips.",
    source: "Little, Jones & DeBruine 2011 (review)", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC3130383/" },
  { id: "pallett", grade: "reported", finding: "Attractiveness peaks when the eye-to-mouth distance is about 36% of face length (hairline to chin) and the distance between the pupils is about 46% of face width (inner edges of the ears); these match the average face (40 Caucasian female faces).",
    source: "Pallett, Link & Lee 2010, Vision Research 50:149", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC2814183" },
  { id: "lips", grade: "reported", finding: "The most attractive upper-to-lower lip ratio was 1:2, with lip area 53.5% above the average (morphs of 20 white women, 18–25). Attractive young Caucasian women measured 6.47 ± 1.36 mm upper and 11.64 ± 1.46 mm lower vermilion.",
    source: "Popenko et al. 2017, JAMA Facial Plast. Surg. 19:261; The Concept of Ideal Lips of Caucasian Female (2024)", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC5543334" },
  { id: "eyes", grade: "reported", finding: "The upper lid margin sits MRD1 above the corneal light reflex (the pupil centre) and the lower margin MRD2 below it: MRD1 about 4.0 mm in adults in their twenties (3.7 ± 0.1 mm over 20–59 years, anterior-segment OCT), MRD2 about 5.2–5.5 mm. So the upper lid covers the top of the iris (11.7 mm across) by about 1.5–2 mm and the lower lid just meets it; white above the iris reads as a startled stare. Adult palpebral fissure height is about 8–11.5 mm by population.",
    source: "Ogasawara et al. 2020, Clin. Ophthalmol. 14:745 (MRD1); Rana et al. 2023 (MRD1 3.5, MRD2 5.2 mm, 380 adults); Putterman via EyeWiki (MRD2 5.5 mm); palpebral fissure studies", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC10371930" },
  { id: "canthal", grade: "reported", finding: "Female faces edited to exaggerate the medial canthal tilt were preferred 93% of the time.",
    source: "Bashour & Geist 2007, Ophthal. Plast. Reconstr. Surg.", url: "https://hsrc.himmelfarb.gwu.edu/smhs_ophthalm_facpubs/302" },
  { id: "skin", grade: "reported", finding: "Homogeneous skin colour is positively related to attractiveness; skin redness and yellowness (carotenoids) read as healthy.",
    source: "Little, Jones & DeBruine 2011 (Fink et al. 2006; Stephen et al.)", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC3130383/" },
  { id: "breadths", grade: "reported", finding: "Face breadth across the cheekbones 133.8 ± 5.6 mm (women) and 142.6 ± 6.2 mm (men); pupils 61.7 ± 3.6 and 64.0 ± 3.4 mm apart (ANSUR II, U.S. Army, 2012).",
    source: "ANSUR II public release (summary in data/ansur-ii-ranges.json)", url: "https://www.openlab.psu.edu/ansur2/" },
];

// ---- The golden ratio --------------------------------------------------------------------------------------------------------------

export const PHI = (1 + Math.sqrt(5)) / 2;
/**
 * The golden ratio claims and what tests of them found. Marquardt's mask is built from golden decagons; he states that
 * in a beautiful face the nose is to the mouth as 1 to 1.618, and that the mask fits beautiful faces of every race and
 * period. Tests disagree.
 */
export const GOLDEN_RATIO = {
  claim: { by: "Stephen Marquardt (Golden Decagon / Phi mask)", text: "\"The width of the nose to the width of the mouth is a ratio of 1:1.618 in a beautiful face\"; the mask is said to fit attractive faces across races and history.",
    source: "Interview, Journal of Clinical Orthodontics 36(6):339, 2002", url: "https://www.jco-online.com/media/17658/jco_2002-06-339.pdf" },
  findings: [
    { text: "Marquardt's mask best describes masculinised white women as seen in fashion models; it is inconsistent with the preference for above-average femininity.", source: "Holland 2008, Aesthetic Plast. Surg. 32:200–208", url: "https://pubmed.ncbi.nlm.nih.gov/18175168/" },
    { text: "Systematic review: the golden proportion was not consistently present in natural faces, and golden-ratio conformance was not associated with facial evaluation scores in any ethnic group.", source: "Londono, Dashti et al. 2024, J. Prosthet. Dent. 131(5):804–810", url: "https://www.thejpd.org/article/S0022-3913(22)00285-2/abstract" },
    { text: "The best eye spacing and eye-to-mouth distance are those of the average face (46% and 36%), not φ.", source: "Pallett, Link & Lee 2010, Vision Research 50:149", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC2814183" },
  ],
  verdict: "Not used to build faces. `goldenRatioReport` measures a face's φ ratios beside Pallett's average-face ratios, for anyone who asks.",
} as const;

export interface RatioRow { id: string; label: string; value: number; target: number; targetLabel: string; source: string }
/**
 * The ratios people check for "the golden ratio face", measured on a face (mm, +y up), with the target each claim
 * makes. Face length runs from the hairline (`hairlineY`) to the chin; face width is the breadth at the cheekbones.
 */
export function goldenRatioReport(v: readonly Vec3[], hairlineY: number): RatioRow[] {
  const L = (k: FaceLandmark) => v[FACE_LANDMARKS[k]], ec = eyeCentres(v), pupilY = (ec.L[1] + ec.R[1]) / 2, ipd = Math.abs(ec.L[0] - ec.R[0]);
  const faceLen = hairlineY - L("menton")[1], faceW = Math.abs(L("zygion.L")[0] - L("zygion.R")[0]);
  const mouthW = Math.abs(L("cheilion.L")[0] - L("cheilion.R")[0]), noseW = Math.abs(L("alare.L")[0] - L("alare.R")[0]);
  const nose = L("subnasale")[1], chin = L("menton")[1], stom = L("stomion")[1];
  return [
    { id: "mouth-nose", label: "Mouth width ÷ nose width", value: mouthW / noseW, target: PHI, targetLabel: "φ (Marquardt)", source: "Marquardt 2002" },
    { id: "length-width", label: "Face length ÷ face width", value: faceLen / faceW, target: PHI, targetLabel: "φ (popular claim)", source: "widely repeated; no primary source found" },
    { id: "chin-mouth", label: "Nose base to chin ÷ mouth to chin", value: (nose - chin) / (stom - chin), target: PHI, targetLabel: "φ (popular claim)", source: "widely repeated; no primary source found" },
    { id: "eye-mouth", label: "Eye-to-mouth distance ÷ face length", value: (pupilY - stom) / faceLen, target: 0.36, targetLabel: "0.36 (Pallett 2010, the average face)", source: "Pallett, Link & Lee 2010" },
    { id: "pupils", label: "Pupil distance ÷ face width", value: ipd / faceW, target: 0.46, targetLabel: "0.46 (Pallett 2010, the average face)", source: "Pallett, Link & Lee 2010" },
  ];
}

// ---- Building a beautiful face ------------------------------------------------------------------------------------------------------

type AnsurSex = { measurements: Record<string, { mean: number; sd: number }> };
const A = ansur as unknown as { female: AnsurSex; male: AnsurSex };
const ansurMean = (k: string, sex: number) => A.female.measurements[k].mean + (A.male.measurements[k].mean - A.female.measurements[k].mean) * sex;

export interface BeautyOptions extends FaceParams {
  /** 0 the calibrated average face … 1 every finding applied fully (default 1). */
  beauty?: number;
  /**
   * Extra femininity (+) or masculinity (−) as a share of the female–male difference. Default: +0.25 for women
   * (above-average femininity is preferred), +0.15 for men (slight feminisation, Perrett 1998); both estimated amounts.
   */
  femininity?: number;
  /** An eye shape (`EYE_SHAPES` id or a spec): almond, round, hooded, monolid, upturned, … Without one the eyes keep the measured average opening. */
  eyeShape?: string | EyeShapeSpec;
  /**
   * A face type (`FACE_TYPE_GROUPS` id): the shape of beautiful stars of one ancestry, e.g. "east-asian",
   * "southeast-asian", "south-asian", "middle-eastern", "black", "latin-american", "northern-european",
   * "southern-european", "eastern-european". Asking for one also brings its look (skin, eyes, hair) unless those are
   * given. Default: the type matching the population norm (`norm`), without its look.
   */
  faceType?: string;
  /** How much of the face type's shape to apply (0 none … 1 all, the default; up to 1.5 exaggerates it). */
  realFaces?: number;
  /** A face-shape variant within the type (1 or 2, `FACE_TYPES[…].variants`); none or 0: the type as a whole. */
  faceVariant?: number;
  /**
   * How much to bring the face's depth to measured projections relative to the cornea (0 … 1, default 1): the brow
   * ridge about 10 mm ahead, the rim below the eye about 3 mm behind and the cheek prominence about 2 mm ahead (a
   * "positive vector"). The calibrated mask's eyes sit almost flush with its brows and cheeks.
   */
  form?: number;
}
export interface BeautifulFace extends FaceStudy {
  /** The hairline height (mm) that puts the eye-to-mouth distance at 36% of face length (Pallett 2010). */
  hairlineY: number;
  report: RatioRow[];
  /** The eye shape applied, if one was asked for. */
  eyeShape?: EyeShapeSpec;
  /** What was applied, for captions. */
  applied: { symmetry: number; faceWidth: number; jawWidth: number; palpebral: number; upperLip: number; lowerLip: number; canthalTilt: number; femininity: number };
}

let MIRROR: Int32Array | undefined;
/** Each vertex's mirror partner across the midline (nearest reflected neighbour on the canonical face). */
export function mirrorMap(v: readonly Vec3[]): Int32Array {
  if (MIRROR && MIRROR.length === v.length) return MIRROR;
  const m = new Int32Array(v.length);
  for (let i = 0; i < v.length; i++) {
    let best = i, bd = Infinity;
    for (let j = 0; j < v.length; j++) { const d = (v[j][0] + v[i][0]) ** 2 + (v[j][1] - v[i][1]) ** 2 + (v[j][2] - v[i][2]) ** 2; if (d < bd) { bd = d; best = j; } }
    m[i] = best;
  }
  return (MIRROR = m);
}

const smooth = (t: number) => { const x = Math.min(1, Math.max(0, t)); return x * x * (3 - 2 * x); };

const LID_LOOPS = { upper: { R: [246, 161, 160, 159, 158, 157, 173], L: [466, 388, 387, 386, 385, 384, 398] }, lower: { R: [7, 163, 144, 145, 153, 154, 155], L: [249, 390, 373, 374, 380, 381, 382] } };
/**
 * Move each eye's lids (and the skin above and below them, fading out) so the upper margin sits `mrd1` mm above the
 * pupil and the lower margin `mrd2` mm below it, by `k` (0 … 1). The pupil is where the portrait puts the eyeball
 * (`eyeCentres`: a quarter each of the corners' and the lid margins' heights), so the targets solve for it: with the
 * corners' mid-height c, the pupil lands at c + (mrd1 − mrd2) / 2.
 */
function placeLids(v: Vec3[], mrd1: number, mrd2: number, k: number) {
  if (k <= 0) return;
  const L = (n: FaceLandmark) => v[FACE_LANDMARKS[n]];
  const ecs = eyeCentres(v);
  for (const s of ["L", "R"] as const) {
    const ex = L(`exocanthion.${s}` as FaceLandmark), en = L(`endocanthion.${s}` as FaceLandmark), ps = L(`palpebrale-superius.${s}` as FaceLandmark), pi = L(`palpebrale-inferius.${s}` as FaceLandmark);
    const c = ecs[s], halfW = Math.abs(ex[0] - en[0]) / 2, pupil = (ex[1] + en[1]) / 2 + (mrd1 - mrd2) / 2;
    const addU = (pupil + mrd1 - ps[1]) * k, addD = (pupil - mrd2 - pi[1]) * k;
    const upSet = new Set(LID_LOOPS.upper[s]), loSet = new Set(LID_LOOPS.lower[s]);
    v.forEach((p, i) => {
      const dx = (p[0] - c[0]) / (halfW * 1.15), along = Math.max(0, 1 - dx * dx);
      if (along <= 0) return;
      const above = p[1] - c[1];
      if (upSet.has(i) || (above > 0 && above < 14)) p[1] += addU * along * (upSet.has(i) ? 1 : smooth(1 - (above - 2) / 12));
      else if (loSet.has(i) || (above <= 0 && above > -9)) p[1] += addD * along * (loSet.has(i) ? 1 : smooth(1 + (above + 2) / 7));
    });
  }
}

/** A face built from the attractiveness findings (see the module note). */
export function beautifulFace(o: BeautyOptions = {}): BeautifulFace {
  const b = Math.min(1, Math.max(0, o.beauty ?? 1)), sex = Math.min(1, Math.max(0, o.sex ?? 0.5));
  const typeId = faceTypeOf(o), group = findFaceTypeGroup(typeId);
  const base = createFace({ ...o, norm: (o.norm ?? group?.norm ?? "north-american-white") as FaceParams["norm"], sex });
  const v: Vec3[] = base.vertices.map(p => [p[0], p[1], p[2]]);
  const L = (k: FaceLandmark) => v[FACE_LANDMARKS[k]];
  // 1. Symmetry: average each vertex with its mirrored partner.
  const mir = mirrorMap(base.vertices);
  const snap = v.map(p => [p[0], p[1], p[2]] as Vec3);
  v.forEach((p, i) => { const q = snap[mir[i]]; p[0] += ((-q[0] + snap[i][0]) / 2 - snap[i][0]) * b; p[1] += ((q[1] + snap[i][1]) / 2 - snap[i][1]) * b; p[2] += ((q[2] + snap[i][2]) / 2 - snap[i][2]) * b; });
  // 2. Face breadth at the cheekbones to the measured mean (ANSUR II), compressing only outside the eyes, so the eye
  //    spacing keeps its own norm. With the mean pupil distance this lands Pallett's 46% by itself.
  const fem = (o.femininity ?? (sex < 0.5 ? 0.25 : 0.15)) * b;
  const zyHalf = Math.abs(L("zygion.L")[0]), eyeOut = Math.max(Math.abs(L("exocanthion.L")[0]), Math.abs(L("exocanthion.R")[0])) + 1;
  const zyTarget = (ansurMean("bizygomaticbreadth", sex) / 2) * (1 - 0.012 * fem);
  const k1 = 1 + ((zyTarget - eyeOut) / Math.max(1, zyHalf - eyeOut) - 1) * b;
  for (const p of v) { const ax = Math.abs(p[0]); if (ax > eyeOut) p[0] = Math.sign(p[0]) * (eyeOut + (ax - eyeOut) * k1); }
  // 3. The jaw: bigonial breadth about 0.74 (women) to 0.78 (men) of the cheekbone breadth (estimated from the usual
  //    index); femininity narrows it further (larger jaws are a male feature).
  const yStom = L("stomion")[1];
  const goHalf = Math.abs(L("gonion.L")[0]), goTarget = zyTarget * (0.74 + 0.04 * sex) * (1 - 0.05 * fem);
  const kj = 1 + (goTarget / Math.max(1, goHalf) - 1) * b;
  for (const p of v) {
    const w = smooth((yStom + 6 - p[1]) / 22) * smooth((Math.abs(p[0]) - 8) / 30);
    if (w > 0) p[0] *= 1 + (kj - 1) * w;
  }
  // 4. Eyes: the lids where real lids sit on the eye, measured from the pupil centre: the upper margin MRD1 above it
  //    (about 4.0 mm in adults in their twenties, Ogasawara 2020), the lower margin MRD2 below it (5.2–5.5 mm, Rana 2023;
  //    Putterman). So the upper lid covers the top of the iris by about 1.5 mm and the lower lid just meets it: no white
  //    above the iris (a startled stare) and none below. Women a little more open (estimated). Then the medial corner
  //    tilts down a little (Bashour & Geist 2007).
  const mrd1 = 3.9 + 0.4 * (1 - sex) + 0.4 * fem, mrd2 = 5.3 + 0.1 * sex;
  placeLids(v, mrd1, mrd2, b);
  for (const s of ["L", "R"] as const) {
    const en = L(`endocanthion.${s}` as FaceLandmark);
    v.forEach(p => { const d = Math.hypot(p[0] - en[0], p[1] - en[1]); if (d < 6) p[1] -= 0.7 * b * (1 - d / 6); });
  }
  // 4b. An eye shape, if one is asked for: applied after the face type (step 6c''), so its opening, tilt and spacing hold
  const shapeAsked = o.eyeShape ?? (o.faceType ? faceTypeLook(typeId, sex)?.eyeShape : undefined);
  const eyeShape = shapeAsked === undefined ? undefined : typeof shapeAsked === "string" ? findEyeShape(shapeAsked) : shapeAsked;
  // 5. Lips: vermilion heights toward the measured attractive values (6.5 / 11.6 mm in young women; masculinising
  //    thins the lips, so men take about 0.85 of that, estimated).
  {
    const ls = L("labiale-superius"), li = L("labiale-inferius"), sto = L("stomion");
    const upT = (6.5 - 1.0 * sex + 0.4 * fem), loT = (11.6 - 1.8 * sex + 0.5 * fem);
    const dUp = (upT - (ls[1] - sto[1])) * b, dLo = (loT - (sto[1] - li[1])) * b, halfMouth = Math.abs(L("cheilion.L")[0]);
    v.forEach(p => {
      const along = Math.max(0, 1 - (p[0] / (halfMouth * 1.05)) ** 2);
      if (along <= 0) return;
      const yu = p[1] - sto[1];
      // The vermilion borders move; the line where the lips meet stays put (the mouth stays closed).
      if (yu > 0.5 && yu < 14) p[1] += dUp * along * smooth(1 - (yu - (ls[1] - sto[1])) / 8) * smooth((yu - 1.6) / 3);
      if (yu < -0.5 && yu > -20) p[1] -= dLo * along * smooth(1 - (-yu - (sto[1] - li[1])) / 9) * smooth((-yu - 1.6) / 3);
      // fuller lips also come forward a little
      if (Math.abs(yu) < 13) p[2] += 0.6 * b * along * smooth(1 - Math.abs(yu) / 13);
    });
  }
  // 5b. A relaxed closed mouth: the canonical mask's lips are slightly parted; bring the lower lip up to meet the upper.
  {
    const pairs: [number, number][] = [[191, 95], [80, 88], [81, 178], [82, 87], [13, 14], [312, 317], [311, 402], [310, 318], [415, 324]];
    const gaps = pairs.map(([u, l]) => [v[u][0], v[u][1] - v[l][1] - 0.25] as const).sort((p, q) => p[0] - q[0]);
    const gapAt = (x: number) => { if (x <= gaps[0][0]) return gaps[0][1]; for (let k = 1; k < gaps.length; k++) if (x <= gaps[k][0]) { const t = (x - gaps[k - 1][0]) / (gaps[k][0] - gaps[k - 1][0]); return gaps[k - 1][1] + (gaps[k][1] - gaps[k - 1][1]) * t; } return gaps[gaps.length - 1][1]; };
    const halfMouth = Math.abs(L("cheilion.L")[0]), lowerInner = new Set(pairs.map(p => p[1]));
    // the inner upper-lip line as it was before anything moved: only what lies below it (the lower lip, the chin) moves
    const upperLine = pairs.map(([u]) => [v[u][0], v[u][1]] as const).sort((p, q) => p[0] - q[0]);
    const lineAt = (x: number) => { if (x <= upperLine[0][0]) return upperLine[0][1]; for (let k = 1; k < upperLine.length; k++) if (x <= upperLine[k][0]) { const t = (x - upperLine[k - 1][0]) / (upperLine[k][0] - upperLine[k - 1][0]); return upperLine[k - 1][1] + (upperLine[k][1] - upperLine[k - 1][1]) * t; } return upperLine[upperLine.length - 1][1]; };
    v.forEach((p, i) => {
      const below = lineAt(p[0]) - p[1];
      if ((below < 0.3 && !lowerInner.has(i)) || Math.abs(p[0]) > halfMouth * 1.15) return;
      const g = Math.max(0, gapAt(p[0])) * b, along = smooth(1 - (Math.abs(p[0]) - halfMouth * 0.85) / (halfMouth * 0.3));
      p[1] += g * along * (lowerInner.has(i) ? 1 : smooth(1 - (below - 2) / 14));
    });
  }
  // 6. Femininity: a softer brow ridge and a smaller chin (estimated amounts, sign from the dimorphism findings).
  if (fem !== 0) {
    const gl = L("glabella"), pg = L("pogonion");
    v.forEach(p => {
      const dBrow = Math.hypot(p[0] * 0.5, p[1] - gl[1]); if (dBrow < 18 && p[2] > gl[2] - 12) p[2] -= 1.4 * fem * smooth(1 - dBrow / 18);
      const dChin = Math.hypot(p[0], p[1] - pg[1]); if (dChin < 20) { p[0] *= 1 - 0.06 * fem * smooth(1 - dChin / 20); p[1] += 1.2 * fem * smooth(1 - dChin / 20); }
    });
  }
  // 6b. Form: the brow ridge, the rim below the eye and the cheek prominence brought to their projections relative to
  //     the cornea in young adults (soft tissue: the supraorbital rim about 10 mm ahead, the infraorbital rim about
  //     3 mm behind, the cheek prominence about 2 mm ahead; Jelks & Jelks, Yaremchuk). Each is measured on this face and
  //     only raised to its target, with smooth falloffs that leave the lids and the eye opening where they are.
  const formK = b * Math.min(1, Math.max(0, o.form ?? 1));
  if (formK > 0) {
    const ecF = eyeCentres(v);
    for (const s of ["L", "R"] as const) {
      const c = ecF[s], cornea = c[2] + 2.9, lat = Math.sign(c[0]) || 1;
      const maxZ = (x0: number, x1: number, y0: number, y1: number) => {
        let m = -Infinity;
        for (const p of v) { const dx = (p[0] - c[0]) * lat, dy = p[1] - c[1]; if (dx >= x0 && dx <= x1 && dy >= y0 && dy <= y1) m = Math.max(m, p[2]); }
        return m;
      };
      const brow = maxZ(-4, 6, 15, 26) - cornea, cheek = maxZ(4, 22, -32, -16) - cornea, rim = maxZ(-4, 4, -15, -10) - cornea;
      // targets: men's brow ridges stand further forward (estimated split of the reported 10 mm)
      const dB = Math.min(6, Math.max(0, 9 + 1.5 * sex - brow)) * formK, dC = Math.min(6, Math.max(0, 2 - 0.5 * sex - cheek)) * formK, dR = Math.min(3, Math.max(0, -3 - rim)) * formK;
      for (const p of v) {
        const dx = (p[0] - c[0]) * lat, dy = p[1] - c[1];
        const gB = Math.exp(-((dx - 1) ** 2) / (2 * 11 ** 2) - ((dy - 20) ** 2) / (2 * 5.5 ** 2));
        const gC = Math.exp(-((dx - 12) ** 2) / (2 * 11 ** 2) - ((dy + 24) ** 2) / (2 * 8 ** 2));
        const gR = Math.exp(-((dx - 2) ** 2) / (2 * 9 ** 2) - ((dy + 13) ** 2) / (2 * 3.5 ** 2));
        p[2] += dB * gB + dC * gC + dR * gR;
      }
    }
  }
  // 6c. The face type: the last correction, fitted so that this face, rendered and read by the same face-landmark
  //     model as the photographs, matches beautiful stars of one group (the woman's and the man's types blended by sex,
  //     never one group with another). Up to 1.5 exaggerates it (further from the norm the face was built on, as
  //     Perrett, May & Yoshikawa 1994 found raised attractiveness).
  const rf = Math.min(1.5, Math.max(0, o.realFaces ?? 1)) * b;
  const tF = FT.types[`${typeId}:female`] ?? FT.types[`${typeId}:male`], tM = FT.types[`${typeId}:male`] ?? tF;
  if (rf > 0 && tF && tM) {
    const fo = tF.offsets, mo = tM.offsets;
    // offsets are stored x and y only (the fit moves points as seen from the front; depth comes from the bone step)
    v.forEach((p, i) => { for (let k = 0; k < 3; k++) p[k] += rf * ((fo[i][k] ?? 0) * (1 - sex) + (mo[i][k] ?? 0) * sex); });
    // a face-shape variant within the type
    const vi = Math.round(o.faceVariant ?? 0) - 1, vf = tF.variants?.[vi]?.offsets, vm = tM.variants?.[vi]?.offsets;
    if (vi >= 0 && (vf || vm)) v.forEach((p, i) => { for (let k = 0; k < 2; k++) p[k] += rf * ((vf ?? vm)![i][k] * (1 - sex) + (vm ?? vf)![i][k] * sex); });
  }
  // 6c'. The group's bone structure in depth (the front view's proportions came with the type): the brow ridge, the
  //      nasal root and bridge, the nose's tip, the cheekbones, the lips and the chin brought forward or back.
  const bone = group?.bone, bk = Math.min(1.5, rf);
  if (bone && bk > 0) {
    const ecB = eyeCentres(v), eyeY = (ecB.L[1] + ecB.R[1]) / 2, prn = L("pronasale"), ls = L("labiale-superius"), li = L("labiale-inferius"), pg = L("pogonion");
    const half = Math.abs(L("cheilion.L")[0]), radixY = eyeY + 5, gs = (d: number, s0: number) => Math.exp(-(d * d) / (2 * s0 * s0));
    for (const p of v) {
      let dz = 0;
      for (const c of [ecB.L, ecB.R]) {
        const dx = (p[0] - c[0]) * (Math.sign(c[0]) || 1), dy = p[1] - c[1];
        dz += bone.brow * gs(dx - 1, 11) * gs(dy - 20, 5.5) + bone.cheek * gs(dx - 12, 11) * gs(dy + 24, 8);
      }
      const along = Math.min(1, Math.max(0, (radixY - p[1]) / Math.max(1, radixY - prn[1])));
      dz += bone.radix * gs(p[0], 7) * gs(p[1] - radixY, 7);
      dz += bone.dorsum * gs(p[0], 6) * Math.sin(Math.PI * along) * (p[1] < radixY && p[1] > prn[1] ? 1 : 0);
      dz += bone.tip * gs(p[0], 6) * gs(p[1] - prn[1], 5);
      dz += bone.upperLip * gs(p[0], half * 0.8) * gs(p[1] - ls[1], 5) + bone.lowerLip * gs(p[0], half * 0.8) * gs(p[1] - li[1], 5);
      dz += bone.chin * gs(p[0], 12) * gs(p[1] - pg[1], 8);
      p[2] += bk * dz;
    }
  }
  // 6c''. An eye shape asked for: the opening, crease skin, fold, depth and spacing of a real eye type (eye-detail.ts),
  //       over the type's eyes (the user's choice wins)
  if (eyeShape) applyEyeShape(v, eyeShape, sex);
  // 6d. The lids back on the iris (the composite's lids are left as measured on the eye, not as photographs read them:
  //     lash lines, liner and wide-eyed poses make the lids look further apart). An eye shape keeps its own opening.
  if (!eyeShape) placeLids(v, mrd1, mrd2, b);
  // 6e. The mouth's corners at the height measured on the type's closed, unsmiling mouths (about 0.7–0.9 mm below the
  //     midline where the lips meet). Left lower, a relaxed mouth reads as downturned and sad.
  if (rf > 0) {
    const st = L("stomion"), drop = tF && tM ? tF.mouthCorner * (1 - sex) + tM.mouthCorner * sex : 0.74 + 0.12 * sex;
    for (const s of ["L", "R"] as const) {
      const ch = L(`cheilion.${s}` as FaceLandmark), dy = (st[1] - drop - ch[1]) * Math.min(1, rf), cx = ch[0], cy = ch[1];
      if (Math.abs(dy) > 0.05) v.forEach(p => { const d2 = (p[0] - cx) ** 2 + (p[1] - cy) ** 2; if (d2 < 400) p[1] += dy * Math.exp(-d2 / (2 * 4.5 ** 2)); });
    }
  }
  // 7. The hairline where the eye-to-mouth distance is 36% of the face length (Pallett 2010).
  const ec2 = eyeCentres(v), pupilY = (ec2.L[1] + ec2.R[1]) / 2, stomY = L("stomion")[1], meY = L("menton")[1];
  const hairlineY = meY + (pupilY - stomY) / 0.36;
  const pts = new Float32Array(v.length * 3);
  v.forEach((x, i) => { pts[i * 3] = x[0] / 1000; pts[i * 3 + 1] = x[1] / 1000; pts[i * 3 + 2] = x[2] / 1000; });
  const tilt = (s: "L" | "R") => Math.atan2(L(`exocanthion.${s}` as FaceLandmark)[1] - L(`endocanthion.${s}` as FaceLandmark)[1], Math.abs(L(`exocanthion.${s}` as FaceLandmark)[0] - L(`endocanthion.${s}` as FaceLandmark)[0])) * 180 / Math.PI;
  return {
    ...base, vertices: v, mesh: { ...base.mesh, points: pts }, hairlineY, report: goldenRatioReport(v, hairlineY), eyeShape,
    applied: { symmetry: b, faceWidth: 2 * Math.abs(L("zygion.L")[0]), jawWidth: 2 * Math.abs(L("gonion.L")[0]), palpebral: L("palpebrale-superius.L")[1] - L("palpebrale-inferius.L")[1],
      upperLip: L("labiale-superius")[1] - L("stomion")[1], lowerLip: L("stomion")[1] - L("labiale-inferius")[1], canthalTilt: (tilt("L") + tilt("R")) / 2, femininity: fem },
  };
}
