/**
 * UKIYO1 figures: an articulated Edo-period figure drawn the way prints draw people — a dominant robe silhouette,
 * hanging sleeves, a delicate pale face in profile, a carved key line, and costume pattern printed as its own block.
 *
 * The rig is a small 2D skeleton (hips, torso, head, two arms, two legs) solved from a pose; actions layer onto a
 * standing pose with short blends. Sleeves, hems, hat cords and long hair hang under gravity, lag behind limb motion
 * (estimated from the pose a frame earlier, so it is still a pure function of the frame) and blow in the scene wind.
 * Origin: ground point between the feet. The figure is authored facing right and mirrored for left.
 */
import type { Pt } from "./ukiyoe-core";
import { add, alongPath, carvedLine, clamp, clamp01, DEG, ease, hash01, lerp, noise1, polar, polyD, polylineLength, quad, smooth, smoothD, span } from "./ukiyoe-core";
import type { Prim, UkiyoePattern } from "./ukiyoe-prims";
import { circleD, ellipseD } from "./ukiyoe-prims";
import { drawFigureFrontBack } from "./ukiyoe-figure-front";
import { fuki, hyogoSide, kamuroSide, kasane, KOMA_GETA_HEIGHT, komaGetaSide, maeObiSide, parasol, roundels } from "./ukiyoe-oiran";
import { darariSide, maiogi, OKOBO_HEIGHT, okoboSide, wareshinobuSide } from "./ukiyoe-maiko";
import type { SquareSword, UkiyoeKamae } from "./ukiyoe-katana";
import { BLADE, katana, mon, reachArm, saya, swordAt, swordGeometry, swordSmear } from "./ukiyoe-katana";
import { CLUB, clubAt, clubGeometry, groundCrack, kanabo, usesClub } from "./ukiyoe-oni";
import { weaveBeat } from "./ukiyoe-interior";
import type { UkiyoeGhostFace } from "./ukiyoe-onna";
import { courtProp, heianHairSide, kanmuriSide } from "./ukiyoe-heian";
import { arrow, kabutoSide, naginata, oyoroiSide, shootAt, yumi } from "./ukiyoe-bushi";
import { ancientHairSide, kamiProp, magatama, riceBag, stole, zukin } from "./ukiyoe-kami";
import { drawTool, firewood, hachiSide, kozuchi, onigiri, strikeBits, toolAt, toolBody, toolContact, treasure } from "./ukiyoe-folk";
import { babyBundle, faceOutline, ghostFaceSide, gotokuCrown, humanFeatures, isGhostFace, peonyLantern } from "./ukiyoe-onna";
import type { UkiyoePaint } from "./ukiyoe-pigments";

export type UkiyoeHair = "chonmage" | "shimada" | "child" | "bald" | "long" | "elder" | "topknot" | "wild" | "hyogo" | "kamuro" | "wareshinobu" | "mizura" | "tenko" | "heian";
export type UkiyoeHat = "none" | "kasa" | "conical" | "eboshi" | "hood" | "headband" | "gotoku" | "hachi" | "zukin" | "kabuto" | "kanmuri";
export type UkiyoeProp = "none" | "staff" | "umbrella" | "lantern" | "fan" | "pole" | "basket-pole" | "bundle" | "fishing-rod" | "scroll" | "pipe" | "kanabo" | "peach" | "parasol" | "maiogi" | "peony-lantern" | "baby" | "kozuchi" | "onigiri" | "firewood" | "mirror" | "tsurugi" | "hoko" | "tai" | "yumi" | "naginata" | "shaku" | "hiogi";
export type UkiyoeBuild = "slim" | "average" | "stout" | "child" | "brute";
export const UKIYOE_HAIRS: readonly UkiyoeHair[] = ["chonmage", "shimada", "child", "bald", "long", "elder", "topknot", "wild", "hyogo", "kamuro", "wareshinobu", "mizura", "tenko", "heian"];
export const UKIYOE_HATS: readonly UkiyoeHat[] = ["none", "kasa", "conical", "eboshi", "hood", "headband", "gotoku", "hachi", "zukin", "kabuto", "kanmuri"];
export const UKIYOE_PROPS: readonly UkiyoeProp[] = ["none", "staff", "umbrella", "lantern", "fan", "pole", "basket-pole", "bundle", "fishing-rod", "scroll", "pipe", "kanabo", "peach", "parasol", "maiogi", "peony-lantern", "baby", "kozuchi", "onigiri", "firewood", "mirror", "tsurugi", "hoko", "tai", "yumi", "naginata", "shaku", "hiogi"];
export const UKIYOE_BUILDS: readonly UkiyoeBuild[] = ["slim", "average", "stout", "child", "brute"];

export interface UkiyoeFigureLook {
  build?: UkiyoeBuild;
  /** Standing height in px at scale 1. */
  height?: number;
  skin?: UkiyoePaint;
  hair?: UkiyoeHair;
  hairColor?: UkiyoePaint;
  hat?: UkiyoeHat;
  hatColor?: UkiyoePaint;
  robe?: UkiyoePaint;
  robePattern?: UkiyoePattern;
  /** Under-robe: collar line and the sliver that shows when the robe parts. */
  under?: UkiyoePaint;
  obi?: UkiyoePaint;
  /** Haori jacket over the robe (also colours the sleeves). */
  coat?: UkiyoePaint;
  coatPattern?: UkiyoePattern;
  /** `robe`: full length. `tucked`: hitched to the knee over leggings (travellers, porters). `hakama`: pleated trousers. */
  lower?: "robe" | "tucked" | "hakama" | "loincloth";
  /** `bare`: no kimono top — bare muscular torso and arms (oni, wrestlers, labourers). */
  upper?: "robe" | "bare";
  /** Oni: number of horns and the demon face (round glaring eyes, heavy brows, fangs). */
  horns?: 0 | 1 | 2;
  /** `oni`: the demon face. The ghost-story faces (`noppera`, `kuchisake`, `futakuchi`, `skull`, `oiwa`, `hag`) look
   * human, or nearly, until a `reveal` action shows them (see ukiyoe-onna). */
  face?: "human" | "oni" | UkiyoeGhostFace;
  /** The hagoromo: a long gauze scarf from the shoulders streaming behind (heavenly beings). */
  stole?: UkiyoePaint;
  /** A string of magatama jewels at the collar (the ancient gods). */
  beads?: boolean;
  /** Daikoku's rice bag over the shoulder. */
  bag?: boolean;
  /** The great armour (ō-yoroi) laced in this colour: cuirass, skirt plates and shoulder boards. */
  armor?: UkiyoePaint;
  hakama?: UkiyoePaint;
  legs?: UkiyoePaint;
  /** `koma-geta`: the courtesan's tall black-lacquered three-toothed clogs, worn bare-foot; `okobo`: the maiko's tall
   * wooden clogs with a sloped toe, on which she takes small steps. Both raise the whole figure. */
  feet?: "waraji" | "geta" | "tabi" | "bare" | "koma-geta" | "okobo";
  sleeves?: "short" | "long";
  prop?: UkiyoeProp;
  propColor?: UkiyoePaint;
  /** Umbrella canopy / lantern / fan colour. */
  accent?: UkiyoePaint;
  lips?: UkiyoePaint;
  beard?: boolean;
  /** Courtesan dress: an unbelted over-robe (uchikake) worn open over the robe, its padded hem (fuki) trailing behind. */
  uchikake?: UkiyoePaint;
  uchikakePattern?: UkiyoePattern;
  /** The uchikake's lining, seen in the padded hem and along its front edges (default beni). */
  lining?: UkiyoePaint;
  /** Large chrysanthemum roundels over the uchikake in this colour (default kin), or "none". */
  motif?: UkiyoePaint | "none";
  /** Kasane: the layered under-robes, outermost first, each showing as a band at the collar and at the hem. */
  layers?: readonly UkiyoePaint[];
  /** `front`: the obi tied in front in a great padded bundle (mae-obi), its ends hanging to the knee. `darari`: the
   * maiko's obi, its long ends hanging from a high knot nearly to the hem and swinging as she moves. */
  obiTie?: "back" | "front" | "darari";
  /** Colour of the obi's woven pattern (default kin). */
  obiPattern?: UkiyoePaint;
  /** Swords worn edge-up through the obi at the left hip: the long katana alone, or the pair (daishō). The sword actions
   * (`draw`, `kamae`, `cut`, `sheathe`) draw and use the katana. */
  swords?: "katana" | "daisho";
  /** Kamishimo: the stiff, winged sleeveless vest (kataginu) over the kimono, with crests; pair it with `hakama`. */
  kataginu?: UkiyoePaint;
  /** Colour of the crests (mon) on the kataginu (default the kataginu's own colour on white). */
  crest?: UkiyoePaint;
  /** How the figure faces the viewer: in profile; turned three-quarters (face, torso and limbs, as most print figures
   * are); `front`, facing us square on; or `back`, seen from behind. The `face` action turns a profile head to
   * three-quarter and back. */
  view?: "profile" | "three-quarter" | "front" | "back";
}

export type UkiyoeActionType =
  | "walk" | "run" | "bow" | "wave" | "point" | "talk" | "look" | "kneel" | "pole" | "row" | "brace" | "dance"
  | "jump" | "turn" | "cheer" | "startle" | "carry" | "hold" | "sweep" | "pray" | "face" | "dochu" | "kyomai" | "draw" | "kamae" | "cut" | "sheathe" | "parry" | "recoil" | "drop" | "fall" | "smash" | "swing" | "evade" | "sleep" | "weave" | "reveal" | "chop" | "hoe" | "pound" | "wash" | "shake" | "fly" | "shoot";
export const UKIYOE_ACTIONS: readonly UkiyoeActionType[] = [
  "walk", "run", "bow", "wave", "point", "talk", "look", "kneel", "pole", "row", "brace", "dance", "jump", "turn", "cheer", "startle", "carry", "hold", "sweep", "pray", "face", "dochu", "kyomai", "draw", "kamae", "cut", "sheathe", "parry", "recoil", "drop", "fall", "smash", "swing", "evade", "sleep", "weave", "reveal", "chop", "hoe", "pound", "wash", "shake", "fly", "shoot",
];
export interface UkiyoeAction {
  type: UkiyoeActionType;
  start: number;
  end: number;
  /** walk/run: local x to travel to (relative to the node origin); optional y for slopes and bridges. */
  to?: number;
  toY?: number;
  /** walk/run: waypoints `[x, y]` to pass through on the way (pier edge, step down into a boat, bridge crown). */
  via?: readonly (readonly [number, number])[];
  /** point/hold/look: angle in degrees. bow: depth in degrees. */
  angle?: number;
  amount?: number;
  /** look: turn the head to look behind. */
  back?: boolean;
  /** kamae: the guard — chūdan (middle), jōdan (overhead), hassō (upright by the shoulder) or waki (low, behind). */
  form?: UkiyoeKamae;
  /** weave: the loom's beater bar at rest (local px, facing right, feet at the origin); `amount` is how far the beat
   * pulls it in. cut/parry in a duel: the point (local px, facing right, feet at the origin) the blade passes through on the
   * `contact` frame, so two figures' blades cross exactly there; `parried` stops a cut on the other blade. */
  aim?: readonly [number, number];
  contact?: number;
  parried?: boolean;
  /** Blend frames (default 6): in after `start`, out after `end`. */
  blend?: number;
}

export interface UkiyoeFigureSpec { look: UkiyoeFigureLook; actions?: readonly UkiyoeAction[]; facing?: "left" | "right" }

/** Joint angles, degrees. Shoulder/hip angles are measured from straight down, + toward the facing direction. */
export interface FigurePose {
  lean: number; tilt: number; crouch: number; lift: number;
  shF: number; elF: number; shB: number; elB: number;
  hipF: number; knF: number; hipB: number; knB: number;
  footF: number; footB: number;
  mouth: number; blink: number; kneel: number; headBack: number;
  propAngle: number; squash: number;
  /** 0 → 1 as a ghost-story face is revealed (the `reveal` action; it stays revealed). */
  reveal: number;
  /** 0 profile → 1 three-quarter (the `face` action). */
  faceView: number;
  /** How far each foot swings out to the side (0..1): the courtesan's figure-eight step, seen in the square views. */
  splayF: number; splayB: number;
  /** 0 standing → 1 lying on the back: the `fall` action topples the figure about its heels. */
  fall: number;
}

const STAND: FigurePose = {
  lean: 2, tilt: 2, crouch: 0, lift: 0,
  shF: 10, elF: 28, shB: -4, elB: 18,
  hipF: 3, knF: 2, hipB: -3, knB: 2, footF: 0, footB: 0,
  mouth: 0, blink: 0, kneel: 0, headBack: 0, propAngle: 0, squash: 0, faceView: 0, splayF: 0, splayB: 0, fall: 0, reveal: 0,
};
const KEYS = Object.keys(STAND) as (keyof FigurePose)[];

// ---- Travel ----------------------------------------------------------------------------------------------------------------------

const TRAVEL = new Set<UkiyoeActionType>(["walk", "run", "dochu", "evade", "fly"]);
/** Root offset at a frame from the walk/run actions (each starts where the previous left off). */
export function travelAt(actions: readonly UkiyoeAction[], frame: number): { x: number; y: number; moving?: UkiyoeAction; from: Pt; dir: number; dist: number } {
  let x = 0, y = 0, moving: UkiyoeAction | undefined, from: Pt = [0, 0], dir = 0, dist = 0;
  for (const a of actions) {
    if (!TRAVEL.has(a.type) || a.start > frame) continue;
    const tx = a.to ?? x, ty = a.toY ?? y, len = Math.max(1, a.end - a.start);
    const u = clamp01((frame - a.start) / len);
    // Short acceleration and deceleration; constant pace in between (no floaty ease on a walk).
    const accel = Math.min(.2, 10 / len), e = u < accel ? u * u / (2 * accel * (1 - accel)) : u > 1 - accel ? 1 - (1 - u) ** 2 / (2 * accel * (1 - accel)) : (u - accel / 2) / (1 - accel);
    // The path runs through any `via` waypoints at an even pace, so feet follow piers, gangways, steps and slopes.
    const path: Pt[] = [[x, y], ...(a.via ?? []), [tx, ty]], total = polylineLength(path);
    from = [x, y];
    dir = Math.sign(tx - x) || dir;
    if (frame <= a.end) { moving = a; dist = total * e; [x, y] = alongPath(path, dist); break; }
    x = tx; y = ty; dist = total;
  }
  return { x, y, moving, from, dir, dist };
}

