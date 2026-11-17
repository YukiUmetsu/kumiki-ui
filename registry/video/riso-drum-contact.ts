import {printHash} from "./print-plates";

/**
 * RISO75 expressive spot-ink material: a press-drum's thin longitudinal dry
 * contact streaks and clustered paper-open pinholes. Original SVG art is never
 * altered, resampled, simplified, blurred or replaced with stochastic RGB.
 *
 * Coordinates stay fixed in PAPER space across all FilmStage frames and all
 * registered spot passes. Every plate has an INDEPENDENT seeded contact field.
 * This is art-direction material, not a certified print-shop simulation.
 */
export interface RisoDrumContactOptions {
  readonly width:number;
  readonly height:number;
  readonly seed:number;
  readonly plateIndex:number;
  readonly dryness:number;
  /** The long (machine-feed) direction of the source paper. */
  readonly feed:"top-to-bottom"|"left-to-right";
}
export interface RisoDrumContactStreak {
  readonly id:string;
  readonly d:string;
  /** Width of the local original-stencil paper-opening streak, in design px. */
  readonly strokeWidth:number;
  /** Partial contact dropout; 0 leaves the ink exactly unchanged. */
  readonly opacity:number;
}
export interface RisoDrumContactPinprick {
  readonly id:string;
  readonly cx:number;
  readonly cy:number;
  readonly rx:number;
  readonly ry:number;
  readonly opacity:number;
}
export interface RisoDrumContactGeometry {
  readonly paperLocked:true;
  readonly plateIndex:number;
  readonly feed:"top-to-bottom"|"left-to-right";
  readonly streaks:readonly RisoDrumContactStreak[];
  readonly pinpricks:readonly RisoDrumContactPinprick[];
}
const decimal=(v:number)=>Number(v.toFixed(3));
const valid=(n:number)=>Number.isFinite(n);
export function createRisoDrumContactGeometry({
  width,height,seed,plateIndex,dryness,feed,
}:RisoDrumContactOptions):RisoDrumContactGeometry{
  if(!valid(width)||!valid(height)||width<240||width>8192||
    height<240||height>8192||!Number.isSafeInteger(seed)||seed<0||
    seed>2147483647||!Number.isSafeInteger(plateIndex)||
    plateIndex<0||plateIndex>24||
    !valid(dryness)||dryness<0||dryness>1||
    !["top-to-bottom","left-to-right"].includes(feed))
    throw new RangeError("RISO75 requires valid paper, 31-bit seed, independent drum, feed direction and 0..1 ink dryness.");

  if(dryness===0)
    return {paperLocked:true,plateIndex,feed,streaks:[],pinpricks:[]};
  const along=feed==="top-to-bottom"?height:width;
  const across=feed==="top-to-bottom"?width:height;
  const laneCount=16;
  const baseSeed=seed^Math.imul(plateIndex+1,189741);
  const h=(lane:number,i:number)=>printHash(baseSeed,lane+11,i+107);
  const loc=(cross:number,long:number)=>
    feed==="top-to-bottom"?
      [decimal(cross),decimal(long)] as const:
      [decimal(long),decimal(cross)] as const;
  const streaks:RisoDrumContactStreak[]=[];
  const pinpricks:RisoDrumContactPinprick[]=[];
  const scale=Math.min(2,Math.sqrt(across/960));
  for(let lane=0;lane<laneCount;lane++){
    // Inequality across the sheet resembles individualized roller contact,
    // not a texture tile or evenly spaced scanline filter.
    const laneX=(lane+.18+.64*h(lane,1))*across/laneCount;
    const score=h(lane,2),density=(.48+.52*h(lane,3))*(.86+.14*score);
    const laneDryness=dryness*density;
    for(let filament=0;filament<7;filament++){
      const id="l"+lane+"-f"+filament;
      const tangent=(h(lane,10+filament)-.5)*across*.009;
      const shift=(filament-3)*scale*(.32+.55*h(lane,20+filament));
      const cross=laneX+shift;
      const start=(.03+.70*h(lane,30+filament))*along;
      const length=(.08+.23*h(lane,40+filament))*along;
      const end=Math.min(along*.985,start+length);
      const sway=(h(lane,50+filament)-.5)*4.8*scale;
      const middle=(start+end)/2;
      const [x0,y0]=loc(cross,start);
      const [x1,y1]=loc(cross+sway+shift*.12,middle);
      const [x2,y2]=loc(cross+tangent,end);
      const [c1x,c1y]=loc(cross+sway*.52,start+(middle-start)*.55);
      const [c2x,c2y]=loc(cross+sway*.9,middle-(middle-start)*.25);
      const [c3x,c3y]=loc(cross+sway*1.04,middle+(end-middle)*.36);
      const [c4x,c4y]=loc(cross+tangent*.6,end-(end-middle)*.34);
      streaks.push({
        id,d:`M${x0} ${y0} C${c1x} ${c1y} ${c2x} ${c2y} ${x1} ${y1} C${c3x} ${c3y} ${c4x} ${c4y} ${x2} ${y2}`,
        strokeWidth:decimal((.18+1.42*h(lane,60+filament))*
          (filament===3?1.8:1)*scale),
        opacity:decimal(Math.min(.7, laneDryness*
          (.10+.54*h(lane,70+filament)))),
      });
    }
    // Tiny ink vacancies align loosely with a physical dry feed streak.
    // Their aspect follows the roller, never a global square pixel grid.
    for(let hole=0;hole<5;hole++){
      const axis=(.06+.89*h(lane,90+hole))*along;
      const offset=(h(lane,100+hole)-.5)*14*scale;
      const [cx,cy]=loc(laneX+offset,axis);
      const minor=(.19+1.02*h(lane,110+hole))*scale;
      const major=minor*(1.2+3.2*h(lane,120+hole));
      pinpricks.push({
        id:"l"+lane+"-p"+hole,cx,cy,
        rx:decimal(feed==="top-to-bottom"?minor:major),
        ry:decimal(feed==="top-to-bottom"?major:minor),
        opacity:decimal(Math.min(.72,laneDryness*
          (.12+.48*h(lane,130+hole)))),
      });
    }
  }
  return {paperLocked:true,plateIndex,feed,streaks,pinpricks};
}
