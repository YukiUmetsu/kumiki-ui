/** Pure, frame-addressed 2.5D camera rig for cinematic environment reveals.
 * Coordinates are normalized to the authored image; output translation uses
 * percentages relative to each visual plane. No accumulating CSS transitions.
 */
export interface EnvironmentCameraPoint {x:number;y:number;zoom:number}
export interface EnvironmentCameraPath {from:EnvironmentCameraPoint;to:EnvironmentCameraPoint}
export interface EnvironmentFrame {
  progress:number;zoom:number;
  background:{x:number;y:number;scale:number};
  foreground:{x:number;y:number;scale:number};
  subject:{x:number;y:number};
  lightSweep:number;
}
const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
const smooth=(n:number)=>{const t=clamp(n,0,1);return t*t*t*(t*(t*6-15)+10)};
export function sampleEnvironmentFrame(
  path:EnvironmentCameraPath,anchor:{x:number;y:number},
  frame:number,durationFrames:number,
  options:{foregroundStrength?:number;reducedMotion?:boolean}={},
):EnvironmentFrame{
  const points=[...Object.values(path.from),...Object.values(path.to),anchor.x,anchor.y];
  if(!points.every(Number.isFinite)||!Number.isFinite(frame)||!Number.isFinite(durationFrames)||
      durationFrames<=0||![path.from.x,path.from.y,path.to.x,path.to.y,anchor.x,anchor.y]
        .every(v=>v>=0&&v<=1)||
      ![path.from.zoom,path.to.zoom].every(v=>v>.0&&v<=3))
    throw new Error("Invalid 2.5D environment camera");
  const strength=options.foregroundStrength??1.3;
  if(!Number.isFinite(strength)||strength<1||strength>2.5)throw Error("Foreground strength must be 1..2.5");
  const t=options.reducedMotion?1:smooth(frame/Math.max(1,durationFrames-1));
  const lerp=(a:number,b:number)=>a+(b-a)*t;
  const cx=lerp(path.from.x,path.to.x);
  const cy=lerp(path.from.y,path.to.y);
  // Keep overscan to prevent hard empty borders even when a camera author
  // requests a very wide lens. The underlying source is still user-authored.
  const zoom=Math.max(1.035,lerp(path.from.zoom,path.to.zoom));
  const dx=clamp((.5-cx)*(zoom-1),-(zoom-1)*.5,(zoom-1)*.5);
  const dy=clamp((.5-cy)*(zoom-1),-(zoom-1)*.5,(zoom-1)*.5);
  const fgScale=1+(zoom-1)*strength+.045;
  const fx=clamp(dx*strength,-(fgScale-1)*.5,(fgScale-1)*.5);
  const fy=clamp(dy*strength,-(fgScale-1)*.5,(fgScale-1)*.5);
  return {progress:t,zoom,
    background:{x:dx*100,y:dy*100,scale:zoom},
    foreground:{x:fx*100,y:fy*100,scale:fgScale},
    subject:{
      x:50+(anchor.x-.5)*zoom*100+dx*100,
      y:50+(anchor.y-.5)*zoom*100+dy*100,
    },
    lightSweep:options.reducedMotion?0:smooth((t-.16)/.7),
  };
}