/** Facing at a frame: walking sets it from the travel direction; `turn` flips it at the action's midpoint. */
export function facingAt(spec: UkiyoeFigureSpec, frame: number): { dir: 1 | -1; squeeze: number } {
  let dir: 1 | -1 = spec.facing === "left" ? -1 : 1, squeeze = 1, x = 0;
  for (const a of spec.actions ?? []) {
    if (a.start > frame) break;
    // An evade springs back (or in) without turning round.
    if (TRAVEL.has(a.type)) { const tx = a.to ?? x; if (tx !== x && a.type !== "evade") dir = tx > x ? 1 : -1; x = tx; }
    if (a.type === "turn") {
      const mid = (a.start + a.end) / 2;
      if (frame >= mid) dir = dir === 1 ? -1 : 1;
      if (frame < a.end) squeeze = Math.max(.08, Math.abs(Math.cos(Math.PI * span(frame, a.start, a.end))));
    }
  }
  return { dir, squeeze };
}

// ---- Pose ------------------------------------------------------------------------------------------------------------------------

/** An action is fully in force from `start + blend` through `end`, then hands over during the next `blend` frames. */
function weight(a: UkiyoeAction, frame: number): number {
  const b = Math.max(1, a.blend ?? 6);
  if (frame < a.start || frame > a.end + b) return 0;
  return Math.min(smooth((frame - a.start) / b), frame <= a.end ? 1 : smooth(1 - (frame - a.end) / b));
}

export function figurePose(spec: UkiyoeFigureSpec, frame: number, seed: number, height: number): FigurePose {
  const pose: FigurePose = { ...STAND };
  // Breathing and idle drift, always on.
  pose.lean += Math.sin(frame / 38 + seed) * .6;
  pose.shF += Math.sin(frame / 41 + seed) * 1.5;
  const tr = travelAt(spec.actions ?? [], frame);
  for (const a of spec.actions ?? []) {
    const w = weight(a, frame);
    if (w <= 0) continue;
    const t = frame - a.start, len = Math.max(1, a.end - a.start), target: Partial<FigurePose> = {};
    switch (a.type) {
      case "walk": case "run": {
        // A three-quarter figure's stride is foreshortened (see turnSkeleton), so its legs cycle faster for the same
        // ground covered and the stance foot stays planted.
        const turned = spec.look.view === "three-quarter" && spec.look.face !== "oni";
        // On okobo the steps are short and quick, the knee barely lifting.
        const okobo = spec.look.feet === "okobo" && a.type !== "run";
        const run = a.type === "run", cycle = height * (run ? 1.25 : .62) * (a.amount ?? 1) * (turned ? .72 : 1) * (okobo ? .42 : 1);
        const ph = tr.dist / cycle * Math.PI * 2;
        const A = run ? 30 : okobo ? 8 : 17, s = Math.sin(ph), c = Math.cos(ph);
        // On okobo the stance leg sweeps at an even rate (a triangle wave), matching the even travel, so the planted
        // clog does not skate on these short steps.
        const sw = okobo ? Math.asin(s) * 2 / Math.PI : s;
        target.hipF = A * sw + 2; target.hipB = -A * sw + 2;
        // The leg swinging forward bends its knee; the stance leg stays nearly straight.
        target.knF = (run ? 70 : okobo ? 18 : 34) * Math.max(0, c) ** 1.4 + 3; target.knB = (run ? 70 : okobo ? 18 : 34) * Math.max(0, -c) ** 1.4 + 3;
        target.footF = (okobo ? -4 : -12) * Math.max(0, c); target.footB = (okobo ? -4 : -12) * Math.max(0, -c);
        target.shF = (run ? 25 : 12) - (run ? 35 : 13) * s; target.shB = -(run ? 25 : 6) + (run ? 35 : 13) * s;
        target.elF = run ? 85 : 30; target.elB = run ? 85 : 22;
        target.lean = run ? 16 : 5;
        target.lift = run ? Math.abs(Math.sin(ph)) * height * .04 : 0;
        break;
      }
      // Duel body: the cut leans in behind the blade, the parry braces with the knees, a hit staggers the body back.
      case "cut": { const c = a.contact ?? a.start + len * .46, k = smooth(span(frame, c - 10, c)) * (1 - smooth(span(frame, c + 6, a.end))); target.lean = 3 + 9 * k; target.crouch = .1 * k; target.hipF = 3 + 10 * k; target.hipB = -3 - 8 * k; break; }
      case "parry": { const c = a.contact ?? a.start + len * .5, k = smooth(span(frame, a.start, c - 4)) * (1 - smooth(span(frame, c + 6, a.end))); target.lean = 2 - 4 * k; target.crouch = .14 * k; target.hipF = 3 + 6 * k; target.hipB = -3 - 9 * k; break; }
      // Oni blows: the smash leans back into the wind-up and throws the whole body down after the club; the swing turns
      // in behind it. An evade is a low spring back (or in), knees bent, the body upright.
      case "smash": { const c = a.contact ?? a.start + len * .5, wind = smooth(span(frame, a.start, c - 7)) * (1 - smooth(span(frame, c - 7, c - 2))), hit = smooth(span(frame, c - 6, c)) * (1 - smooth(span(frame, c + 10, a.end))); target.lean = -7 * wind + 24 * hit; target.tilt = -12 * wind + 16 * hit; target.crouch = .05 * wind + .3 * hit; target.hipF = 3 + 18 * hit; target.hipB = -3 - 14 * hit; target.knF = 3 + 20 * hit; target.mouth = Math.max(wind, hit) * .9; break; }
      case "swing": { const c = a.contact ?? a.start + len * .5, k = smooth(span(frame, c - 8, c)) * (1 - smooth(span(frame, c + 6, a.end))); target.lean = 4 + 10 * k; target.crouch = .16 * k; target.hipF = 3 + 12 * k; target.hipB = -3 - 10 * k; target.mouth = .7 * k; break; }
      case "evade": { const u = span(frame, a.start, a.end), k = Math.sin(Math.PI * u); target.crouch = .18 * k + .06; target.lean = -4 * k; target.lift = k * height * .03; target.hipF = 6; target.hipB = -6; target.knF = 12; target.knB = 10; break; }
      // Topple back about the heels: slowly at first, then all at once (and it stays down).
      case "fall": target.fall = span(frame, a.start, a.end) ** 2; break;
      // Asleep: lying on the back (the fall pose, held), eyes closed, arms along the body, breathing slowly.
      // The ghost-story turn: the true face shows over `amount` frames (default 24) and stays.
      case "reveal": target.reveal = smooth(span(t, 0, a.amount ?? 24)); break;
      // Work with a swinging tool: the body follows the stroke (the tool and hands are placed in drawFigure).
      case "chop": case "hoe": case "pound": { const st = toolAt([a], frame); if (st) Object.assign(target, toolBody(st)); break; }
      // Kneeling at the tub, leaning in, scrubbing (the hands go to `aim` in drawFigure).
      case "wash": target.kneel = 1; target.lean = 22 + 4 * Math.sin(t / 5); target.tilt = 14; target.shF = 50; target.elF = 30; target.shB = 44; target.elB = 34; break;
      // The mallet of luck raised and shaken: the arm high, the wrist flicking, the body bouncing a little with it.
      case "shake": target.propAngle = t + 1; target.shF = 150 + 10 * Math.sin(t / 2.6); target.elF = 30 + 26 * Math.sin(t / 2.6); target.tilt = -10; target.lift = Math.abs(Math.sin(t / 5.2)) * height * .015; target.shB = 30; target.elB = 60; break;
      // Flying: risen off the ground, leaning into the flight, the legs trailing back together, a gentle bob.
      case "fly": target.lift = height * (.08 + .02 * Math.sin(t / 14)); target.lean = 28; target.tilt = -6; target.hipF = -24; target.hipB = -34; target.knF = 38; target.knB = 46; target.shF = 70 + 10 * Math.sin(t / 16); target.elF = 20; target.shB = 40; target.elB = 30; target.footF = 30; target.footB = 30; break;
      // Archery: the bow arm out toward the target, the string arm drawn back (hands placed by IK in drawFigure).
      case "shoot": target.lean = -2; target.tilt = -4; target.hipF = 10; target.hipB = -10; target.shF = 95; target.elF = 4; target.shB = 90; target.elB = 140; break;
      case "sleep": target.fall = 1; target.blink = 1; target.shF = 6 + 2 * Math.sin(t / 40); target.elF = 14; target.shB = 4; target.elB = 10; target.hipF = 2; target.hipB = -2; target.knF = 4; target.knB = 4; break;
      // Weaving at a loom, kneeling: the near hand pulls the beater in on the beat, the far hand throws the shuttle
      // while the shed is open. Timed by the absolute frame with the loom motif (weaveBeat), so the two agree.
      case "weave": {
        const w = weaveBeat(frame);
        target.kneel = 1; target.lean = 8 + 6 * w.beat; target.tilt = 10;
        target.shF = 62 - 20 * w.beat; target.elF = 40 + 30 * w.beat;
        target.shB = 54 + 18 * w.pass; target.elB = 70 - 40 * w.pass;
        break;
      }
      case "recoil": { const k = Math.sin(Math.PI * span(frame, a.start, a.start + Math.min(14, len))) * .4 + span(frame, a.start, a.start + 8) * .6; target.lean = -16 * k; target.tilt = -20 * k; target.crouch = .2 * k; target.shF = 18; target.elF = 24; target.shB = 6; target.elB = 20; break; }
      case "kyomai": {
        // Kyōmai, the Kyoto dance: slow, held poses with the fan, each flowing into the next. A — the fan raised high to
        // the side, the eyes following it; B — the fan brought before the face, the body sinking; C — the arms opened,
        // the sleeves hanging from them; D — low, turned in, the fan lowered. Each is held about a second, then the
        // body flows to the next over most of a second (smoothstep), so the dance never jerks.
        const K: Partial<FigurePose>[] = [
          { shF: 150, elF: 22, shB: 38, elB: 92, lean: 3, tilt: -9, crouch: .14 },
          { shF: 72, elF: 58, shB: 30, elB: 96, lean: 10, tilt: 13, crouch: .26 },
          { shF: 96, elF: 12, shB: -62, elB: 18, lean: 0, tilt: 3, crouch: .1 },
          { shF: 42, elF: 44, shB: 22, elB: 70, lean: 17, tilt: 19, crouch: .34 },
        ];
        const seg = 64 * (a.amount ?? 1), hold = .45, q = t / seg, i = Math.floor(q) % K.length, u = q - Math.floor(q);
        const m = smooth(clamp01((u - hold) / (1 - hold))), A0 = K[i], A1 = K[(i + 1) % K.length];
        for (const key of Object.keys(A0) as (keyof FigurePose)[]) target[key] = lerp(A0[key]!, A1[key]!, m);
        target.hipF = 6 + 4 * m; target.hipB = -4; target.knF = 10 + 20 * (target.crouch ?? 0); target.knB = 8 + 18 * (target.crouch ?? 0);
        break;
      }
      case "dochu": {
        // The courtesan's procession step (soto-hachimonji): very slow and deliberate. The free foot lifts its tall clog,
        // swings out and round in an arc and is set down only a little ahead, tracing a figure eight; the body rides
        // level with a slight sway, the head steady, the hands holding the over-robe closed at the breast.
        const turned = spec.look.view === "three-quarter" && spec.look.face !== "oni";
        const cycle = height * .34 * (a.amount ?? 1) * (turned ? .72 : 1), ph = tr.dist / cycle * Math.PI * 2;
        const s = Math.sin(ph), c = Math.cos(ph), upF = Math.max(0, c) ** 1.6, upB = Math.max(0, -c) ** 1.6;
        // The stance leg's sweep (±10° on a leg of about half the height) covers the ground travelled in a step, and it
        // sweeps at an even rate (a triangle wave, as the travel is even), so the planted clog does not slide.
        const tri = Math.asin(s) * 2 / Math.PI;
        target.hipF = 10 * tri + 3 + 10 * upF; target.hipB = -10 * tri + 3 + 10 * upB;
        target.knF = 36 * upF + 3; target.knB = 36 * upB + 3;
        target.footF = -28 * upF; target.footB = -28 * upB;
        target.splayF = upF; target.splayB = upB;
        target.shF = 26; target.elF = 84; target.shB = 20; target.elB = 76;
        target.lean = -2; target.tilt = 5 + 2.5 * s; target.lift = -height * .006 * (upF + upB);
        break;
      }
      case "bow": { const depth = a.angle ?? 38, k = smooth(span(t, 0, 14)) * (1 - smooth(span(t, len - 14, len))); target.lean = 2 + depth * k; target.tilt = 10 + 14 * k; target.shF = 18 + 10 * k; target.elF = 10; target.shB = 10; target.elB = 10; break; }
      case "wave": target.shF = 158; target.elF = 18 + 26 * Math.sin(t / 4.5); target.tilt = -4; break;
      case "point": target.shF = a.angle ?? 85; target.elF = 4; target.tilt = -2; break;
      case "talk": {
        const syl = Math.floor(t / 3), open = noise1(seed + 77, syl * .9) * .5 + .5;
        target.mouth = t % 3 === 0 && hash01(seed, syl) < .2 ? 0 : clamp01(open * 1.3);
        target.tilt = 2 + Math.sin(t / 9) * 3; target.shF = 34 + Math.sin(t / 11) * 12; target.elF = 60 + Math.sin(t / 7) * 14;
        break;
      }
      case "look": target.tilt = a.angle ?? -8; if (a.back) target.headBack = 1; break;
      case "kneel": target.kneel = 1; target.lean = 6; target.shF = 22; target.elF = 50; target.shB = 12; target.elB = 40; break;
      case "pole": {
        // One stroke every 44 frames: plant the pole ahead, lean into it as the boat slides past (the pole foot stays
        // put, so the shaft swings back), then lift and reach forward again. Pair with a `surge` loop on the boat
        // (same start, period 44) so the hull speeds up on each push.
        const c2 = Math.sin(t / 22 * Math.PI), lift = Math.max(0, -Math.cos(t / 22 * Math.PI));
        target.lean = 12 + 12 * c2; target.shF = 46 + 22 * c2 + 10 * lift; target.elF = 46 - 22 * c2; target.shB = 72 + 18 * c2 + 12 * lift; target.elB = 34;
        target.hipF = 14 + 7 * c2; target.knF = 18; target.hipB = -16 - 7 * c2; target.knB = 6; target.propAngle = 31 + 23 * c2;
        break;
      }
      case "row": { const c2 = Math.sin(t / 18 * Math.PI); target.lean = 8 + 10 * c2; target.shF = 60 + 25 * c2; target.elF = 30; target.shB = 55 + 25 * c2; target.elB = 30; target.hipF = 16; target.hipB = -14; target.knF = 12; target.propAngle = c2 * 14; break; }
      case "brace": target.lean = -(a.angle ?? 14); target.shF = 160; target.elF = 120; target.hipF = -16; target.hipB = 14; target.knB = 12; target.tilt = 12; break;
      case "dance": {
        const ph = t / 34 * Math.PI;
        target.shF = 90 + 60 * Math.sin(ph); target.elF = 40 + 30 * Math.sin(ph * 1.5); target.shB = 30 + 50 * Math.sin(ph + 1.7); target.elB = 50;
        target.lean = 4 + 8 * Math.sin(ph * .5); target.tilt = 6 * Math.sin(ph); target.hipF = 10 * Math.sin(ph * .5); target.knF = 10 + 8 * Math.sin(ph); target.crouch = .15 + .1 * Math.sin(ph);
        break;
      }
      case "jump": {
        const u = t / len, crouch = u < .25 ? smooth(u / .25) : u > .8 ? 1 - smooth((u - .8) / .2) * .0 : 0;
        const air = u >= .25 && u <= .8 ? Math.sin(Math.PI * (u - .25) / .55) : 0;
        const land = u > .8 ? Math.sin(Math.PI * (u - .8) / .2) : 0;
        target.crouch = u < .25 ? .45 * crouch : land * .4; target.lift = air * height * (a.amount ?? .35);
        target.shF = u < .25 ? -10 : 130 * air + 20; target.shB = u < .25 ? -30 : 110 * air; target.knF = 30 * air; target.knB = 50 * air; target.squash = u < .25 ? -.08 * crouch : air * .06 - land * .08;
        break;
      }
      case "turn": target.lean = 0; break;
      case "cheer": target.shF = 165 + 8 * Math.sin(t / 3); target.elF = 10; target.shB = 160 + 8 * Math.sin(t / 3 + 1); target.elB = 10; target.lift = Math.abs(Math.sin(t / 5)) * height * .03; break;
      case "startle": { const k = smooth(span(t, 0, 4)); target.lean = -12 * k; target.shF = 120 * k; target.elF = 60; target.shB = 100 * k; target.elB = 70; target.lift = height * .05 * Math.sin(Math.PI * span(t, 0, 10)); target.tilt = -12; break; }
      case "carry": target.shF = 160; target.elF = 140; target.lift = Math.abs(Math.sin(frame / 7)) * height * .006; break;
      case "hold": target.shF = a.angle ?? 40; target.elF = a.amount ?? 80; break;
      case "sweep": { const c2 = Math.sin(t / 14 * Math.PI); target.lean = 22; target.shF = 30 + 30 * c2; target.elF = 30; target.shB = 20 + 30 * c2; target.elB = 40; target.propAngle = 20 * c2; break; }
      case "pray": target.shF = 55; target.elF = 105; target.shB = 50; target.elB = 105; target.tilt = 14; target.lean = 8; break;
      // Turn the face toward the viewer (three-quarter view); the head swings round over the blend.
      case "face": target.faceView = 1; break;
    }
    for (const k of KEYS) if (target[k] !== undefined) pose[k] = lerp(pose[k], target[k]!, w);
  }
  // A fall stays down after its action ends.
  for (const a of spec.actions ?? []) if (a.type === "fall" && frame > a.end) pose.fall = 1;
  for (const a of spec.actions ?? []) if (a.type === "reveal" && frame > a.end) pose.reveal = 1;
  // A naginata is carried across the body in both hands.
  if (spec.look.prop === "naginata") { pose.shF = 62; pose.elF = 40; pose.shB = 34; pose.elB = 70; }
  // A mother holds the baby at her breast in both arms.
  if (spec.look.prop === "baby") { pose.shF = 24; pose.elF = 100; pose.shB = 18; pose.elB = 104; }
  // A parasol bearer keeps both hands up on the pole whatever his legs are doing.
  if (spec.look.prop === "parasol") { pose.shF = 38; pose.elF = 62; pose.shB = 30; pose.elB = 70; }
  // Seeded blinks every few seconds; eyes shut for 4 frames.
  const period = 96, slot = Math.floor((frame + seed % period) / period), at = (frame + seed % period) % period, blinkAt = 20 + Math.floor(hash01(seed, slot) * 60);
  if (at >= blinkAt && at < blinkAt + 4) pose.blink = Math.max(pose.blink, 1);
  return pose;
}

