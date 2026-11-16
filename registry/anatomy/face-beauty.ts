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
 */
import type { Vec3 } from "./anatomy-body";
import { createFace, eyeCentres, FACE_LANDMARKS } from "./anatomy-face";
import type { FaceLandmark, FaceParams, FaceStudy } from "./anatomy-face";
import ansur from "./data/ansur-ii-ranges.json";

export interface BeautyEvidence { id: string; finding: string; grade: "reported" | "estimated"; source: string; url: string }

/** The findings this module applies, each with its source. */
export const BEAUTY_EVIDENCE: readonly BeautyEvidence[] = [
  { id: "averageness", grade: "reported", finding: "Blends of many faces are more attractive than their constituent faces; the more faces in a composite, the more attractive it is.",
    source: "Little, Jones & DeBruine 2011, Phil. Trans. R. Soc. B 366:1638 (review; Galton; Langlois & Roggman 1990)", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC3130383/" },
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
  { id: "eyes", grade: "reported", finding: "Adult palpebral fissure height is about 8–11.5 mm by population (8.5 mm women and 9 mm men in an Australian cohort; 9.7–9.9 mm Turkish; 8.0–8.2 mm Korean; about 11.5 mm South Indian).",
    source: "Palpebral fissure anthropometry studies (Australia 2023; Nepal 2022; Malaysia; reviews therein)", url: "https://link.springer.com/article/10.1007/s10792-023-02669-3" },
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
}
export interface BeautifulFace extends FaceStudy {
  /** The hairline height (mm) that puts the eye-to-mouth distance at 36% of face length (Pallett 2010). */
  hairlineY: number;
  report: RatioRow[];
  /** What was applied, for captions. */
  applied: { symmetry: number; faceWidth: number; jawWidth: number; palpebral: number; upperLip: number; lowerLip: number; canthalTilt: number; femininity: number };
}

let MIRROR: Int32Array | undefined;
/** Each vertex's mirror partner across the midline (nearest reflected neighbour on the canonical face). */
function mirrorMap(v: readonly Vec3[]): Int32Array {
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

/** A face built from the attractiveness findings (see the module note). */
export function beautifulFace(o: BeautyOptions = {}): BeautifulFace {
  const b = Math.min(1, Math.max(0, o.beauty ?? 1)), sex = Math.min(1, Math.max(0, o.sex ?? 0.5));
  const base = createFace({ ...o, sex });
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
  // 4. Eyes: open the lids to a measured palpebral height (about 9.5 mm for this face's women, 9 mm men; within the
  //    reported 8–11.5 mm), and tilt the medial corner down a little (Bashour & Geist 2007).
  const ecs = eyeCentres(v);
  const palpTarget = 9 + 0.5 * (1 - sex) + 0.5 * fem;
  const lidLoops = { upper: { R: [246, 161, 160, 159, 158, 157, 173], L: [466, 388, 387, 386, 385, 384, 398] }, lower: { R: [7, 163, 144, 145, 153, 154, 155], L: [249, 390, 373, 374, 380, 381, 382] } };
  for (const s of ["L", "R"] as const) {
    const ps = L(`palpebrale-superius.${s}` as FaceLandmark), pi = L(`palpebrale-inferius.${s}` as FaceLandmark), cur = ps[1] - pi[1], add = (palpTarget - cur) * b;
    const c = ecs[s], halfW = Math.abs(L(`exocanthion.${s}` as FaceLandmark)[0] - L(`endocanthion.${s}` as FaceLandmark)[0]) / 2;
    const upSet = new Set(lidLoops.upper[s]), loSet = new Set(lidLoops.lower[s]);
    v.forEach((p, i) => {
      const dx = (p[0] - c[0]) / (halfW * 1.15), along = Math.max(0, 1 - dx * dx);
      if (along <= 0) return;
      // Upper lid and the skin above it rise (most at the middle), the lower lid drops a little.
      const above = p[1] - c[1];
      if (upSet.has(i) || (above > 0 && above < 14)) p[1] += add * 0.72 * along * (upSet.has(i) ? 1 : smooth(1 - (above - 2) / 12));
      else if (loSet.has(i) || (above <= 0 && above > -9)) p[1] -= add * 0.28 * along * (loSet.has(i) ? 1 : smooth(1 + (above + 2) / 7));
    });
    const en = L(`endocanthion.${s}` as FaceLandmark);
    v.forEach(p => { const d = Math.hypot(p[0] - en[0], p[1] - en[1]); if (d < 6) p[1] -= 0.7 * b * (1 - d / 6); });
  }
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
  // 7. The hairline where the eye-to-mouth distance is 36% of the face length (Pallett 2010).
  const ec2 = eyeCentres(v), pupilY = (ec2.L[1] + ec2.R[1]) / 2, stomY = L("stomion")[1], meY = L("menton")[1];
  const hairlineY = meY + (pupilY - stomY) / 0.36;
  const pts = new Float32Array(v.length * 3);
  v.forEach((x, i) => { pts[i * 3] = x[0] / 1000; pts[i * 3 + 1] = x[1] / 1000; pts[i * 3 + 2] = x[2] / 1000; });
  const tilt = (s: "L" | "R") => Math.atan2(L(`exocanthion.${s}` as FaceLandmark)[1] - L(`endocanthion.${s}` as FaceLandmark)[1], Math.abs(L(`exocanthion.${s}` as FaceLandmark)[0] - L(`endocanthion.${s}` as FaceLandmark)[0])) * 180 / Math.PI;
  return {
    ...base, vertices: v, mesh: { ...base.mesh, points: pts }, hairlineY, report: goldenRatioReport(v, hairlineY),
    applied: { symmetry: b, faceWidth: 2 * Math.abs(L("zygion.L")[0]), jawWidth: 2 * Math.abs(L("gonion.L")[0]), palpebral: L("palpebrale-superius.L")[1] - L("palpebrale-inferius.L")[1],
      upperLip: L("labiale-superius")[1] - L("stomion")[1], lowerLip: L("stomion")[1] - L("labiale-inferius")[1], canthalTilt: (tilt("L") + tilt("R")) / 2, femininity: fem },
  };
}
