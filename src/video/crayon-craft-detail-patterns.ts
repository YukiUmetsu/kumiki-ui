import { crayonHash } from "../../registry/video/materials/crayon";

/**
 * Authored craft detail primitives. These generate SUBPATHS, not hundreds of
 * React elements or full-body pattern stamps. Their modest asymmetry mimics
 * a human wax-pencil mark while remaining frame-seek deterministic.
 */
const finite = (...values:number[]) => values.every(Number.isFinite);
const count = (value:number,limit:number) =>
  Number.isSafeInteger(value) && value>=1 && value<=limit;
const fixed = (v:number) => Math.round(v*100)/100;

export interface CrayonScaleField {
  x:number; y:number; rows:number; columns:number;
  stepX:number; stepY:number; width:number; depth:number;
  seed:number; taper?:number;
}
/** Nested, gently offset crescent scales, with no fill that obscures anatomy. */
export function crayonScaleField(o:CrayonScaleField):string {
  if(!finite(o.x,o.y,o.stepX,o.stepY,o.width,o.depth,o.seed,o.taper??0)||
    !Number.isSafeInteger(o.seed)||!count(o.rows,18)||!count(o.columns,22)||
    o.rows*o.columns>240||
    o.stepX<3||o.stepX>120||o.stepY<3||o.stepY>120||
    o.width<2||o.width>120||o.depth<.5||o.depth>60||
    Math.abs(o.x)>8192||Math.abs(o.y)>8192||
    Math.abs(o.taper??0)>10)
    throw new RangeError("Crayon scale field is not bounded");
  const d:string[]=[];
  for(let row=0;row<o.rows;row++){
    for(let column=0;column<o.columns;column++){
      const index=row*o.columns+column;
      const jitter=(crayonHash(o.seed,index,2)-.5)*.7;
      const originX=o.x+column*o.stepX+(row%2)*o.stepX*.45+
        row*(o.taper??0)+jitter;
      const originY=o.y+row*o.stepY+
        (crayonHash(o.seed,index,5)-.5)*1.1;
      const dx=o.width*(.92+crayonHash(o.seed,index,7)*.14);
      const drop=o.depth*(.87+crayonHash(o.seed,index,9)*.24);
      d.push("M"+fixed(originX)+" "+fixed(originY)+
        "q"+fixed(dx*.52)+" "+fixed(drop)+" "+fixed(dx)+" "+fixed(.1*drop));
    }
  }
  return d.join(" ");
}

export interface CrayonMasonryCourses {
  x:number; y:number; rows:number; columns:number;
  courseWidth:number; courseHeight:number; seed:number;
}
/** Thin, staggered mortar seams with small chipped ends (not a vector grid). */
export function crayonMasonryCourses(o:CrayonMasonryCourses):string {
  if(!finite(o.x,o.y,o.courseWidth,o.courseHeight,o.seed)||
    !Number.isSafeInteger(o.seed)||!count(o.rows,20)||!count(o.columns,18)||
    o.rows*o.columns>240||
    o.courseWidth<4||o.courseWidth>160||
    o.courseHeight<4||o.courseHeight>120||
    Math.abs(o.x)>8192||Math.abs(o.y)>8192)
    throw new RangeError("Crayon masonry courses are not bounded");
  const d:string[]=[];
  for(let row=0;row<o.rows;row++){
    for(let col=0;col<o.columns;col++){
      const k=row*o.columns+col;
      const left=o.x+col*o.courseWidth+
        (row%2)*o.courseWidth*.42;
      const y=o.y+row*o.courseHeight;
      const offset=(crayonHash(o.seed,k)-.5)*1.3;
      const length=o.courseWidth*(.64+crayonHash(o.seed,k,4)*.17);
      d.push("M"+fixed(left)+" "+fixed(y+offset)+
        "l"+fixed(length)+" "+fixed((crayonHash(o.seed,k,6)-.5)*1.4));
      if(col%2===0) d.push("M"+fixed(left)+" "+fixed(y+offset)+
        "l"+fixed(0.7)+" "+fixed(Math.min(5,o.courseHeight*.27)));
    }
  }
  return d.join(" ");
}

export interface CrayonRoofCourses {
  apexX:number; apexY:number; halfWidth:number; height:number;
  rows:number; seed:number;
}
/** Tile outlines remain INSIDE a pitched triangular roof silhouette. */
export function crayonRoofCourses(o:CrayonRoofCourses):string {
  if(!finite(o.apexX,o.apexY,o.halfWidth,o.height,o.seed)||
    !Number.isSafeInteger(o.seed)||!count(o.rows,16)||
    o.halfWidth<8||o.halfWidth>512||o.height<12||o.height>512||
    Math.abs(o.apexX)>8192||Math.abs(o.apexY)>8192)
    throw new RangeError("Crayon roof courses are not bounded");
  const d:string[]=[];
  for(let row=1;row<=o.rows;row++){
    const t=row/(o.rows+1),y=o.apexY+o.height*t;
    const width=o.halfWidth*t*.87;
    const n=Math.max(1,Math.floor(width*2/11));
    for(let col=0;col<n;col++){
      const cx=o.apexX-width+(col+.4)*width*2/n;
      const lift=(crayonHash(o.seed,row*n+col)-.5)*.8;
      const dash=Math.min(8,width/n*.82);
      d.push("M"+fixed(cx)+" "+fixed(y+lift)+
        "q"+fixed(dash*.53)+" "+fixed(1.4+t*.5)+" "+fixed(dash)+" "+fixed(.7));
    }
  }
  return d.join(" ");
}