// ---- Skeleton --------------------------------------------------------------------------------------------------------------------

interface Skeleton {
  hip: Pt; neck: Pt; head: Pt; waistF: Pt; waistB: Pt;
  shF: Pt; elF: Pt; wrF: Pt; shB: Pt; elB: Pt; wrB: Pt;
  knF: Pt; anF: Pt; toeF: Pt; knB: Pt; anB: Pt; toeB: Pt;
  H: number; lean: number;
}
const lerp2 = (a: Pt, b: Pt, t: number): Pt => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
const dirDown = (deg: number): Pt => [Math.sin(deg * DEG), Math.cos(deg * DEG)];
const along = (p: Pt, deg: number, len: number): Pt => { const d = dirDown(deg); return [p[0] + d[0] * len, p[1] + d[1] * len]; };

/**
 * A three-quarter figure's limbs: the body is turned about 45° toward the viewer, so a limb swinging forward or back
 * swings partly toward or away from us and its sideways reach shrinks (foreshortening, × cos 45°); the far leg and arm
 * stand a little back and higher on the page (further away), the near ones a little forward; the feet shorten on the
 * diagonal. Applied to the solved joints, so every action keeps working.
 */
function turnSkeleton(s: Skeleton): Skeleton {
  const H = s.H, k = .72;
  const chain = (root: Pt, pts: Pt[], dx: number, dy: number): Pt[] => {
    const out: Pt[] = [];
    let prevSrc = root, prevDst: Pt = [root[0] + dx, root[1] + dy];
    for (const q of pts) { const d: Pt = [prevDst[0] + (q[0] - prevSrc[0]) * k, prevDst[1] + (q[1] - prevSrc[1])]; out.push(d); prevSrc = q; prevDst = d; }
    return out;
  };
  const [knF, anF] = chain(s.hip, [s.knF, s.anF], H * .012, 0), [knB, anB] = chain(s.hip, [s.knB, s.anB], -H * .034, -H * .014);
  const foot = (an: Pt, toe: Pt, srcAn: Pt): Pt => [an[0] + (toe[0] - srcAn[0]) * .74, an[1] + (toe[1] - srcAn[1]) * .9];
  const shF: Pt = [s.shF[0] + H * .012, s.shF[1]], shB: Pt = [s.shB[0] - H * .03, s.shB[1] - H * .008];
  const [elF, wrF] = chain(s.shF, [s.elF, s.wrF], H * .012, 0), [elB, wrB] = chain(s.shB, [s.elB, s.wrB], -H * .03, -H * .008);
  return { ...s, knF, anF, toeF: foot(anF, s.toeF, s.anF), knB, anB, toeB: foot(anB, s.toeB, s.anB), shF, elF, wrF, shB, elB, wrB };
}

function skeleton(pose: FigurePose, H: number, build: UkiyoeBuild): Skeleton {
  const child = build === "child";
  const thigh = H * (child ? .24 : .25), shin = H * (child ? .23 : .245), torso = H * (child ? .27 : .29);
  const reach = (hipA: number, knA: number) => thigh * Math.cos(hipA * DEG) + shin * Math.cos((hipA - knA) * DEG);
  let hipY = -Math.max(reach(pose.hipF, pose.knF), reach(pose.hipB, pose.knB));
  hipY += pose.crouch * H * .14;
  // Seiza: hips drop onto the heels, thighs forward.
  const kneel = pose.kneel;
  hipY = lerp(hipY, -H * .17, kneel) - pose.lift;
  const hip: Pt = [0, hipY];
  const lean = pose.lean;
  const neck = along(hip, 180 - lean, torso * (1 + pose.squash));
  const head = add(neck, [Math.sin(lean * DEG) * H * .03 + H * .012, -H * (child ? .1 : .072)]);
  const shBase = add(neck, [-Math.sin(lean * DEG) * -H * .01, H * .03]);
  const shF = add(shBase, [H * .012, 0]), shB = add(shBase, [-H * .02, H * .004]);
  const up = H * (child ? .15 : .165), fore = H * (child ? .14 : .15);
  const elF = along(shF, pose.shF + lean * .5, up), wrF = along(elF, pose.shF + pose.elF + lean * .5, fore);
  const elB = along(shB, pose.shB + lean * .5, up), wrB = along(elB, pose.shB + pose.elB + lean * .5, fore);
  let knF = along(hip, pose.hipF, thigh), anF = along(knF, pose.hipF - pose.knF, shin);
  let knB = along(hip, pose.hipB, thigh), anB = along(knB, pose.hipB - pose.knB, shin);
  if (kneel > 0) {
    // Folded legs: knees forward on the ground, shins under the thighs.
    const kF: Pt = [H * .2, -H * .02], aF: Pt = [-H * .06, -H * .02];
    knF = [lerp(knF[0], kF[0], kneel), lerp(knF[1], kF[1], kneel)]; anF = [lerp(anF[0], aF[0], kneel), lerp(anF[1], aF[1], kneel)];
    knB = [lerp(knB[0], kF[0] - H * .02, kneel), lerp(knB[1], kF[1], kneel)]; anB = [lerp(anB[0], aF[0] - H * .02, kneel), lerp(anB[1], aF[1], kneel)];
  }
  const foot = H * .085;
  const toeF = along(anF, 90 - pose.footF * (1 - kneel) + 90 * kneel * 0, foot * (1 - kneel * .6));
  const toeB = along(anB, 90 - pose.footB * (1 - kneel), foot * (1 - kneel * .6));
  const waist = along(hip, 180 - lean, torso * .3);
  const wn = dirDown(90 - lean);
  const waistF = add(waist, [wn[0] * H * .065, wn[1] * H * .065]), waistB = add(waist, [-wn[0] * H * .075, -wn[1] * H * .075]);
  return { hip, neck, head, waistF, waistB, shF, elF, wrF, shB, elB, wrB, knF, anF, toeF, knB, anB, toeB, H, lean };
}

// ---- Drawing helpers -------------------------------------------------------------------------------------------------------------

const lineW = (H: number) => Math.max(.9, H * .0062);
function limb(a: Pt, b: Pt, w0: number, w1: number): string {
  const tx = b[0] - a[0], ty = b[1] - a[1], len = Math.hypot(tx, ty) || 1, nx = -ty / len, ny = tx / len;
  return smoothD([[a[0] + nx * w0, a[1] + ny * w0], [b[0] + nx * w1, b[1] + ny * w1], [b[0] + tx / len * w1 * .6, b[1] + ty / len * w1 * .6], [b[0] - nx * w1, b[1] - ny * w1], [a[0] - nx * w0, a[1] - ny * w0], [a[0] - tx / len * w0 * .6, a[1] - ty / len * w0 * .6]], true, .3);
}

/**
 * Kimono sleeve: attached along the upper arm, the bag hangs toward `gravity` (rotated by lag and wind). When the
 * forearm rises, the opening slides back toward the elbow and bare forearm shows — as real sleeves do.
 */
function sleeve(sh: Pt, el: Pt, wr: Pt, depth: number, width: number, gravityDeg: number): { d: string; cuff: Pt } {
  const rise = clamp01((el[1] - wr[1]) / (Math.hypot(wr[0] - el[0], wr[1] - el[1]) || 1));
  const slide = rise * .7;
  const cuff: Pt = [lerp(wr[0], el[0], slide), lerp(wr[1], el[1], slide)];
  const ax = cuff[0] - sh[0], ay = cuff[1] - sh[1], al = Math.hypot(ax, ay) || 1, ux = ax / al, uy = ay / al;
  // The panel hangs on the underside of the arm (behind it when the arm is lowered) and drops further under gravity.
  // It always hangs on the gravity side: with the arm swung back the plain normal points up, and the panel would fold
  // flat onto the arm (a paper-thin sleeve), so it is flipped.
  const g = dirDown(gravityDeg), across = Math.abs(ux * g[1] - uy * g[0]);
  const n: Pt = -uy * g[0] + ux * g[1] < 0 ? [uy, -ux] : [-uy, ux];
  const drop = depth * (.35 + .65 * across);
  const wide = (p: Pt, k: number, extra: number): Pt => [p[0] + n[0] * width * k + g[0] * extra, p[1] + n[1] * width * k + g[1] * extra];
  const top0: Pt = [sh[0] - n[0] * width * .18, sh[1] - n[1] * width * .18];
  const cuffTop: Pt = [cuff[0] - n[0] * width * .16, cuff[1] - n[1] * width * .16];
  const cuffBot = wide(cuff, .32, 0);
  const bagF = wide(cuff, .95, drop * .9), bagB = wide([lerp(sh[0], cuff[0], .3), lerp(sh[1], cuff[1], .3)], .9, drop);
  const bagMid: Pt = [lerp(bagF[0], bagB[0], .5) + g[0] * width * .12, lerp(bagF[1], bagB[1], .5) + g[1] * width * .12];
  const pts: Pt[] = [top0, cuffTop, cuffBot, [lerp(cuffBot[0], bagF[0], .7), lerp(cuffBot[1], bagF[1], .7)], bagF, bagMid, bagB, wide(sh, .55, depth * .2)];
  return { d: smoothD(pts, true, .3), cuff };
}

function hand(wr: Pt, el: Pt, H: number): string {
  const a = Math.atan2(wr[1] - el[1], wr[0] - el[0]);
  const s = H * .022, tip: Pt = [wr[0] + Math.cos(a) * s * 2, wr[1] + Math.sin(a) * s * 2];
  const n: Pt = [-Math.sin(a), Math.cos(a)];
  return smoothD([[wr[0] + n[0] * s * .7, wr[1] + n[1] * s * .7], [tip[0] + n[0] * s * .4, tip[1] + n[1] * s * .4], tip, [tip[0] - n[0] * s * .5, tip[1] - n[1] * s * .5], [wr[0] - n[0] * s * .7, wr[1] - n[1] * s * .7]], true, .4);
}

// Head geometry in a unit box (facing right, origin head centre, ±20 units ≈ head height).
const FACE: Pt[] = [
  [0, -20], [10, -17], [15.5, -10], [16.6, -4], [17, -1], [20.2, 4.2], [17.4, 6.4], [17.8, 7.8], [16.6, 9.4], [17.4, 10.8], [15.4, 15.2], [11, 18], [5, 19.5],
  [3, 25], [-6, 25], [-8, 15], [-14.5, 6], [-16, -4], [-13, -14], [-7, -19],
];

