/**
 * Native ink marks for a two-performer scene. Source is original geometry and
 * existing neutral Kumiki painting studies, never a composited stock photo.
 * Separate background mountains, midground bamboo and foreground ground strokes
 * have stable identifiers, moisture and pressure rather than uniform scene grading.
 */
import { inkExampleSpec } from "./ink-wash-demo";
import type { InkStroke, InkWashSpec } from "../../registry/video/ink-wash";

type Aspect = "landscape" | "portrait";
export function inkEnsembleBackdrop(aspect: Aspect, absorption = .72, grain = .65): InkWashSpec {
  const distant = inkExampleSpec("landscape", aspect, 113);
  const bamboo = inkExampleSpec("bamboo", aspect, 23);
  const portrait = aspect === "portrait";
  const width = portrait ? 540 : 960, height = portrait ? 960 : 540;
  // Drop near-field pine, cracks, hard rock and the two independent seals.
  // The distant mountains are pale and must never read as a harsh competing
  // outline behind the actors' eyes or their interaction.
  const mountains = distant.strokes
    .filter(stroke => /^(?:remote-spine|wash-mass|remote-veil|middle-ridge|fog-wisp|crag-wash)/.test(stroke.id))
    .map((stroke): InkStroke => ({
      ...stroke, id: "scenic-" + stroke.id,
      tone: stroke.tone * .54,
      load: stroke.load * .65,
      startFrame: Math.max(0, stroke.startFrame - 34),
      water: Math.max(.78, stroke.water),
    }));
  // Keep bamboo as a pair of asymmetrical clusters on the sides rather
  // than a fence of dark straight stems obscuring the performers.
  const culms = portrait ? new Set([0, 4]) : new Set([0, 1, 4]);
  const sprays = portrait ? new Set([0, 8]) : new Set([0, 1, 7, 8]);
  const midground = bamboo.strokes.filter(stroke => {
    const stem = stroke.id.match(/^(?:culm|node)-(\d+)(?:-|$)/);
    if (stem) return culms.has(Number(stem[1]));
    const leaves = stroke.id.match(/^(?:twig|leaf)-(\d+)(?:-|$)/);
    if (leaves) return sprays.has(Number(leaves[1]));
    return false;
  }).map((stroke): InkStroke => ({
    ...stroke, id: "frame-" + stroke.id,
    // Keep the hero around a painted dark-value middle register. There
    // should be no visually accidental bar across mouths or hand gestures.
    tone: stroke.tone * (stroke.id.startsWith("leaf-") ? .82 : .66),
    load: stroke.load * .85,
    water: Math.min(1, stroke.water + .09),
  }));
  const short = Math.min(width, height);
  const g = (id:string, nodes:readonly (readonly [number,number,number])[],
    thickness:number,tone:number,water:number,startFrame:number,
    brush:"upright"|"oblique"="oblique"):InkStroke => ({
      id,points:nodes.map(([x,y,pressure]) => ({x:x*width,y:y*height,pressure})),
      width:thickness*short/540,tone,water,load:.77,brush,
      tipInk:brush==="oblique"?.62:.84,drag:water<.4?.75:.27,
      startFrame,drawFrames:27,spreadFrames:32,dryFrames:37,
    });
  // Wide, nearly translucent ground planes give the feet a material home.
  // Their varying width/pressure avoids a synthetic uniform horizontal stripe.
  const ground:InkStroke[] = portrait ? [
    g("ground-near-a",[[.02,.84,.02],[.19,.846,.21],[.40,.833,.34],[.56,.838,.2],[.95,.844,.02]],21,.23,.94,93),
    g("ground-near-b",[[.11,.868,.02],[.30,.872,.12],[.57,.858,.3],[.79,.865,.04]],12,.32,.75,116),
    g("ground-near-c",[[.14,.881,.02],[.31,.877,.25],[.55,.884,.10]],2.8,.43,.22,135,"upright"),
  ]:[
    g("ground-near-a",[[.02,.89,.03],[.19,.884,.3],[.38,.89,.52],[.57,.876,.30],[.98,.89,.02]],18,.24,.94,93),
    g("ground-near-b",[[.13,.904,.02],[.34,.9,.24],[.57,.91,.39],[.88,.904,.04]],11,.3,.78,115),
    g("ground-near-c",[[.19,.923,.02],[.43,.92,.32],[.67,.916,.24]],2.5,.43,.18,134,"upright"),
  ];
  // Small physical root and pebble marks along the edge of the ground plane.
  // Sparse endpoints and varied drag preserve the paper as the highlight.
  const accents:InkStroke[] = Array.from({length:portrait?18:25},(_,i) => {
    const x = .06 + (i * .6180339887 % .88);
    const y = (portrait?.852:.898) + ((i*7)%9)*.0035;
    const dx = .006 + (i%5)*.002;
    return g("ground-grain-"+i,[[x-dx,y+.004,.02],[x,y-.003,.52],[x+dx,y+.001,.015]],
      .9+(i%3)*.5,i%4===0?.64:.46,.13,140+(i%6)*4,"upright");
  });
  return {
    ...bamboo, seed:93, absorption, grain,
    paper:"#F4F0E5",
    strokes:[...mountains,...midground,...ground,...accents],
  };
}
