import { INK_TONES } from "../../registry/video/ink-wash";
import { makeInkRockTexture } from "../../registry/video/ink-wash-marks";
import type { InkPoint, InkStroke, InkWashSpec } from "../../registry/video/ink-wash";

export type InkSubject = "landscape" | "bamboo";
export type InkAspect = "landscape" | "portrait";
type Point = readonly [number, number, number];
type Builder = (id: string, pts: readonly Point[], width: number, tone: number, water: number,
  start: number, duration?: number, accent?: boolean) => void;

/**
 * Original neutral illustrations: the centerlines below are semantic ink brush marks,
 * not traced photographs or borrowed reference-video artwork.
 */
function createSubject(subject: InkSubject, aspect: InkAspect): InkStroke[] {
  const portrait = aspect === "portrait";
  const unit = 540; // Both proof aspect ratios have a 540px short side.
  // Local art plane sits below the exhibition heading, with a full intentional paper margin.
  const region = portrait
    ? { x: 45, y: 280, width: 455, height: 560 }
    : { x: 75, y: 155, width: 805, height: 330 };
  const strokes: InkStroke[] = [];
  const add: Builder = (id, pts, width, tone, water, start, duration = 18, accent = false) => {
    strokes.push({
      id, points: pts.map(([x, y, pressure]): InkPoint => ({
        x: region.x + x * region.width, y: region.y + y * region.height, pressure,
      })),
      width: width * unit / 540, tone, water, load: .88,
      // Broad diluted slopes and single-pull leaves are painted with the side of the brush;
      // dry crags drag across the fiber, leaving coherent bristle gaps.
      brush: (width > 38 && water > .6) || id.startsWith("leaf-") || id.startsWith("crag-")
        ? "oblique" : "upright",
      tipInk: id.startsWith("leaf-") ? .95 : (water > .75 ? .43 : .7),
      drag: id.includes("ledge") || id.includes("crag") ? .9 : (water < .3 ? .67 : .21),
      startFrame: start, drawFrames: duration, spreadFrames: 28, dryFrames: 44, accent,
    });
  };
  /** A handmade cinnabar seal: a small imperfect square impression, not a decorative ring. */
  const addSeal = (cx: number, cy: number, start: number) => {
    const rx = portrait ? .036 : .022, ry = portrait ? .032 : .05;
    add("seal-border", [[cx-rx,cy-ry,.36],[cx+rx,cy-ry,.64],[cx+rx,cy+ry,.35],
      [cx-rx,cy+ry,.68],[cx-rx,cy-ry,.37]],4.2,INK_TONES.dark,.14,start,24,true);
    add("seal-mark-a", [[cx-rx*.48,cy-ry*.58,.07],[cx-rx*.48,cy+ry*.52,.56]],
      4,INK_TONES.black,.17,start+6,9,true);
    add("seal-mark-b", [[cx-rx*.25,cy-ry*.13,.08],[cx+rx*.54,cy-ry*.13,.85],
      [cx+rx*.30,cy+ry*.48,.09]],3.3,INK_TONES.black,.16,start+9,12,true);
  };

  if (subject === "landscape") {
    // Atmospheric washes are layered from the distance forward. Each slope is a
    // side-brush gesture, not a row of equal-weight vector triangles.
    add("remote-spine-a", [[-.08,.55,.08],[.045,.52,.21],[.14,.38,.48],[.195,.35,.46],[.29,.48,.16],[.39,.47,.06]], 19, INK_TONES.pale, .98, 17, 37);
    add("remote-spine-b", [[.22,.56,.07],[.35,.44,.29],[.47,.28,.58],[.56,.41,.36],[.69,.50,.07]], 22, INK_TONES.pale, 1, 36, 41);
    add("remote-spine-c", [[.61,.57,.07],[.73,.45,.25],[.84,.36,.50],[.92,.44,.29],[1.08,.52,.06]], 18, INK_TONES.pale, .97, 54, 41);
    // Diluted broad side-brush washes supply the mountain *body* beneath the
    // ridgelines, so the forms are not merely dark ribbons. Each overlapping
    // patch has its own concentration and a different outward bleed.
    add("wash-mass-a1", [[.135,.39,.05],[.17,.51,.57],[.215,.60,.18]], 96, INK_TONES.whisper, 1, 42, 42);
    add("wash-mass-a2", [[.20,.43,.05],[.252,.53,.45],[.295,.59,.08]], 74, INK_TONES.whisper, .98, 49, 39);
    add("wash-mass-b1", [[.465,.32,.06],[.488,.46,.67],[.55,.59,.20]], 108, INK_TONES.whisper, 1, 58, 45);
    add("wash-mass-b2", [[.53,.42,.07],[.595,.53,.47],[.63,.60,.06]], 86, INK_TONES.whisper, .97, 66, 36);
    add("wash-mass-c1", [[.827,.41,.04],[.852,.51,.60],[.91,.62,.16]], 100, INK_TONES.whisper, 1, 72, 42);
    add("wash-mass-c2", [[.90,.46,.03],[.94,.55,.43],[.995,.60,.09]], 63, INK_TONES.whisper, .99, 78, 31);
    add("crag-wash-a", [[.19,.45,.05],[.233,.51,.23],[.275,.54,.01]], 8, INK_TONES.middle, .28, 99, 18);
    add("crag-wash-b", [[.47,.42,.08],[.52,.49,.26],[.555,.51,.015]], 7, INK_TONES.middle, .22, 110, 15);
    add("crag-wash-c", [[.84,.48,.04],[.89,.54,.31],[.92,.56,.02]], 6, INK_TONES.middle, .25, 114, 14);
    add("remote-veil-a", [[.18,.41,.18],[.22,.50,.29],[.31,.57,.08]], 61, INK_TONES.whisper, 1, 72, 25);
    add("remote-veil-b", [[.47,.36,.18],[.52,.46,.3],[.59,.56,.07]], 66, INK_TONES.whisper, .98, 78, 27);
    add("remote-veil-c", [[.81,.40,.15],[.86,.51,.36],[.95,.58,.06]], 46, INK_TONES.whisper, 1, 87, 22);
    // A shadowed mountain edge, fine ridges and mist are deliberately uneven.
    add("middle-ridge", [[-.07,.73,.08],[.12,.65,.28],[.27,.69,.41],[.37,.58,.18],[.52,.65,.14],[.72,.61,.29],[.91,.67,.22],[1.06,.63,.04]], 29, INK_TONES.pale, .95, 96, 35);
    add("middle-ridge-shadow", [[.33,.65,.07],[.45,.62,.42],[.54,.68,.35],[.68,.66,.06]], 25, INK_TONES.pale, .9, 105, 31);
    // Four almost invisible drift-marks: fog is not a repeating waveform.
    const fog: Array<[number,number,number]> = [[.08,.71,.06],[.34,.68,.04],[.61,.70,.05],[.89,.68,.07]];
    fog.forEach(([x,y,span],i) => add("fog-wisp-"+i,
      [[x,y,.02],[x+span*.5,y-.015,.20],[x+span,y-.005,.02]],
      9,INK_TONES.whisper,.92,116+i*5,14));
    // Dry-brush granite occupies the near lower-left; nested facets leave paper lights intact.
    add("near-ledge", [[-.09,.89,.08],[.02,.83,.38],[.12,.72,.93],[.22,.68,.76],[.29,.74,.18],[.35,.76,.04]],
      43, INK_TONES.dark, .22, 131, 36);
    add("ledge-bottom", [[-.09,.96,.14],[.05,.88,.44],[.18,.83,.62],[.27,.80,.12]],
      49, INK_TONES.middle, .63, 143, 30);
    add("ledge-face", [[.10,.74,.07],[.16,.81,.63],[.22,.84,.03]], 19, INK_TONES.dark, .18, 150, 16);
    add("ledge-crack", [[.20,.69,.08],[.23,.76,.75],[.25,.80,.1]], 7, INK_TONES.black, .16, 154, 11);
    add("ledge-fissure", [[.015,.84,.06],[.082,.80,.62],[.12,.79,.04]], 9, INK_TONES.black, .12, 160, 12);
    // Axe-cut gou/cun marks add rock grain; curving hemp lines and clustered dark
    // moss dents give the foreground a believable surface instead of one flat ribbon.
    strokes.push(...makeInkRockTexture({
      idPrefix:"rock-cun",seed:53,kind:"axe-cut",count:23,startFrame:151,angle:54,tone:.76,
      x:region.x+region.width*.045,y:region.y+region.height*.72,
      width:region.width*.19,height:region.height*.15,
    }),...makeInkRockTexture({
      idPrefix:"rock-hemp",seed:89,kind:"hemp-fiber",count:11,startFrame:164,angle:76,tone:.42,
      x:region.x+region.width*.06,y:region.y+region.height*.76,
      width:region.width*.16,height:region.height*.14,
    }),...makeInkRockTexture({
      idPrefix:"rock-moss",seed:101,kind:"moss-dot",count:15,startFrame:169,angle:34,tone:.92,
      x:region.x+region.width*.045,y:region.y+region.height*.69,
      width:region.width*.21,height:region.height*.12,
    }));
    // Twisted pine, asymmetrical boughs and many pressure-tapered needle gestures.
    add("pine-trunk", [[.18,.83,.82],[.205,.72,.93],[.217,.63,.64],[.255,.53,.86],[.248,.42,.23]], 21, INK_TONES.black, .19, 159, 38);
    add("pine-trunk-shade", [[.197,.79,.1],[.215,.67,.57],[.24,.56,.08]], 6, INK_TONES.dark, .11, 169, 17);
    add("pine-branch-right", [[.235,.61,.76],[.29,.55,.52],[.42,.52,.13]], 10, INK_TONES.dark, .23, 178, 18);
    add("pine-branch-left", [[.22,.68,.68],[.163,.61,.41],[.11,.58,.12]], 8, INK_TONES.black, .24, 183, 17);
    add("pine-branch-crown", [[.252,.51,.68],[.30,.45,.51],[.345,.43,.08]], 8, INK_TONES.black, .16, 188, 16);
    add("pine-crown-left", [[.249,.46,.37],[.19,.45,.11],[.15,.44,.04]], 5, INK_TONES.dark, .18, 190, 15);
    const clumps: Array<[number,number,number,number]> = [[.39,.518,.054,.027],[.125,.58,.055,.024],[.343,.428,.049,.023],[.176,.445,.047,.018],[.286,.50,.034,.017]];
    clumps.forEach(([x,y,rx,ry], ci) => {
      for (let j = 0; j < 11; j++) {
        const theta = j * 2.399963 + ci * .76, dx = Math.cos(theta) * rx, dy = Math.sin(theta) * ry;
        add("pine-needle-" + ci + "-" + j, [
          [x - dx*.69,y - dy*.62,.06],[x+dx*.17,y+dy*.15,.82],[x+dx,y+dy,.025],
        ], 3.5 + j%3, j%4===1?INK_TONES.middle:INK_TONES.black,.13, 195+ci*4+j%3*2, 6);
      }
    });
    // Sparse near-shore water, with broken horizontal ink pulled by a fast wrist.
    for (let i = 0; i < 11; i++) {
      const y = .78 + (i%6)*.029, x = .39+(i*13%26)*.012;
      add("water-trace-" + i, [[x,y,.02],[x+.06,y-.004,.33],[x+.15+i%3*.018,y+.004,.015]],
        1.5+i%3, i%4===0?INK_TONES.middle:INK_TONES.pale,.24, 220+i*2, 9);
    }
    addSeal(.82,.22,245);
  } else {
    // A woodland is not five repeated symbols. Each culm has its own stance,
    // taper, ink density, height and internode spacing; clusters are asymmetrical.
    add("distance-mist", [[-.05,.79,.07],[.13,.72,.19],[.29,.75,.11],[.47,.70,.24],[.65,.74,.08]], 42, INK_TONES.whisper, .98, 16, 38);
    add("distance-hill", [[.43,.82,.06],[.59,.70,.22],[.76,.73,.29],[.91,.66,.18],[1.07,.67,.06]], 39, INK_TONES.whisper, .97, 34, 40);
    const culms: Array<{ x:number; bottom:number; top:number; lean:number; w:number; tone:number; wet:number }> = [
      {x:.12,bottom:1.02,top:.30,lean:.07,w:9,tone:INK_TONES.pale,wet:.69},
      {x:.29,bottom:1.04,top:.095,lean:-.045,w:15,tone:INK_TONES.black,wet:.19},
      {x:.50,bottom:1.03,top:.25,lean:.07,w:9,tone:INK_TONES.middle,wet:.57},
      {x:.66,bottom:1.03,top:.035,lean:.105,w:14,tone:INK_TONES.black,wet:.24},
      {x:.87,bottom:1.01,top:.33,lean:-.058,w:7,tone:INK_TONES.pale,wet:.66},
    ];
    culms.forEach((c, i) => {
      const at = (y: number) => c.x + c.lean * (c.bottom-y)/(c.bottom-c.top);
      add("culm-" + i, [[c.x,c.bottom,.74],[at(.75),.75,.92],[at(.53),.53,.72],[at(c.top),c.top,.16]],
        c.w,c.tone,c.wet,56+i*11,36);
      const totalNodes = i%2===0?4:6;
      for(let n=0;n<totalNodes;n++){
        const y=c.bottom-.15-n*(i%2===0?.15:.126);
        if(y<c.top+.04)continue;
        const x=at(y);
        add("node-" + i + "-" + n, [[x-.009,y+.003,.08],[x,y,.71],[x+.012,y-.006,.04]],
          2.7,c.tone,.19,96+i*8+n*5,6);
      }
    });
    // Branches hold distinct, hand-composed sprays, no bilateral X-shapes.
    const sprays: Array<{x:number;y:number;dir:number;span:number;count:number;at:number;shade:number}>=[
      {x:.31,y:.67,dir:-1,span:.155,count:5,at:135,shade:INK_TONES.dark},
      {x:.29,y:.47,dir:1,span:.21,count:6,at:150,shade:INK_TONES.black},
      {x:.27,y:.26,dir:-1,span:.16,count:4,at:166,shade:INK_TONES.dark},
      {x:.72,y:.62,dir:1,span:.20,count:5,at:149,shade:INK_TONES.black},
      {x:.74,y:.38,dir:-1,span:.23,count:6,at:169,shade:INK_TONES.black},
      {x:.765,y:.17,dir:1,span:.15,count:5,at:187,shade:INK_TONES.dark},
      {x:.55,y:.52,dir:1,span:.12,count:4,at:165,shade:INK_TONES.middle},
      {x:.17,y:.44,dir:-1,span:.13,count:3,at:175,shade:INK_TONES.pale},
      {x:.84,y:.44,dir:1,span:.14,count:4,at:188,shade:INK_TONES.pale},
      {x:.52,y:.31,dir:-1,span:.09,count:3,at:196,shade:INK_TONES.middle},
    ];
    sprays.forEach((spray, i) => {
      const bx=spray.x+spray.dir*spray.span*.65, by=spray.y-.037;
      add("twig-"+i, [[spray.x,spray.y,.35],[spray.x+spray.dir*spray.span*.43,spray.y-.03,.73],
        [bx,by,.03]], 3.2,spray.shade,.13,spray.at,13);
      for(let j=0;j<spray.count;j++){
        const fraction=j/Math.max(1,spray.count-1);
        const originX=spray.x+spray.dir*(.025+fraction*spray.span*.57);
        const originY=spray.y-.018-fraction*.025;
        const fan=((j%2===0)?-1:1)*(0.045+(j%3)*.02);
        const length=.055+(i*3+j*7)%6*.011;
        const tipX=originX+spray.dir*(length+fraction*.021);
        const tipY=originY+fan-(j%3)*.013;
        add("leaf-"+i+"-"+j, [
          [originX,originY,.04],
          [originX+(tipX-originX)*.46,originY+(tipY-originY)*.36,.97],
          [tipX,tipY,.012],
        ], 9+(j%4)*2, j%5===0?INK_TONES.middle:spray.shade,
        j%3===0?.43:.16, spray.at+8+j*3, 10);
      }
    });
    // Fine root traces and a single ember-red seal give the gaze a place to rest.
    add("ground-wash", [[-.07,.97,.05],[.15,.94,.19],[.39,.96,.31],[.61,.95,.12]], 21, INK_TONES.whisper,.90,226,24);
    add("ground-mark", [[.26,.965,.1],[.34,.95,.35],[.40,.958,.07]], 3, INK_TONES.pale,.25,240,12);
    addSeal(.84,.20,255);
  }
  return strokes;
}

export function inkExampleSpec(subject: InkSubject, aspect: InkAspect, seed = 47): InkWashSpec {
  return {
    version: 1, width: aspect === "portrait" ? 540 : 960, height: aspect === "portrait" ? 960 : 540,
    paper: "#F4F0E5", ink: "#222621", accent: "#AA453D", seed,
    absorption: .69, grain: .6,
    strokes: createSubject(subject, aspect),
  };
}

/** Reserved caption space. No text is painted into the actual pigment geometry. */
export const INK_READING_ZONE = {
  landscape: { x: 65, y: 30, width: 790, height: 114 },
  portrait: { x: 45, y: 58, width: 450, height: 200 },
} as const;