/** The same head turned three-quarters toward the viewer: a broader face, the cheek rounding where the profile's nose was. */
const FACE3: Pt[] = [
  [0, -20], [9, -18], [14.5, -11], [16, -3.5], [16.6, 2.5], [15.8, 8.5], [13.6, 13.5], [10, 17.2], [5.5, 19], [2.5, 19.6],
  [2, 25], [-6, 25], [-8, 15], [-14.5, 6], [-16, -4], [-13, -14], [-7, -19],
];

function headPrims(look: UkiyoeFigureLook, pose: FigurePose, k: number, H: number, wind: number, frame: number, seed: number, tq = false): Prim[] {
  const P = (x: number, y: number): Pt => [x * k, y * k];
  const out: Prim[] = [], lw = lineW(H) * .85, skin = look.skin ?? "hada", hairC = look.hairColor ?? (look.hair === "elder" ? "usuzumi" : "sumi");
  const hair = look.hair ?? "chonmage", female = hair === "shimada" || hair === "long" || hair === "hyogo" || hair === "kamuro" || hair === "wareshinobu" || hair === "heian" || hair === "tenko";
  const hyogo = hair === "hyogo" ? hyogoSide(P, k, lw, hairC, look.accent ?? "shu", tq) : hair === "wareshinobu" ? wareshinobuSide(P, k, lw, hairC, look, tq, wind * .8 + Math.sin(frame / 9 + seed) * .35) : undefined;
  if (hyogo) out.push(...hyogo.behind);
  // Heian hair falls straight to the floor (head units: k px each; the feet are about H below the head) and pools when kneeling.
  const heian = hair === "heian" ? heianHairSide(P, lw, hairC, (H * lerp(.86, .52, pose.kneel)) / k, pose.kneel, wind * 6 + Math.sin(frame / 25 + seed)) : undefined;
  if (heian) out.push(...heian.behind);
  // Long hair falls behind the head and blows in the wind.
  if (hair === "long") {
    const sway = wind * 10 + Math.sin(frame / 20 + seed) * 2;
    out.push({ t: "fill", d: smoothD([P(-6, -18), P(-17, -6), P(-19 - sway * .3, 20), P(-16 - sway, 52), P(-22 - sway * 1.4, 88), P(-8 - sway, 86), P(-6, 40), P(-4, 12)], true, .4), fill: hairC, outline: lw });
  }
  if (hair === "shimada") out.push({ t: "fill", d: smoothD([P(-12, 4), P(-25, 8), P(-27, 16), P(-17, 19), P(-8, 14)], true, .5), fill: hairC, outline: lw });
  if (hair === "wild") {
    // A wild mane of spikes behind the face, blown by the wind.
    const spikes: Pt[] = [];
    for (let i = 0; i <= 16; i++) {
      const a = 150 + i * 12.5, r = 21 + (i % 2 ? 12 + 5 * Math.sin(i * 2.3) : 0), sw = wind * 7 * (i / 16);
      spikes.push(P(Math.cos(a * DEG) * r * 1.1 - 5 - sw, Math.sin(a * DEG) * r * 1.05 - 1));
    }
    out.push({ t: "fill", d: smoothD([P(4, 8), ...spikes, P(10, -21)], true, .12), fill: hairC, outline: lw });
  }
  const ghost = isGhostFace(look.face) ? look.face : undefined, outline = faceOutline(ghost, pose.reveal, tq ? FACE3 : FACE, tq);
  out.push({ t: "fill", d: smoothD(outline.map(q => P(q[0], q[1])), true, .32), fill: skin, outline: lw, outlineColor: "sumi" });
  // Shaved pate of an Edo man: a cool blue-grey crown.
  if (hair === "chonmage" || hair === "elder") out.push({ t: "fill", d: smoothD([P(-2, -19.6), P(9, -17.4), P(14.6, -11.5), P(9, -12), P(2, -13), P(-4, -14.5)], true, .4), fill: { type: "linear", angle: 90, stops: [[0, "sora", .85], [1, "sora", .35]] } });
  // Eye, brow, mouth (smoothing away on a faceless woman or under a skull's bone).
  const featStart = out.length;
  const shut = pose.blink, browC = hairC === "usuzumi" ? "usuzumi" : "sumi";
  if (tq) {
    // Three-quarter: the nose a hooked line breaking the cheek's edge; the near eye a long narrow slit, the far eye
    // foreshortened by the curve of the face; high thin brows; a small mouth set toward the cheek.
    out.push({ t: "line", d: carvedLine([P(13.4, -4.5), P(15.2, 1.5), P(16.9, 5), P(15.8, 6), P(14.4, 5.8)], k * .5 + .45, { taper: "both", minRatio: .35, smooth: true }), color: "sumi" });
    const eye = (cx: number, w: number, slant: number) => shut > .5
      ? [{ t: "line" as const, d: carvedLine([P(cx - w, -1.2), P(cx, -.2), P(cx + w, -1.2 + slant)], .9 * k * .5 + .5, { taper: "both" }), color: "sumi" }]
      : [{ t: "line" as const, d: carvedLine([P(cx - w, -1.2), P(cx - w * .1, -2.6), P(cx + w, -1.4 + slant)], k * .5 + .45, { taper: "both", minRatio: .3, smooth: true }), color: "sumi" },
        { t: "dots" as const, d: circleD((cx + w * .15) * k, -1.3 * k, .85 * k * Math.min(1, w / 2.6)), color: "sumi" }];
    out.push(...eye(6.8, 2.8, -.3), ...eye(14.2, 1.35, .2));
    out.push({ t: "line", d: carvedLine([P(3.2, -6.6), P(6.6, -7.9), P(10, -6.9)], k * .4 + .35, { taper: "both" }), color: browC, opacity: .9 });
    out.push({ t: "line", d: carvedLine([P(12.6, -6.9), P(14.2, -7.4), P(15.6, -6.6)], k * .35 + .3, { taper: "both" }), color: browC, opacity: .85 });
    if (pose.mouth > .08) out.push({ t: "fill", d: ellipseD(12.4 * k, 10.4 * k, 1.5 * k, (.6 + 1.6 * pose.mouth) * k), fill: "kogecha", noPrint: true });
    else if (female || look.lips) out.push({ t: "fill", d: ellipseD(12.6 * k, 10.2 * k, 1.25 * k, .65 * k), fill: look.lips ?? "beni", noPrint: true });
    else out.push({ t: "line", d: carvedLine([P(11, 10.4), P(12.6, 10.6), P(14, 10.2)], k * .35 + .3, { taper: "both" }), color: "sumi", opacity: .7 });
  } else {
    if (shut > .5) out.push({ t: "line", d: carvedLine([P(7.5, -1), P(10, .3), P(12.6, -.2)], .9 * k * .5 + .6, { taper: "both" }), color: "sumi" });
    else {
      out.push({ t: "line", d: carvedLine([P(6.8, -1.6), P(9.8, -2.6), P(12.8, -.6)], k * .55 + .5, { taper: "both" }), color: "sumi" });
      out.push({ t: "dots", d: circleD(11 * k, -1.2 * k, .95 * k), color: "sumi" });
    }
    out.push({ t: "line", d: carvedLine([P(5.5, -6.2), P(9.5, -7.6), P(13.2, -6.2)], k * .45 + .4, { taper: "both" }), color: browC, opacity: .9 });
    if (pose.mouth > .08) out.push({ t: "fill", d: ellipseD(16.4 * k, 9.4 * k, 1.5 * k, (.6 + 1.6 * pose.mouth) * k), fill: "kogecha", noPrint: true });
    else if (female || look.lips) out.push({ t: "fill", d: ellipseD(17 * k, 9.3 * k, 1.1 * k, .7 * k), fill: look.lips ?? "beni", noPrint: true });
  }
  const shown = humanFeatures(ghost, pose.reveal);
  if (shown < 1) { const feats = out.splice(featStart); if (shown > 0) out.push({ t: "group", opacity: shown, prims: feats }); }
  if (ghost && ghost !== "futakuchi") out.push(...ghostFaceSide(ghost, pose.reveal, P, k, lw, skin, pose.mouth, frame, seed, tq, outline));
  if (!female && hair !== "child") out.push({ t: "line", d: carvedLine([P(-1, 2), P(-3, 4.5), P(-1.5, 7)], k * .4 + .3), color: "sumi", opacity: .7 });
  if (look.beard) out.push({ t: "fill", d: smoothD([P(15, 12), P(11, 22), P(6, 26), P(5, 18), P(9, 15)], true, .4), fill: hairC, outline: lw * .7 });
  // Hair styles.
  switch (hair) {
    case "chonmage": case "elder": {
      out.push({ t: "fill", d: smoothD([P(-4, -14.5), P(2, -13), P(5, -9), P(4, -3), P(-1, 3), P(-4, 10), P(-9, 16), P(-15, 6), P(-16, -4), P(-12, -14)], true, .4), fill: hairC, outline: lw });
      out.push({ t: "fill", d: smoothD([P(-9, -17), P(-3, -21), P(6, -24.5), P(9, -23.5), P(2, -20), P(-6, -15.5)], true, .4), fill: hairC, outline: lw });
      break;
    }
    case "topknot": out.push({ t: "fill", d: smoothD([P(-1, -20), P(10, -17), P(15.5, -10), P(12, -12), P(4, -14), P(-2, -8), P(-6, 4), P(-10, 15), P(-15, 6), P(-16, -6), P(-11, -16)], true, .4), fill: hairC, outline: lw }); out.push({ t: "fill", d: ellipseD(-6 * k, -22 * k, 5 * k, 4 * k), fill: hairC, outline: lw }); break;
    case "shimada": {
      out.push({ t: "fill", d: smoothD([P(-1, -21), P(9, -20), P(15, -12), P(12, -11), P(6, -12), P(2, -6), P(3, 3), P(-2, 8), P(-9, 12), P(-15, 5), P(-17, -6), P(-12, -17)], true, .4), fill: hairC, outline: lw });
      out.push({ t: "fill", d: smoothD([P(-12, -18), P(-10, -29), P(0, -33), P(9, -29), P(8, -21), P(-2, -20)], true, .45), fill: hairC, outline: lw });
      out.push({ t: "fill", d: smoothD([P(-4, -22.5), P(1, -27), P(6, -23)], false, .4) + "Z", fill: look.accent ?? "shu", outline: lw * .7 });
      out.push({ t: "line", d: carvedLine([P(-14, -26), P(10, -30)], 1.2 * k * .5 + .6, { taper: "none" }), color: "kin" });
      out.push({ t: "dots", d: circleD(10.5 * k, -30 * k, 1.6 * k) + circleD(-14.5 * k, -26 * k, 1.4 * k), color: look.accent ?? "shu" });
      break;
    }
    case "child": out.push({ t: "fill", d: smoothD([P(-1, -21), P(10, -18), P(15, -11), P(11, -9), P(6, -11), P(3, -6), P(0, 3), P(-6, 8), P(-15, 4), P(-16, -8), P(-11, -18)], true, .4), fill: hairC, outline: lw }); out.push({ t: "fill", d: ellipseD(-1 * k, -22 * k, 3.4 * k, 2.6 * k), fill: hairC }); break;
    case "long": out.push({ t: "fill", d: smoothD([P(-1, -21), P(9, -19), P(15.6, -10), P(12, -9), P(5, -11), P(1, -4), P(-1, 8), P(-7, 18), P(-16, 8), P(-17, -6), P(-12, -17)], true, .4), fill: hairC, outline: lw }); break;
    case "bald": break;
    case "hyogo": case "wareshinobu": out.push(...hyogo!.over); break;
    case "kamuro": out.push(...kamuroSide(P, k, lw, hairC, look.accent ?? "beni")); break;
    case "mizura": case "tenko": out.push(...ancientHairSide(hair, P, k, lw, hairC, look.accent ?? "shu")); break;
    case "heian": out.push(...heian!.over); break;
  }
  if (look.face === "oni") {
    // Glaring round eye, heavy brow, flared nostril, fangs; horns break through the hair.
    out.push({ t: "fill", d: ellipseD(10.2 * k, -2 * k, 3.6 * k, 3.2 * k), fill: "gofun", outline: lw });
    out.push({ t: "fill", d: ellipseD(11.2 * k, -2 * k, 2.2 * k, 2.2 * k), fill: "ki" });
    out.push({ t: "dots", d: circleD(11.6 * k, -2 * k, 1.1 * k), color: "sumi" });
    out.push({ t: "line", d: carvedLine([P(4.5, -9.5), P(9.5, -6.8), P(15.5, -5.8)], k * 2.4, { taper: "end" }), color: "sumi" });
    out.push({ t: "fill", d: ellipseD(18.4 * k, 4.6 * k, 1.4 * k, .9 * k), fill: "sumi", noPrint: true });
    out.push({ t: "fill", d: polyD([P(15.2, 9.6), P(16.4, 14.2), P(17.2, 9.6)]) + polyD([P(12.6, 10), P(13.2, 13.4), P(14.2, 10)]), fill: "gofun", outline: lw * .6 });
    const horns = look.horns ?? 2;
    for (let h = 0; h < horns; h++) {
      const x0 = horns === 1 ? 2 : h ? 6 : -5, base: Pt[] = [P(x0 - 3.2, -16), P(x0 + 1 + h * 2, -31 - h * 2), P(x0 + 3.2, -16)];
      out.push({ t: "fill", d: smoothD([base[0], P(x0 - 2, -24), base[1], P(x0 + 3.5, -22), base[2]], true, .3), fill: { type: "linear", angle: 90, stops: [[0, "gofun", 1], [1, "ki", 1]] }, outline: lw });
      out.push({ t: "stroke", d: [-19, -22, -25].map(y => `M${((x0 - 2) * k).toFixed(1)} ${(y * k).toFixed(1)}l${(4 * k).toFixed(1)} ${(-.6 * k).toFixed(1)}`).join(""), color: "kincha", width: .8 });
    }
  }
  // The second mouth opens in the back of the head, over the hair.
  if (ghost === "futakuchi") out.push(...ghostFaceSide(ghost, pose.reveal, P, k, lw, skin, pose.mouth, frame, seed, tq, outline));
  if (look.hat === "gotoku") out.push(...gotokuCrown(P, k, lw, frame, seed));
  if (look.hat === "hachi") out.push(...hachiSide(P, lw));
  if (look.hat === "zukin") out.push(...zukin(P, lw));
  if (look.hat === "kabuto") out.push(...kabutoSide(P, k, lw, look.armor ?? "beni"));
  if (look.hat === "kanmuri") out.push(...kanmuriSide(P, lw));
  // Hats.
  const hat = look.hat ?? "none", hatC = look.hatColor ?? (hat === "eboshi" ? "sumi" : hat === "hood" ? "ai" : "kincha");
  if (hat === "kasa" || hat === "conical") {
    const deep = hat === "conical", lift = clamp01(Math.abs(wind) - .8) * 4 * Math.sign(wind);
    const rim = deep ? 24 : 30, apexY = deep ? -36 : -27;
    const brim: Pt[] = [P(-rim, -9 + lift), P(0, apexY), P(rim + 2, -10 - lift), P(rim - 2, -7.5 - lift), P(0, -12.5), P(-rim + 2, -6.6 + lift)];
    out.push({ t: "fill", d: smoothD(brim, true, .18), fill: { type: "linear", angle: 0, stops: [[0, hatC, 1], [1, "ki", 1]] }, outline: lw, grain: .6 });
    const ribs: string[] = [];
    for (let i = 1; i < 8; i++) { const u = i / 8; ribs.push(`M${0} ${apexY * k}L${lerp(-rim, rim + 2, u) * k} ${lerp(-9 + lift, -10 - lift, u) * k}`); }
    out.push({ t: "stroke", d: ribs.join(""), color: "cha", width: .8, opacity: .7 });
    out.push({ t: "stroke", d: `M${5 * k} ${-10 * k}Q${10 * k} ${8 * k} ${14 * k} ${14 * k}`, color: "kogecha", width: .9, opacity: .8 });
  } else if (hat === "eboshi") {
    out.push({ t: "fill", d: smoothD([P(-12, -14), P(-14, -30), P(-8, -46), P(2, -44), P(4, -30), P(8, -16), P(0, -13)], true, .35), fill: hatC, outline: lw, grain: .3 });
  } else if (hat === "hood") {
    const fx = tq ? -1 : 4;   // the hood's front edge frames a three-quarter face further back
    out.push({ t: "fill", d: smoothD([P(-4, -23), P(10, -20), P(16, -10), P(13, -9), P(9, -14), P(fx, -10), P(fx, 12), P(-6, 26), P(-18, 22), P(-18, -6), P(-13, -18)], true, .35), fill: hatC, outline: lw, grain: .3 });
  } else if (hat === "headband") {
    const tail = wind * 8 + Math.sin(frame / 4 + seed) * 2;
    out.push({ t: "fill", d: smoothD([P(-16, -9), P(14, -12), P(15, -9), P(-15, -5)], true, .2), fill: hatC === "kincha" ? "gofun" : hatC, outline: lw * .8 });
    out.push({ t: "fill", d: smoothD([P(-15, -8), P(-22 - tail, -14), P(-26 - tail * 1.4, -10), P(-21 - tail, -7), P(-24 - tail * 1.3, -2), P(-16, -6)], true, .3), fill: hatC === "kincha" ? "gofun" : hatC, outline: lw * .8 });
  }
  return out;
}

