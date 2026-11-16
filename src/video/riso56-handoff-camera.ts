/**
 * RISO56 — editorial close-up for the original two-spot printed human handoff.
 *
 * The f160 full film made ~20-source-unit gripping hands only a few pixels
 * high on a 960×540 sheet. Even correct RISO49–55 hand contours cannot be
 * judged at that size. A real camera move must magnify the ACTUAL ORIGINAL
 * actor, physical paper, moving RED/BLEU master, and original index-over-
 * paper grip together. This is a deterministic lens transform on stage
 * geometry, NOT a raster crop, a replacement hand, a pasted illustration,
 * or a hidden second animation clock.
 *
 * Full bodies and the documentary typography remain present before and
 * after this shot. During the close-up, intentionally crop upper bodies;
 * both named DIP tip contacts and the entire *moving* sheet stay in-frame.
 * Camera tracks true source/receiver ANAT1 paper anchors, not hardcoded
 * screen pixels or an independent imagined sheet position.
 */
export type Riso56Aspect="landscape"|"portrait";
export type Riso56Point=Readonly<{x:number;y:number}>;
export type Riso56Placement=Readonly<{x:number;y:number;scale:number}>;

export const RISO56_CAMERA_BEAT={
  enter:142,fullAt:160,holdUntil:180,exit:207,
  landscapeMaxZoom:2.15,
  portraitMaxZoom:1.36,
  aspectRatio:"16:9 and 9:16, independently framed",
  composition:"middle of two actual living paper pinch anchors",
  layerRule:"the same stage matrix must transform donor, receiver, sheet, RED and BLUE print layers",
  hold:"no random shake, zoom pumping, or scene-frame clock",
} as const;

const smooth=(v:number)=>{
  const t=Math.max(0,Math.min(1,v));
  return t*t*(3-2*t);
};
const bounded=(v:number)=>Number(v.toFixed(5));

export function evaluateRiso56HandoffCamera(
  frame:number,aspect:Riso56Aspect,
  source:Riso56Point,receiver:Riso56Point,enabled=true,
){
  if(!Number.isInteger(frame)||frame<0||frame>239||
    (aspect!=="landscape"&&aspect!=="portrait")||
    ![source.x,source.y,receiver.x,receiver.y].every(Number.isFinite)||
    typeof enabled!=="boolean")
    throw new RangeError("RISO56 needs original finite stage paper anchors at 0..239f");
  const {enter,fullAt,holdUntil,exit}=RISO56_CAMERA_BEAT;
  const entering=smooth((frame-enter)/(fullAt-enter));
  const leaving=smooth((exit-frame)/(exit-holdUntil));
  const beat=enabled?Math.min(entering,leaving):0;
  const portrait=aspect==="portrait";
  const width=portrait?540:960,height=portrait?960:540;
  const zoomMax=portrait?
    RISO56_CAMERA_BEAT.portraitMaxZoom:RISO56_CAMERA_BEAT.landscapeMaxZoom;
  const zoom=1+(zoomMax-1)*beat;
  const focusX=(source.x+receiver.x)/2;
  const focusY=(source.y+receiver.y)/2;
  // Keep the closed side pinch in the human viewing center, with printed
  // breathing room above and below (portrait uses the paper's lower
  // editorial third rather than wasting half the narrow shot).
  const targetX=width/2,targetY=portrait?height*.495:height*.535;
  // Smooth screen translation only exists while the editorial beat exists.
  // At beat==0 the global stage is EXACTLY untransformed, preserving
  // old 0f, 142f, 207f and 239f frame pixel outputs byte for byte.
  const tx=beat*(targetX-focusX)+(1-zoom)*focusX;
  const ty=beat*(targetY-focusY)+(1-zoom)*focusY;
  const result={frame,aspect,width,height,
    beat:bounded(beat),zoom:bounded(zoom),
    tx:bounded(tx),ty:bounded(ty),
    focusX:bounded(focusX),focusY:bounded(focusY),
    targetX,targetY,
  } as const;
  return result;
}

export type Riso56Camera=ReturnType<typeof evaluateRiso56HandoffCamera>;

/** One physical stage transform, reused without changing original ink paths. */
export function riso56CameraMatrix(camera:Riso56Camera):string{
  return `matrix(${camera.zoom} 0 0 ${camera.zoom} ${camera.tx} ${camera.ty})`;
}
export function riso56ProjectPoint(point:Riso56Point,camera:Riso56Camera):Riso56Point{
  return {x:bounded(point.x*camera.zoom+camera.tx),
    y:bounded(point.y*camera.zoom+camera.ty)};
}
export function riso56ProjectPlacement(
  place:Riso56Placement,camera:Riso56Camera,
):Riso56Placement{
  const point=riso56ProjectPoint(place,camera);
  return {...point,scale:bounded(place.scale*camera.zoom)};
}