// ---- Props -------------------------------------------------------------------------------------------------------------------------

function propPrims(look: UkiyoeFigureLook, pose: FigurePose, s: Skeleton, wind: number, frame: number, layer: "back" | "front" | "over"): Prim[] {
  const prop = look.prop ?? "none", H = s.H, lw = lineW(H), color = look.propColor ?? "cha", accent = look.accent ?? "ai", out: Prim[] = [];
  const w = s.wrF;
  if (layer === "back" && prop === "bundle") {
    const c = add(s.neck, [-H * .1, H * .1]);
    out.push({ t: "fill", d: ellipseD(c[0], c[1], H * .09, H * .1), fill: accent, outline: lw, pattern: { type: "kanoko", color: "gofun", scale: .6, opacity: .7 } });
  }
  if (layer === "back" && prop === "firewood") out.push(...firewood(add(s.neck, [-H * .05, H * .14]), H, lw));
  if (layer === "back" && look.bag) out.push(...riceBag(add(s.neck, [-H * .04, H * .1]), H, lw));
  if (layer === "back" && prop === "basket-pole") {
    const bounce = Math.sin(frame / 3.5) * H * .012;
    const sh = add(s.shF, [0, -H * .02]), a: Pt = add(sh, [H * .45, -H * .02 + bounce * .5]), b: Pt = add(sh, [-H * .45, H * .01 - bounce * .5]);
    out.push({ t: "line", d: carvedLine([b, sh, a], H * .018, { taper: "none" }), color });
    for (const end of [a, b]) {
      const sw = Math.sin(frame / 9 + end[0]) * 3 + wind * 6, base: Pt = [end[0] + sw, end[1] + H * .3 + bounce];
      out.push({ t: "stroke", d: `M${end[0]} ${end[1]}L${base[0] - H * .07} ${base[1] - H * .08}M${end[0]} ${end[1]}L${base[0] + H * .07} ${base[1] - H * .08}`, color: "kogecha", width: 1.2 });
      out.push({ t: "fill", d: polyD([[base[0] - H * .09, base[1] - H * .09], [base[0] + H * .09, base[1] - H * .09], [base[0] + H * .07, base[1]], [base[0] - H * .07, base[1]]]), fill: "kincha", outline: lw, pattern: { type: "kikko", color: "cha", scale: .35, opacity: .7 } });
    }
  }
  if (layer !== "front" && layer !== "over") return out;
  if (layer === "front") {
    switch (prop) {
      case "staff": out.push({ t: "line", d: carvedLine([add(w, [H * .01, -H * .12]), add(w, [H * .07, H * .36 + -w[1] * 0 + Math.max(0, -w[1] - H * .4)])], H * .016, { taper: "none" }), color }); break;
      case "pole": case "fishing-rod": {
        const ang = (prop === "pole" ? 70 + pose.propAngle : -40 + pose.propAngle);
        const len = prop === "pole" ? H * 1.7 : H * 1.6;
        const a = polar(w, ang + 180, len * (prop === "pole" ? .35 : .1)), b = polar(w, ang, len * (prop === "pole" ? .65 : .9));
        out.push({ t: "line", d: carvedLine([a, b], H * (prop === "pole" ? .016 : .008), { taper: prop === "pole" ? "none" : "end" }), color });
        if (prop === "fishing-rod") out.push({ t: "stroke", d: `M${b[0]} ${b[1]}Q${b[0] + 20} ${b[1] + H * .4} ${b[0] + 10 + wind * 20} ${b[1] + H * .8}`, color: "usuzumi", width: .8 });
        break;
      }
      case "peony-lantern": out.push(...peonyLantern(w, H, lw, frame, wind, 0)); break;
      case "onigiri": out.push(...onigiri([w[0] + H * .015, w[1] - H * .02], H * .03, lw)); break;
      case "mirror": case "tsurugi": case "hoko": case "tai": out.push(...kamiProp(prop, w, H, lw, frame)); break;
      case "naginata": out.push(...naginata(w, -55, H, lw)); break;
      case "shaku": case "hiogi": out.push(...courtProp(prop, w, H, lw, frame)); break;
      case "kozuchi": {
        // Held up by the handle, pointing on along the forearm; shaken, it pours out treasure.
        const a = Math.atan2(w[1] - s.elF[1], w[0] - s.elF[0]) / DEG;
        out.push(...kozuchi(w, a, H, lw));
        if (pose.propAngle > 0) out.push(...treasure([w[0] + Math.cos(a * DEG) * H * .16, w[1] + Math.sin(a * DEG) * H * .16], pose.propAngle, H, 7));
        break;
      }
      case "baby": out.push(...babyBundle([(s.wrF[0] + s.wrB[0]) / 2 - H * .01, (s.wrF[1] + s.wrB[1]) / 2 - H * .02], H, lw)); break;
      case "lantern": {
        const tip = add(w, [H * .16, -H * .05]);
        out.push({ t: "line", d: carvedLine([w, tip], H * .01, { taper: "none" }), color });
        const sw = Math.sin(frame / 11) * 4 + wind * 8, c: Pt = [tip[0] + sw, tip[1] + H * .14];
        out.push({ t: "stroke", d: `M${tip[0]} ${tip[1]}L${c[0]} ${c[1] - H * .07}`, color: "sumi", width: 1 });
        out.push({ t: "glow", cx: c[0], cy: c[1], r: H * .4, color: "ki", opacity: .5 * (.85 + .15 * Math.abs(noise1(frame, frame / 3))) });
        out.push({ t: "fill", d: ellipseD(c[0], c[1], H * .05, H * .07), fill: { type: "radial", stops: [[0, "ki", 1], [1, look.accent ?? "shu", 1]] }, outline: lw });
        break;
      }
      case "fan": {
        const a = Math.atan2(w[1] - s.elF[1], w[0] - s.elF[0]) / DEG, r = H * .14, pts: Pt[] = [w];
        for (let i = 0; i <= 8; i++) pts.push(polar(w, a - 70 + 140 * i / 8 - 90, r));
        out.push({ t: "fill", d: polyD(pts), fill: { type: "radial", center: [.5, 1], radius: 1, stops: [[0, "gofun", 1], [.5, "gofun", 1], [1, accent, 1]] }, outline: lw });
        const ribs = pts.slice(1).map(q => `M${w[0]} ${w[1]}L${q[0]} ${q[1]}`).join("");
        out.push({ t: "stroke", d: ribs, color: "cha", width: .7, opacity: .7 });
        break;
      }
      case "maiogi": { const a = Math.atan2(w[1] - s.elF[1], w[0] - s.elF[0]) / DEG; out.push(...maiogi(w, a - 12, H * .17, lw, accent === "ai" ? "beni" : accent, clamp01((pose.shF - 25) / 45))); break; }
      case "scroll": out.push({ t: "fill", d: ellipseD(w[0] + H * .03, w[1], H * .06, H * .018), fill: "gofun", outline: lw }); break;
      case "pipe": out.push({ t: "line", d: carvedLine([w, add(w, [H * .14, -H * .06])], H * .008, { taper: "none" }), color: "kogecha" }); break;
      case "kanabo": {
        // The oni's iron-studded club, swung by the arm: thick at the head, gold studs.
        const a = Math.atan2(w[1] - s.elF[1], w[0] - s.elF[0]) / DEG - 70;
        const butt = polar(w, a + 180, H * .06), head = polar(w, a, H * .55);
        out.push({ t: "fill", d: carvedLine([butt, w, head], H * .07, { taper: "start", minRatio: .35, smooth: true }), fill: { type: "linear", angle: 0, stops: [[0, "kogecha", 1], [1, "sumi", 1]] }, outline: lw, grain: .4 });
        const studs: string[] = [];
        for (let i = 0; i < 10; i++) { const q = polar(w, a, H * (.2 + .033 * i)); studs.push(circleD(...polar(q, a + 90, H * (i % 2 ? .015 : -.015)), H * .009)); }
        out.push({ t: "dots", d: studs.join(""), color: "kin" });
        break;
      }
      case "peach": {
        const c = add(w, [H * .03, -H * .02]), r = H * .05;
        out.push({ t: "fill", d: smoothD([[c[0], c[1] - r * 1.1], [c[0] + r, c[1] - r * .2], [c[0] + r * .6, c[1] + r * .8], [c[0], c[1] + r], [c[0] - r * .6, c[1] + r * .8], [c[0] - r, c[1] - r * .2]], true, .5), fill: { type: "radial", center: [.6, .4], stops: [[0, "sakura", 1], [1, "beni", 1]] }, outline: lw });
        out.push({ t: "fill", d: ellipseD(c[0] - r * .5, c[1] - r * 1.1, r * .45, r * .2), fill: "kusa", outline: lw * .7 });
        break;
      }
    }
  }
  if (layer === "over" && prop === "parasol") out.push(...parasol(add(lerp2(s.wrF, s.wrB, .5), [0, 0]), H, lw, look.accent ?? "beni", 1, wind, frame, false));
  if (layer === "over" && prop === "umbrella") {
    // Wagasa: oiled-paper canopy on a bamboo shaft held over the head, tipped into the wind; janome ring near the rim.
    const target: Pt = [s.head[0] + H * .01, s.head[1] - H * .3];
    const base = Math.atan2(target[0] - w[0], -(target[1] - w[1])) / DEG;
    const tilt = clamp(base - wind * 14 + Math.sin(frame / 30) * 1.5, -60, 60), ang = tilt * DEG;
    const shaft = Math.hypot(target[0] - w[0], target[1] - w[1]), top = add(w, [Math.sin(ang) * shaft, -Math.cos(ang) * shaft]);
    out.push({ t: "line", d: carvedLine([add(w, [-Math.sin(ang) * H * .07, Math.cos(ang) * H * .07]), top], H * .011, { taper: "none" }), color: "cha" });
    const R = H * .34;
    const rot = (x: number, y: number): Pt => [top[0] + x * Math.cos(ang) - y * Math.sin(ang), top[1] + x * Math.sin(ang) + y * Math.cos(ang)];
    const dome: Pt[] = [], rim: Pt[] = [];
    for (let i = 0; i <= 12; i++) { const u = i / 12 * 2 - 1; dome.push(rot(u * R, -R * .5 * (1 - u * u) ** .7 + R * .12)); }
    for (let i = 12; i >= 0; i--) { const u = i / 12 * 2 - 1; rim.push(rot(u * R * .98, R * .12 + R * .1 * (1 - u * u))); }
    out.push({ t: "fill", d: smoothD([...dome, ...rim], true, .25), fill: accent, outline: lw, grain: .4 });
    const ring: Pt[] = [], ringIn: Pt[] = [];
    for (let i = 0; i <= 12; i++) { const u = i / 12 * 2 - 1; ring.push(rot(u * R * .9, -R * .42 * (1 - (u * .9) ** 2) ** .75 * .32 + R * .16)); ringIn.push(rot(u * R * .72, -R * .42 * (1 - (u * .72) ** 2) ** .75 * .5 + R * .1)); }
    out.push({ t: "fill", d: smoothD([...ring, ...ringIn.reverse()], true, .3), fill: "gofun", opacity: .92 });
    const apex = rot(0, -R * .3);
    out.push({ t: "stroke", d: dome.filter((_, i) => i % 2 === 0).map(q => `M${apex[0].toFixed(1)} ${apex[1].toFixed(1)}L${q[0].toFixed(1)} ${q[1].toFixed(1)}`).join(""), color: "sumi", width: .7, opacity: .35 });
    out.push({ t: "fill", d: ellipseD(apex[0], apex[1], H * .012, H * .008), fill: "sumi" });
  }
  return out;
}

// ---- Figure ----------------------------------------------------------------------------------------------------------------------

export interface DrawnFigure { prims: Prim[]; x: number; y: number; dir: 1 | -1; squeeze: number }

export function figureHeight(look: UkiyoeFigureLook): number {
  return look.height ?? ({ slim: 262, average: 250, stout: 238, child: 168, brute: 300 } as const)[look.build ?? "average"];
}

export function drawFigure(spec: UkiyoeFigureSpec, frame: number, wind: number, seed: number): DrawnFigure {
  const H = figureHeight(spec.look), build = spec.look.build ?? "average";
  const pose = figurePose(spec, frame, seed, H), prev = figurePose(spec, frame - 2, seed, H);
  // A skeleton revealed: the hands go to bone with the face.
  const look: UkiyoeFigureLook = spec.look.face === "skull" && pose.reveal > .6 ? { ...spec.look, skin: "paper" } : spec.look;
  // Square to the viewer, front or back: a symmetric drawing driven by the same pose (see ukiyoe-figure-front).
  if (look.view === "front" || look.view === "back") {
    const tr0 = travelAt(spec.actions ?? [], frame);
    // The sword is placed in the profile frame and projected by the square drawing.
    let swordSq: SquareSword | undefined;
    if (look.swords) {
      const st = swordAt(spec.actions ?? [], frame), sk = skeleton(pose, H, build), g = swordGeometry(st, sk.neck, add(sk.waistF, [-H * .012, H * .022]), H);
      swordSq = { st, a: g.a, shown: g.shown, sayaA: g.sayaA, tsuba: [(g.tsuba[0] - sk.neck[0]) / H, (g.tsuba[1] - sk.neck[1]) / H], koi: [(g.koi[0] - sk.neck[0]) / H, (g.koi[1] - sk.neck[1]) / H] };
    }
    let clubSq: { grip: Pt; a: number; dropped: number } | undefined;
    if (look.prop === "kanabo" && usesClub(spec.actions ?? [])) {
      const st = clubAt(spec.actions ?? [], frame), sk = skeleton(pose, H, build), g = clubGeometry(st, sk.neck, H);
      clubSq = { grip: [(g.grip[0] - sk.neck[0]) / H, (g.grip[1] - sk.neck[1]) / H], a: g.a, dropped: st.dropped };
    }
    return { prims: drawFigureFrontBack(look, pose, H, wind, frame, look.view === "back", swordSq, clubSq), x: tr0.x, y: tr0.y, dir: 1, squeeze: 1 };
  }
  const turned = look.view === "three-quarter" && look.face !== "oni";
  const s0 = skeleton(pose, H, build), sp0 = skeleton(prev, H, build), s = turned ? turnSkeleton(s0) : s0, sp = turned ? turnSkeleton(sp0) : sp0;
  // Swords: the katana follows its own timeline (swordAt); the hands are put on the hilt by IK, the right hand behind the
  // guard and the left at the end of the hilt (or on the scabbard's mouth while drawing and sheathing one-handed).
  const sword = look.swords ? swordAt(spec.actions ?? [], frame) : undefined, swordPrev = look.swords ? swordAt(spec.actions ?? [], frame - 2) : undefined;
  const geo = sword ? swordGeometry(sword, s.neck, add(s.waistF, [-H * .012, H * .022]), H) : undefined;
  const geoPrev = swordPrev ? swordGeometry(swordPrev, sp.neck, add(sp.waistF, [-H * .012, H * .022]), H) : undefined;
  // The oni's club on its own timeline (only when the figure fights with it; otherwise the simple hand-held prop).
  const club = look.prop === "kanabo" && usesClub(spec.actions ?? []) ? clubAt(spec.actions ?? [], frame) : undefined;
  const clubG = club ? clubGeometry(club, s.neck, H) : undefined, clubP = club ? clubGeometry(clubAt(spec.actions ?? [], frame - 2), sp.neck, H) : undefined;
  if (club && clubG && club.dropped < 1) {
    const u: Pt = [Math.cos(clubG.a * DEG), Math.sin(clubG.a * DEG)], w = 1 - club.dropped;
    const up = H * (build === "child" ? .15 : .165), fore = H * (build === "child" ? .14 : .15);
    [s.elF, s.wrF] = reachArm(s.shF, lerp2(s.wrF, clubG.grip, w), up, fore, 1);
    [s.elB, s.wrB] = reachArm(s.shB, lerp2(s.wrB, [clubG.grip[0] + u[0] * H * .1, clubG.grip[1] + u[1] * H * .1], w * club.grip), up, fore, 1);
  }
  if (sword && geo && (sword.held || sword.reach > 0)) {
    const u: Pt = [Math.cos(geo.a * DEG), Math.sin(geo.a * DEG)], w = sword.held ? 1 : sword.reach;
    const up = H * (build === "child" ? .15 : .165), fore = H * (build === "child" ? .14 : .15);
    const gripR: Pt = [geo.tsuba[0] - u[0] * H * .03, geo.tsuba[1] - u[1] * H * .03], gripL: Pt = [geo.tsuba[0] - u[0] * H * .12, geo.tsuba[1] - u[1] * H * .12];
    [s.elF, s.wrF] = reachArm(s.shF, lerp2(s.wrF, gripR, w), up, fore, 1);
    [s.elB, s.wrB] = reachArm(s.shB, lerp2(s.wrB, lerp2(add(geo.koi, [H * .012, H * .012]), gripL, sword.grip), w), up, fore, 1);
  }
  // Weaving with an `aim` (the beater's top bar at rest, in the figure's frame): the near hand holds the bar and pulls
  // it in on the beat, the far hand works the shuttle just behind it, both placed by IK so they stay on the loom.
  const weave = (spec.actions ?? []).find(a => a.type === "weave" && a.aim && frame >= a.start && frame <= a.end);
  if (weave?.aim) {
    const wb = weaveBeat(frame), pull = weave.amount ?? H * .06, up = H * .165, fore = H * .15;
    const gF: Pt = [weave.aim[0] - pull * wb.beat, weave.aim[1]];
    const gB: Pt = [gF[0] - H * .03 - H * .025 * wb.pass, weave.aim[1] + H * .05 - H * .015 * wb.pass];
    [s.elF, s.wrF] = reachArm(s.shF, gF, up, fore, 1);
    [s.elB, s.wrB] = reachArm(s.shB, gB, up, fore, 1);
  }
  // Tools: both hands on the handle, the front at the grip, the back hand further down toward the end.
  const tool = toolAt(spec.actions ?? [], frame);
  if (tool) {
    const g: Pt = [tool.grip[0] * H, tool.grip[1] * H], u: Pt = [Math.cos(tool.a * DEG), Math.sin(tool.a * DEG)], up = H * .165, fore = H * .15;
    [s.elF, s.wrF] = reachArm(s.shF, lerp2(s.wrF, g, tool.w), up, fore, 1);
    [s.elB, s.wrB] = reachArm(s.shB, lerp2(s.wrB, [g[0] - u[0] * H * .1, g[1] - u[1] * H * .1], tool.w), up, fore, 1);
  }
  const wash = (spec.actions ?? []).find(a => a.type === "wash" && a.aim && frame >= a.start && frame <= a.end);
  if (wash?.aim) {
    const sc = Math.sin((frame - wash.start) / 5) * H * .035, up = H * .165, fore = H * .15;
    [s.elF, s.wrF] = reachArm(s.shF, [wash.aim[0] + sc, wash.aim[1]], up, fore, 1);
    [s.elB, s.wrB] = reachArm(s.shB, [wash.aim[0] - H * .04 + sc * .8, wash.aim[1] + H * .005], up, fore, 1);
  }
  // Archery: the bow hand out toward the aim, the string hand drawn from the bow back to the ear, flung back on release.
  const shot = look.prop === "yumi" ? shootAt(spec.actions ?? [], frame, H) : undefined;
  let bowDir: Pt = [1, 0];
  if (shot) {
    const up = H * .165, fore = H * .15, d = [shot.aim[0] - s.shF[0], shot.aim[1] - s.shF[1]], dl = Math.hypot(d[0], d[1]) || 1;
    bowDir = [d[0] / dl, d[1] / dl];
    const bowHand: Pt = [s.shF[0] + bowDir[0] * H * .3, s.shF[1] + bowDir[1] * H * .3], ear: Pt = add(s.head, [-H * .01, H * .03]);
    const k = shot.raise, string: Pt = shot.released ? add(ear, [-H * .06 * k, -H * .02 * k]) : lerp2(add(bowHand, [-bowDir[0] * H * .04, -bowDir[1] * H * .04]), ear, shot.draw);
    [s.elF, s.wrF] = reachArm(s.shF, lerp2(s.wrF, bowHand, k), up, fore, 1);
    [s.elB, s.wrB] = reachArm(s.shB, lerp2(s.wrB, string, k), up, fore, -1);
  }
  if (look.prop === "naginata") {
    const u: Pt = [Math.cos(-55 * DEG), Math.sin(-55 * DEG)];
    [s.elB, s.wrB] = reachArm(s.shB, [s.wrF[0] - u[0] * H * .3, s.wrF[1] - u[1] * H * .3], H * .165, H * .15, 1);
  }
  const { dir, squeeze } = facingAt(spec, frame);
  const tr = travelAt(spec.actions ?? [], frame);
  // Wind in the figure's own frame: blowing toward its back raises sleeves behind it.
  const wl = wind * dir;
  const lw = lineW(H), out: Prim[] = [];
  const robe = look.robe ?? "ai", under = look.under ?? "beni", coat = look.coat, uchi = look.uchikake, sleeveC = uchi ?? coat ?? robe;
  const sleevePattern = uchi ? look.uchikakePattern : coat ? look.coatPattern : look.robePattern;
  const sleeveDepth = H * (look.sleeves === "long" || uchi ? .34 : .17), sleeveW = H * (uchi ? .15 : .13);
  // Courtesan dress: tall clogs lift the whole figure (drawn at the end), kasane layers, the over-robe and its lining.
  const gh = look.feet === "koma-geta" ? H * KOMA_GETA_HEIGHT : look.feet === "okobo" ? H * OKOBO_HEIGHT : 0, layers = look.layers ?? [], lining = look.lining ?? "beni";
  const lagF = clamp(((s.wrF[0] - sp.wrF[0]) * -1.4) + wl * -22, -55, 55), lagB = clamp(((s.wrB[0] - sp.wrB[0]) * -1.4) + wl * -22, -55, 55);
  const travelLag = clamp((tr.moving ? -1 : 0) * (tr.moving?.type === "run" ? 18 : 6), -30, 30);
  const k = H * (build === "child" ? .085 : look.face === "oni" ? .08 : .064) / 18, stout = build === "brute" ? 1.4 : build === "stout" ? 1.14 : build === "slim" ? .93 : 1;
  const legC = look.legs ?? look.skin ?? "hada", feet = look.feet ?? "waraji";
  const back = (c: UkiyoePaint): UkiyoePaint => c;

  // Back prop and back arm.
  const propLook = club ? { ...look, prop: "none" as const } : look;
  // The hagoromo streams behind the body, stretched out when flying.
  if (look.stole) out.push(...stole(s.shF, s.shB, H, look.stole, frame, tr.moving?.type === "fly" ? 1 : tr.moving ? .4 : .1, wl, lw, seed));
  out.push(...propPrims(propLook, pose, s, wl, frame, "back"));
  const bare = look.upper === "bare", skin = look.skin ?? "hada";
  const bareArm = (sh: Pt, el: Pt, wr: Pt, isBack: boolean): Prim[] => {
    const a: Prim[] = [{ t: "fill", d: carvedLine([sh, el, wr], H * .085 * stout, { taper: "end", minRatio: .55, smooth: true }), fill: skin, outline: lw }];
    a.push({ t: "fill", d: hand(wr, el, H * (build === "brute" ? 1.5 : 1.1)), fill: skin, outline: lw * .8 });
    a.push({ t: "line", d: carvedLine(quad(add(sh, [H * .01, H * .02]), add(el, [H * .015, -H * .01]), add(el, [0, H * .02]), 6), lw * .8, { taper: "both" }), color: "sumi", opacity: .45 });
    if (isBack) a.push({ t: "fill", d: carvedLine([sh, el, wr], H * .085 * stout, { taper: "end", minRatio: .55, smooth: true }), fill: "sumi", opacity: .14, noPrint: true });
    return a;
  };
  if (bare) out.push(...bareArm(s.shB, s.elB, s.wrB, true));
  else {
    const bs = sleeve(s.shB, s.elB, s.wrB, sleeveDepth, sleeveW, -lagB * .6 - travelLag);
    if (bs.cuff !== s.wrB) out.push({ t: "fill", d: limb(bs.cuff, s.wrB, H * .016, H * .014), fill: skin, outline: lw * .8 });
    out.push({ t: "fill", d: hand(s.wrB, s.elB, H), fill: skin, outline: lw * .8 });
    out.push({ t: "fill", d: bs.d, fill: back(sleeveC), outline: lw, pattern: sleevePattern, grain: .2 });
    out.push({ t: "fill", d: bs.d, fill: "sumi", opacity: .12, noPrint: true });
  }

  // Legs below the hem (back first).
  const lower = look.lower ?? "robe";
  const legPrims = (kn: Pt, an: Pt, toe: Pt, isBack: boolean): Prim[] => {
    const p: Prim[] = [];
    const legW = H * .028 * stout;
    if (lower === "hakama") return p;
    if (lower === "loincloth") p.push({ t: "fill", d: carvedLine([s.hip, kn, an], legW * 3, { taper: "end", minRatio: .5, smooth: true }), fill: legC, outline: lw * .9 });
    else p.push({ t: "fill", d: limb(kn, an, legW, legW * .8), fill: legC, outline: lw * .9 });
    const sole: Pt = [toe[0] + H * .012, toe[1]];
    if (feet === "okobo") p.push(...okoboSide([an[0] - H * .032, an[1] - H * .003], [toe[0] + H * .014, toe[1] - H * .005], gh, lw * .9, isBack));
    if (feet === "koma-geta") p.push(...komaGetaSide([an[0] - H * .032, an[1] - H * .003], [toe[0] + H * .014, toe[1] - H * .005], gh, lw * .9, isBack));
    p.push({ t: "fill", d: smoothD([[an[0] - H * .025, an[1] - H * .01], [an[0] + H * .01, an[1] - H * .03], sole, [toe[0], toe[1] + H * .008], [an[0] - H * .03, an[1] + H * .01]], true, .35), fill: feet === "tabi" ? "gofun" : legC, outline: lw * .9 });
    if (feet === "geta") p.push({ t: "fill", d: polyD([[an[0] - H * .04, an[1] + H * .012], [sole[0] + H * .01, toe[1] + H * .01], [sole[0] + H * .01, toe[1] + H * .03], [an[0] - H * .04, an[1] + H * .032]]), fill: "cha", outline: lw * .8 });
    if (feet === "waraji") p.push({ t: "line", d: carvedLine([[an[0] - H * .035, an[1] + H * .012], [sole[0] + H * .005, toe[1] + H * .01]], H * .012, { taper: "none" }), color: "kincha" });
    if (isBack) p.push({ t: "fill", d: limb(kn, an, legW, legW * .8), fill: "sumi", opacity: .1, noPrint: true });
    return p;
  };
  if (pose.kneel < .5) out.push(...legPrims(s.knB, s.anB, s.toeB, true));
  if (lower !== "hakama" && pose.kneel < .5) out.push(...legPrims(s.knF, s.anF, s.toeF, false));

  // Robe skirt.
  const hemY = lower === "loincloth" ? lerp(s.hip[1], Math.max(s.knF[1], s.knB[1]), .5) : lower === "tucked" ? Math.max(s.knF[1], s.knB[1]) + H * .02 : gh ? gh * .45 : Math.max(s.anF[1], s.anB[1]) - H * .035;
  const frontX = Math.max(s.knF[0], s.anF[0], s.knB[0], s.anB[0]), backX = Math.min(s.knF[0], s.anF[0], s.knB[0], s.anB[0]);
  const hemSway = Math.sin(frame / 7) * H * .006 * (tr.moving ? 1 : .2) - wl * H * .025;
  const trailing = lower === "robe" && (look.hair === "shimada" || look.hair === "long" || look.hair === "hyogo" || look.sleeves === "long" || !!uchi);
  const hemF: Pt = [frontX + H * (trailing ? .06 : .05) * stout - hemSway * .5, hemY - H * .004], hemB: Pt = [backX - H * (trailing ? .12 : .07) * stout + hemSway, trailing ? gh : hemY + H * .006];
  if (lower === "hakama") {
    for (const [kn, an, isBack] of [[s.knB, s.anB, true], [s.knF, s.anF, false]] as const) {
      const hc = look.hakama ?? "usuzumi", d = smoothD([s.waistB, add(kn, [-H * .06, 0]), add(an, [-H * .075, H * .02]), add(an, [H * .07, H * .02]), add(kn, [H * .055, 0]), s.waistF], true, .3);
      out.push({ t: "fill", d, fill: hc, outline: lw, grain: .3 });
      out.push({ t: "stroke", d: `M${s.hip[0]} ${s.hip[1]}L${an[0] - H * .02} ${an[1]}M${s.hip[0] + H * .02} ${s.hip[1]}L${an[0] + H * .03} ${an[1]}`, color: "sumi", width: lw * .7, opacity: .5 });
      if (isBack) out.push({ t: "fill", d, fill: "sumi", opacity: .1, noPrint: true });
      out.push({ t: "fill", d: smoothD([add(an, [-H * .02, -H * .01]), add(an, [H * .06, H * .0]), add(an, [H * .065, H * .02]), add(an, [-H * .03, H * .02])], true, .3), fill: feet === "tabi" ? "gofun" : legC, outline: lw * .8 });
    }
  } else {
    const kneel = pose.kneel;
    const skirt: Pt[] = kneel > .5
      ? [s.waistF, [s.waistF[0] + H * .12, s.waistF[1] + H * .06], [H * .24, -H * .045], [H * .25, 0], [-H * .14, 0], [-H * .15, -H * .05], [s.waistB[0] - H * .05, s.waistB[1] + H * .06], s.waistB]
      : [s.waistF, [lerp(s.waistF[0], hemF[0], .55) + H * .02, lerp(s.waistF[1], hemF[1], .5)], hemF, [lerp(hemF[0], hemB[0], .5), hemY + H * .012], hemB,
        [s.waistB[0] - H * .045 * stout, lerp(s.waistB[1], hemB[1], .4)], s.waistB];
    const skirtD = smoothD(skirt, true, .3);
    // The parted front: under-robe shows between the legs when the stride opens.
    const open = clamp01((s.knF[0] - s.knB[0]) / (H * .2)) * (lower === "robe" ? 1 : .4) * (1 - kneel);
    out.push({ t: "fill", d: skirtD, fill: robe, outline: lw, pattern: look.robePattern, grain: .25 });
    // Three-quarter: the front panel's edge (okumi) runs down from the obi to the hem, a sliver of the under-robe beside it.
    if (look.view === "three-quarter" && look.face !== "oni" && kneel < .5) {
      const top: Pt = [lerp(s.waistB[0], s.waistF[0], .62), lerp(s.waistB[1], s.waistF[1], .62) + H * .03], bot: Pt = [lerp(hemB[0], hemF[0], .72), hemY - H * .004];
      out.push({ t: "line", d: carvedLine([top, lerp2(top, bot, .5), bot], H * .012, { taper: "start", minRatio: .3 }), color: under, opacity: .9 });
      out.push({ t: "line", d: carvedLine([add(top, [-H * .006, 0]), add(lerp2(top, bot, .5), [-H * .006, 0]), add(bot, [-H * .006, 0])], lw * .9, { taper: "start", minRatio: .3 }), color: "sumi", opacity: .6 });
    }
    if (open > .15) {
      const tipX = lerp(hemF[0], s.knF[0], .5);
      out.push({ t: "fill", d: polyD([[s.waistF[0] - H * .005, s.waistF[1] + H * .03], [hemF[0] - H * .005, hemF[1]], [tipX - H * .05 * open, hemY + H * .01]]), fill: under, outline: lw * .8 });
    }
    // Layered hem: a band of the under-robe along the bottom edge, as in bijin-ga.
    if (trailing && kneel < .5 && layers.length) out.push(...kasane([hemF, [lerp(hemF[0], hemB[0], .45), hemY + H * .01], hemB], layers, H * .013, [0, -H * .014], lw * .6));
    else if (trailing && kneel < .5) {
      const band: Pt[] = [hemF, [lerp(hemF[0], hemB[0], .5), hemY + H * .012], hemB];
      out.push({ t: "line", d: carvedLine(band, H * .022, { taper: "swell" }), color: under });
      out.push({ t: "line", d: carvedLine(band.map(q => [q[0], q[1] - H * .012] as Pt), lw * .8, { taper: "none" }), color: "sumi", opacity: .6 });
    }
    // Fold lines falling from the obi.
    const folds = kneel > .5 ? [[.2, .5]] : [[.25, .35], [.6, .7], [.85, .9]];
    for (const [u, v] of folds) {
      const top: Pt = [lerp(s.waistF[0], s.waistB[0], u), lerp(s.waistF[1], s.waistB[1], u) + H * .03];
      const bot: Pt = kneel > .5 ? [lerp(H * .2, -H * .1, v), -H * .03] : [lerp(hemF[0], hemB[0], v), hemY - H * .02];
      out.push({ t: "line", d: carvedLine(quad(top, [lerp(top[0], bot[0], .5) + H * .015, lerp(top[1], bot[1], .5)], bot, 8), lw * 1.1, { taper: "both", seed: seed + Math.round(u * 10) }), color: "sumi", opacity: .45 });
    }
  }

  // Torso (jacket or robe), obi, collar. A three-quarter figure (look.view) turns its torso toward the viewer, as the
  // prints draw it while the limbs stay in profile: a broader chest with the far shoulder showing, the crossed collar
  // seen from the front as a V (left over right), and the robe's front panel running down from it.
  const tqBody = look.view === "three-quarter" && !bare && look.face !== "oni";
  const nb = add(s.neck, [-H * (tqBody ? .045 : .035), H * .006]), nf = add(s.neck, [H * (tqBody ? .03 : .02), H * .012]);
  const chestF = add(s.shF, [H * (tqBody ? .055 : .045) * stout, H * .06]), backTop = add(s.shB, [-H * (tqBody ? .07 : .055) * stout, H * (tqBody ? .012 : .03)]);
  const brute = build === "brute";
  if (uchi) {
    // The uchikake hangs open from the shoulders: down the back, out over the ground in a padded trailing hem, forward
    // under the feet to its front edge, which falls from the breast past the obi, the robe showing in front of it.
    const kneel = pose.kneel, gy = gh, motifC = look.motif ?? "kin";
    // In front the hem is kicked up by the step, so the clogs show beneath it.
    const frontHem: Pt = kneel > .5 ? [H * .3, gy] : [Math.max(s.anF[0], s.anB[0]) + H * .025 - hemSway * .4, gy * .3 - H * .004];
    const trail: Pt = kneel > .5 ? [-H * .32, gy] : [Math.min(s.anF[0], s.anB[0]) - H * .3 + hemSway * 1.4, gy];
    const mid: Pt = [lerp(trail[0], frontHem[0], .45), gy + H * .006];
    const edge: Pt = [lerp(s.waistF[0], frontHem[0], .5) + H * .01, lerp(s.waistF[1], gy, .55)];
    const shape: Pt[] = [nb, backTop, [s.waistB[0] - H * .07, s.waistB[1] + H * .03], [s.waistB[0] - H * .12 + hemSway * .5, lerp(s.waistB[1], gy, .6)],
      [trail[0] + H * .06, gy - H * .03], trail, mid, frontHem, edge, [s.waistF[0] + H * .012, s.waistF[1] + H * .05], add(chestF, [-H * .006, H * .02]), nf];
    const uD = smoothD(shape, true, .3);
    out.push({ t: "fill", d: uD, fill: uchi, outline: lw, pattern: look.uchikakePattern, grain: .25 });
    if (motifC !== "none") out.push(roundels(uD, { x0: trail[0], y0: s.neck[1], x1: frontHem[0], y1: gy }, H * .06, motifC, lw * .7, [[.25, .45], [.62, .3], [.5, .7], [.15, .82], [.82, .62]]));
    // Folds falling from the shoulder to the hem.
    for (const u of [.3, .55, .75]) out.push({ t: "line", d: carvedLine(quad(lerp2(backTop, s.waistB, u), lerp2(lerp2(s.waistB, edge, u), mid, .4), lerp2(trail, frontHem, u * .8 + .1), 8), lw, { taper: "both", seed: seed + Math.round(u * 20) }), color: "sumi", opacity: .35 });
    // The lining along the front edge, then the padded hem rolling round the bottom and up the front a little.
    out.push({ t: "line", d: carvedLine([add(chestF, [-H * .012, H * .04]), [s.waistF[0] + H * .002, s.waistF[1] + H * .05], add(edge, [-H * .01, 0]), add(frontHem, [-H * .012, -H * .04])], H * .012, { taper: "start", minRatio: .4, smooth: true }), color: lining });
    out.push(...fuki([[trail[0] + H * .02, gy - H * .012], mid, [frontHem[0] - H * .004, gy - H * .01], [frontHem[0] - H * .012, gy - H * .07]], H * .032, lining, lw));
  }
  const torsoD = smoothD(brute
    ? [nb, nf, add(chestF, [H * .02, 0]), add(s.waistF, [H * .075, -H * .07]), add(s.waistF, [H * .05, H * .03]), [s.waistB[0] - H * .02, s.waistB[1] + H * .02], add(backTop, [-H * .02, 0])]
    : [nb, nf, chestF, [s.waistF[0] + H * .01, s.waistF[1] + H * .02], [s.waistB[0] - H * .01, s.waistB[1] + H * .02], backTop], true, .3);
  if (bare) {
    out.push({ t: "fill", d: torsoD, fill: skin, outline: lw });
    out.push({ t: "line", d: carvedLine(quad(add(chestF, [-H * .01, -H * .02]), add(chestF, [H * .012, H * .03]), add(chestF, [-H * .04, H * .055]), 6), lw * 1.1, { taper: "both" }), color: "sumi", opacity: .55 });
    out.push({ t: "line", d: carvedLine(quad(add(s.waistF, [-H * .005, -H * .07]), add(s.waistF, [H * .015, -H * .04]), add(s.waistF, [-H * .01, -H * .01]), 6), lw, { taper: "both" }), color: "sumi", opacity: .45 });
  } else {
    out.push({ t: "fill", d: torsoD, fill: uchi ?? robe, outline: lw, pattern: uchi ? look.uchikakePattern : look.robePattern, grain: .25 });
    if (tqBody) {
      // The far shoulder's seam, where the back of the robe turns away.
      out.push({ t: "line", d: carvedLine(quad(add(backTop, [H * .012, H * .01]), add(backTop, [H * .008, H * .06]), add(s.waistB, [H * .018, -H * .02]), 6), lw * .8, { taper: "both" }), color: "sumi", opacity: .35 });
    } else if (layers.length) {
      // Kasane at the collar: each under-robe's edge a band beside the last.
      const collar: Pt[] = [add(s.neck, [-H * .01, H * .004]), add(s.neck, [H * .022, H * .04]), [s.waistF[0] - H * .012, s.waistF[1] - H * .02]];
      out.push(...kasane(collar, [...layers].reverse(), H * .011, [-H * .009, H * .002], lw * .6));
    } else {
      out.push({ t: "line", d: carvedLine([add(s.neck, [-H * .01, H * .004]), add(s.neck, [H * .022, H * .04]), [s.waistF[0] - H * .012, s.waistF[1] - H * .02]], H * .014, { taper: "end" }), color: under });
      out.push({ t: "line", d: carvedLine([add(s.neck, [-H * .006, H * .008]), add(s.neck, [H * .018, H * .042]), [s.waistF[0] - H * .02, s.waistF[1] - H * .02]], lw * .9, { taper: "end" }), color: "sumi", opacity: .7 });
    }
  }
  // The great armour over the robe: the cuirass and skirt plates now, the near shoulder board after the arm.
  const armorParts = look.armor && !bare ? oyoroiSide({ neck: s.neck, shF: s.shF, shB: s.shB, elF: s.elF, waistF: s.waistF, waistB: s.waistB, knF: s.knF, knB: s.knB }, H, lw, look.armor) : undefined;
  if (armorParts) out.push(...armorParts.body);
  // Kamishimo: the kataginu's stiff wings stand out past both shoulders; its front panels run down into the hakama.
  let kataginuWing: Prim | undefined;
  if (look.kataginu && !bare) {
    const kc = look.kataginu, fw = add(s.shF, [H * .105 * stout, -H * .016]), bw = add(s.shB, [-H * .11 * stout, -H * .012]);
    const shape: Pt[] = [nb, bw, add(bw, [H * .012, H * .028]), add(backTop, [H * .004, H * .05]), add(s.waistB, [-H * .004, -H * .012]), add(s.waistF, [H * .002, -H * .014]),
      add(chestF, [-H * .004, H * .03]), add(fw, [-H * .014, H * .03]), fw, add(s.neck, [H * .008, H * .022])];
    out.push({ t: "fill", d: smoothD(shape, true, .1), fill: kc, outline: lw, grain: .3 });
    out.push({ t: "stroke", d: [.3, .55, .78].map(f => { const a = lerp2(bw, fw, f), b = lerp2(s.waistB, s.waistF, f); return `M${a[0].toFixed(1)} ${(a[1] + H * .035).toFixed(1)}L${b[0].toFixed(1)} ${(b[1] - H * .02).toFixed(1)}`; }).join(""), color: "sumi", width: lw * .7, opacity: .35 });
    const crestC = look.crest ?? kc;
    out.push(...mon(add(s.shF, [H * .022, H * .062]), H * .018, lw, crestC), ...mon(add(backTop, [H * .016, H * .035]), H * .016, lw, crestC));
    // The near wing stands over the top of the sleeve, so it is drawn again after the front arm.
    kataginuWing = { t: "fill", d: smoothD([add(s.neck, [H * .012, H * .01]), fw, add(fw, [-H * .02, H * .04]), add(s.shF, [-H * .03, H * .045]), add(s.shF, [-H * .035, H * .015])], true, .08), fill: kc, outline: lw, grain: .3 };
  }
  if (coat) {
    const hemCoat: Pt = [lerp(s.waistF[0], s.knF[0], .55) + H * .03, lerp(s.waistF[1], s.knF[1], .55)], hemCoatB: Pt = [s.waistB[0] - H * .05, hemCoat[1] + H * .01];
    out.push({ t: "fill", d: smoothD([nb, add(s.neck, [H * .01, H * .02]), add(chestF, [H * .005, H * .02]), hemCoat, hemCoatB, backTop], true, .3), fill: coat, outline: lw, pattern: look.coatPattern, grain: .25 });
  }
  const obiH = H * (look.obiTie === "darari" ? .075 : .055), obiC = look.obi ?? (look.hair === "shimada" ? "kincha" : "kogecha");
  const wn = dirDown(90 - s.lean), up: Pt = [Math.sin(s.lean * DEG), -Math.cos(s.lean * DEG)];
  const o1 = add(s.waistB, [-wn[0] * H * .01, 0]), o2 = add(s.waistF, [wn[0] * H * .01, 0]);
  const maeObi = look.obiTie === "front";
  if (maeObi) out.push(...maeObiSide(s.waistF, s.waistB, H, lw, obiC, look.obiPattern ?? "kin", Math.sin(frame / 9) * (tr.moving ? 1 : .3) - wl * .6));
  else out.push({ t: "fill", d: polyD([add(o1, [up[0] * obiH * .5, up[1] * obiH * .5]), add(o2, [up[0] * obiH * .5, up[1] * obiH * .5]), add(o2, [-up[0] * obiH * .5, -up[1] * obiH * .5]), add(o1, [-up[0] * obiH * .5, -up[1] * obiH * .5])]), fill: obiC, outline: lw, grain: .3 });
  if (tqBody && !maeObi) {
    // Worn toward the viewer, the obi shows its cord (obijime) across the front.
    const c1 = lerp2(o1, o2, .15), c2 = lerp2(o1, o2, .95);
    out.push({ t: "line", d: carvedLine([c1, c2], H * .008, { taper: "none" }), color: look.accent ?? (obiC === "kincha" ? "beni" : "kincha") });
  }
  const darari = look.obiTie === "darari";
  if (darari) {
    // The long ends hang from the knot at the shoulder blades and swing out behind her when she moves or turns.
    const swing = H * ((tr.moving ? .035 : 0) + Math.sin(frame / 11 + seed) * (tr.moving ? .012 : .005)) + wl * H * .03 + Math.abs(lagF) * H * .0006;
    out.push(...darariSide(add(s.waistB, [-H * .008, -H * .035]), hemY - H * .03, H, lw, obiC, look.obiPattern ?? "kin", swing, tqBody));
  }
  if ((look.hair === "shimada" || look.hair === "long") && !maeObi && !darari) {
    // Taiko knot: a big folded box at the back.
    const kb = add(s.waistB, [-H * .02, -H * .01]);
    out.push({ t: "fill", d: smoothD([add(kb, [H * .01, -H * .075]), add(kb, [-H * .055, -H * .08]), add(kb, [-H * .065, H * .025]), add(kb, [H * .005, H * .03])], true, .2), fill: obiC, outline: lw, pattern: { type: "kikko", color: "kin", scale: .25, opacity: .6 } });
  }

  if (look.prop === "yumi") {
    // The bow in the bow hand, its string to the drawing hand; the arrow nocked while drawing, then in flight to the aim.
    const nock: Pt = shot && !shot.released && shot.raise > .05 ? s.wrB : add(s.wrF, [-bowDir[0] * H * .1, -bowDir[1] * H * .1]);
    out.push(...yumi(s.wrF, nock, bowDir, H, lw, shot && !shot.released ? shot.draw : 0));
    if (shot && !shot.released && shot.raise > .3) out.push(...arrow(s.wrB, bowDir, H, lw));
    if (shot && shot.released) {
      const ad = [shot.aim[0] - s.wrF[0], shot.aim[1] - s.wrF[1]], al = Math.hypot(ad[0], ad[1]) || 1, u: Pt = [ad[0] / al, ad[1] / al];
      const start: Pt = add(s.wrF, [-u[0] * H * .3, -u[1] * H * .3]), endTail: Pt = [shot.aim[0] - u[0] * H * .42, shot.aim[1] - u[1] * H * .42];
      out.push(...arrow(lerp2(start, endTail, shot.flight), u, H, lw));
    }
  }
  if (tool && tool.w > .05) {
    out.push(...drawTool(tool.tool, [tool.grip[0] * H, tool.grip[1] * H], tool.a, H, lw));
    out.push(...strikeBits(tool.action, toolContact(tool.action, H), tool.since, H, seed + Math.floor(frame / 40)));
  }
  if (club && clubG && club.dropped < 1) {
    if (clubP && Math.abs(((clubG.a - clubP.a) % 360 + 540) % 360 - 180) > 10) out.push(...swordSmear(clubG.grip, clubP.a, clubG.a, H * CLUB / BLADE));
    out.push(...kanabo(clubG.grip, clubG.a, H, lw));
  }
  if (sword && geo) {
    // The scabbards through the obi at the left hip: the wakizashi above with its hilt, the katana's below.
    const sway = Math.sin(frame / 13) * (tr.moving ? .6 : .2) - wl * .5;
    if (look.swords === "daisho") {
      const kw = add(geo.koi, [H * .016, -H * .02]), aw = lerp(geo.sayaA + 9, 108, pose.fall);
      out.push(...saya(kw, aw, BLADE * H * .72, H, lw, look.accent ?? "ai", sway));
      out.push(...katana(add(kw, [Math.cos((aw - 180) * DEG) * H * .01, Math.sin((aw - 180) * DEG) * H * .01]), aw, H, lw, { hiltOnly: true, scale: .72, open: tqBody ? .5 : 0 }));
    }
    // Falling on his back the scabbards swing round to lie along his body, not stab into the ground.
    out.push(...saya(geo.koi, lerp(geo.sayaA, 100, pose.fall), BLADE * H * 1.03, H, lw, look.accent ?? "ai", sway));
    if (geoPrev && sword.free > .9 && swordPrev!.free > .9) out.push(...swordSmear(geo.tsuba, geoPrev.a, geo.a, H));
    out.push(...katana(geo.tsuba, geo.a, H, lw, { shown: geo.shown, hiltOnly: geo.shown < .01, open: tqBody ? .5 : 0 }));
  }

  // Head, tilted about the neck.
  const tilt = pose.tilt + s.lean * .4;
  const headFlip = pose.headBack > .5 ? -1 : 1;
  // Profile or three-quarter: the head narrows as it swings round and the drawing changes at the midpoint.
  const view = look.face === "oni" ? 0 : clamp01((look.view === "three-quarter" ? 1 : 0) + pose.faceView * (look.view === "three-quarter" ? -1 : 1));
  const swing = view > 0 && view < 1 ? Math.max(.62, Math.abs(Math.cos(Math.PI * view))) : 1;
  if (look.beads) out.push(...magatama(add(s.neck, [H * .005, H * .03]), H, lw));
  out.push({ t: "group", transform: `translate(${s.head[0].toFixed(2)} ${s.head[1].toFixed(2)}) rotate(${(tilt * headFlip).toFixed(2)}) scale(${(headFlip * swing).toFixed(3)} 1)`, prims: headPrims(look, pose, k, H, wl * headFlip, frame, seed, view >= .5) });

  // Front arm, sleeve and hand-held prop.
  out.push(...propPrims(propLook, pose, s, wl, frame, "front"));
  if (bare) out.push(...bareArm(s.shF, s.elF, s.wrF, false));
  else {
    const fs = sleeve(s.shF, s.elF, s.wrF, sleeveDepth, sleeveW, -lagF * .6 - travelLag);
    if (fs.cuff !== s.wrF) out.push({ t: "fill", d: limb(fs.cuff, s.wrF, H * .016, H * .014), fill: skin, outline: lw * .8 });
    out.push({ t: "fill", d: hand(s.wrF, s.elF, H), fill: skin, outline: lw * .8 });
    out.push({ t: "fill", d: fs.d, fill: sleeveC, outline: lw, pattern: sleevePattern, grain: .25 });
    if (uchi) out.push(...fuki(quad(add(fs.cuff, [-H * .02, sleeveDepth * .82]), add(fs.cuff, [H * .01, sleeveDepth * .95]), add(fs.cuff, [H * .05, sleeveDepth * .8]), 5), H * .018, lining, lw * .8));
    out.push({ t: "line", d: carvedLine(quad(add(s.shF, [0, H * .02]), add(s.elF, [H * .01, H * .03]), add(fs.cuff, [0, H * .05]), 6), lw * .9, { taper: "both" }), color: "sumi", opacity: .4 });
  }
  if (kataginuWing) out.push(kataginuWing);
  if (armorParts) out.push(...armorParts.sode);
  // Three-quarter: the breast stands in front of the near shoulder, so its panel and the crossed collar (a V, the
  // wearer's left edge over the right) are drawn over the top of the near sleeve.
  if (tqBody) {
    const top: Pt = add(s.neck, [H * .002, H * .012]), front: Pt = add(chestF, [-H * .004, H * .012]), low: Pt = add(s.shF, [H * .04 * stout, H * .14]);
    const inner: Pt = add(s.shF, [-H * .012, H * .06]), back2: Pt = add(s.neck, [-H * .028, H * .02]);
    const breast = smoothD([back2, top, add(lerp2(top, front, .5), [H * .006, -H * .004]), front, low, inner], true, .3);
    out.push({ t: "fill", d: breast, fill: uchi ?? coat ?? robe, pattern: uchi ? look.uchikakePattern : coat ? look.coatPattern : look.robePattern, grain: .25 });
    out.push({ t: "line", d: carvedLine([front, low, inner], lw, { taper: "both", minRatio: .3, smooth: true }), color: "sumi", opacity: .8 });
    const vPt: Pt = lerp2(low, front, .35), farEdge: Pt[] = [add(back2, [H * .006, -H * .002]), lerp2(back2, vPt, .5), vPt], nearEdge: Pt[] = [add(top, [H * .006, 0]), lerp2(top, vPt, .55), add(vPt, [-H * .004, H * .006])];
    for (const edge of [nearEdge, farEdge]) {
      if (layers.length) { out.push(...kasane(edge, [...layers].reverse(), H * .01, [H * .007, H * .004], lw * .6)); continue; }
      out.push({ t: "line", d: carvedLine(edge, H * .017, { taper: "end", minRatio: .35, smooth: true }), color: under });
      out.push({ t: "line", d: carvedLine(edge.map(q => add(q, [H * .007, H * .004])), lw * .9, { taper: "end", minRatio: .3 }), color: "sumi", opacity: .8 });
    }
  }
  out.push(...propPrims(propLook, pose, s, wl, frame, "over"));

  // Tall clogs: the drawing stands gh higher, the clogs reaching down to the ground.
  if (gh) out.push({ t: "group", transform: `translate(0 ${(-gh).toFixed(2)})`, prims: out.splice(0) });
  // A fall turns the whole drawing back about the heels.
  if (pose.fall > 0) out.push({ t: "group", transform: `rotate(${(-86 * pose.fall).toFixed(2)})`, prims: out.splice(0) });
  // On the ground, untouched by the fall: the cracks where the club struck, and the club once it is dropped.
  if (club) {
    // The crack opens where the club's head came down on the contact frame.
    for (const a of spec.actions ?? []) if (a.type === "smash" && a.contact !== undefined && frame >= a.contact) {
      const g = clubGeometry(clubAt(spec.actions ?? [], a.contact), skeleton(figurePose(spec, a.contact, seed, H), H, build).neck, H);
      out.push(...groundCrack([g.grip[0] + Math.cos(g.a * DEG) * CLUB * H, 0], H, frame - a.contact, seed + a.contact));
    }
    if (clubG && club.dropped >= 1) out.push(...kanabo(clubG.grip, clubG.a, H, lw));
  }
  // Contact shadow: a soft usuzumi smudge (the prints rarely cast shadows; this only grounds the feet).
  const lift = pose.lift;
  out.unshift({ t: "fill", d: ellipseD((s.anF[0] + s.anB[0]) / 2, 2, H * .16 * (1 - clamp01(lift / H * 3) * .5), H * .016), fill: "sumi", opacity: .1 * (1 - clamp01(lift / (H * .3))), noPrint: true });
  return { prims: out, x: tr.x, y: tr.y, dir, squeeze };
}

/**
 * Where a figure's katana is at a frame, in the figure's own frame (facing right, feet at the origin, unscaled): the
 * guard and the blade's angle. Undefined when the figure wears no swords. Used to check duel contact.
 */
export function figureSwordAt(spec: UkiyoeFigureSpec, frame: number, seed = 0): { tsuba: Pt; a: number; shown: number } | undefined {
  if (!spec.look.swords) return undefined;
  const H = figureHeight(spec.look), sk = skeleton(figurePose(spec, frame, seed, H), H, spec.look.build ?? "average");
  const g = swordGeometry(swordAt(spec.actions ?? [], frame), sk.neck, add(sk.waistF, [-H * .012, H * .022]), H);
  return { tsuba: g.tsuba, a: g.a, shown: g.shown };
}

/** Where an oni's club is at a frame (figure's own frame, facing right, unscaled): the grip and the angle. */
export function figureClubAt(spec: UkiyoeFigureSpec, frame: number, seed = 0): { grip: Pt; a: number; dropped: number } | undefined {
  if (spec.look.prop !== "kanabo" || !usesClub(spec.actions ?? [])) return undefined;
  const H = figureHeight(spec.look), sk = skeleton(figurePose(spec, frame, seed, H), H, spec.look.build ?? "average"), st = clubAt(spec.actions ?? [], frame);
  return { ...clubGeometry(st, sk.neck, H), dropped: st.dropped };
}

/** Ease export used by tests to keep the gait easing honest. */
export const _figureEase = ease;
