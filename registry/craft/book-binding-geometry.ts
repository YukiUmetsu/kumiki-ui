/** Original measured-style geometry for a rounded-back bound book.
 *
 * Book space: X is the distance from the center fold, Y runs head to tail,
 * and +Z points out of the printed pages. The shape intentionally models the
 * characteristic dip / shoulder of an opened signature, not a flat plane
 * with an image pasted on top.
 */
import { BoxGeometry, ExtrudeGeometry, PlaneGeometry, Shape } from "three";

export type BookLeafSide = "left" | "right";


/** Reference-matched tooling geometry in book-local units.
 * The artwork's three rectangular fillets were laid out in a 1024×1400
 * finishing template. Real heated finishing tools compress the leather;
 * the gold leaf sits *inside* this shallow blind impression.
 * This field is deliberately independent of the chapter title text.
 */
export function bookToolImpression(x:number,y:number,width:number,height:number):number {
  if(![x,y,width,height].every(Number.isFinite)||width<=0||height<=0)
    throw new Error("Tool impression requires finite coordinates and positive dimensions");
  const u=x/width+.5,v=y/height+.5;
  const along=(value:number,lo:number,hi:number)=>Math.max(lo-value,0,value-hi);
  let depth=0;
  for(const [insetX,insetY,stroke,weight] of [
    [45,51,6,1],[65,72,2,.50],[82,91,2,.35],
  ]){
    const left=insetX/1024,right=1-left;
    const bottom=insetY/1400,top=1-bottom;
    const nearHorizontal=Math.min(
      Math.hypot(along(u,left,right)*width,(v-bottom)*height),
      Math.hypot(along(u,left,right)*width,(v-top)*height));
    const nearVertical=Math.min(
      Math.hypot((u-left)*width,along(v,bottom,top)*height),
      Math.hypot((u-right)*width,along(v,bottom,top)*height));
    const distance=Math.min(nearHorizontal,nearVertical);
    const radius=Math.max(width*stroke/1024,height*stroke/1400)*.75;
    depth+=.00135*weight*Math.exp(-Math.pow(distance/radius,2));
  }
  // Three concentric blind-tooled compass circles. The original circular
  // stamp is elliptical in book space because pixel-to-world UV scales differ.
  const cx=(u-.5)*1024,cy=(v-(1-.525))*1400;
  const radius=Math.hypot(cx,cy);
  for(const [ring,weight] of [[117,.65],[104,.45],[71,.36]]){
    const dist=Math.abs(radius-ring);
    depth+=.00075*weight*Math.exp(-Math.pow(dist/4,2));
  }
  return depth;
}

/** Continuous deformed calfskin at binding hinges and cover turn-in corners.
 * Coordinates are centered book-local units, not UV-sized noise. The same
 * surface is used for ink and gold leaf, preventing detached flat decals. */
export function leatherBoardRelief(x:number,y:number,width:number,height:number):number {
  if(![x,y,width,height].every(Number.isFinite)||width<=0||height<=0)
    throw new Error("Leather board relief requires finite coordinates and positive dimensions");
  const u=x/width+.5,v=y/height+.5;
  const hinge=-.00185*Math.exp(-Math.pow((u-.055-.004*Math.sin(10*v))/.030,2))*
    (.76+.24*Math.cos(v*Math.PI*3));
  const edge=Math.min(u,1-u),end=Math.min(v,1-v);
  const corner=-.0008*Math.exp(-Math.pow(edge/.17,2)-Math.pow(end/.11,2))*
    Math.sin(31*end+7*edge);
  const compression=-.00035*Math.exp(-Math.pow((v-.92)/.075,2))*
    (1-.35*Math.sin(18*u+3*v));
  const skin=.00013*Math.sin(13*u+2*Math.sin(6*v))*Math.cos(9*v-2*u);
  return hinge+corner+compression+skin-bookToolImpression(x,y,width,height);
}

/** Real vertex normals from shallow compression, not a uniform bump stencil. */
export function createLeatherBoardReliefGeometry(width:number,height:number):PlaneGeometry {
  if(![width,height].every(Number.isFinite)||width<=0||height<=0)
    throw new Error("Leather board geometry requires positive finite dimensions");
  // Fine enough to resolve a narrow 6 px border impression at oblique angles.
  const geo=new PlaneGeometry(width,height,240,320);
  const position=geo.attributes.position;
  for(let i=0;i<position.count;i++)
    position.setZ(i,leatherBoardRelief(position.getX(i),position.getY(i),width,height));
  geo.computeVertexNormals();geo.computeBoundingBox();
  return geo;
}


/** An opened leaf dips into the sewing fold and rises onto a soft shoulder. */
export function bookLeafRelief(distance: number, width: number): number {
  if (!Number.isFinite(distance) || !Number.isFinite(width) || width <= 0)
    throw new Error("Book leaf relief requires finite dimensions and positive width");
  const x = Math.min(width, Math.max(0, distance));
  const shoulder = .060 * Math.exp(-Math.pow((x - .24) / .17, 2));
  const gutter = .024 * Math.exp(-Math.pow(x / .075, 2));
  const foreEdge = .009 * Math.pow(x / width, 3);
  return shoulder - gutter - foreEdge;
}

/** Subdivided paper that receives real grazing-light normals around the fold. */
export function createBookLeafGeometry(side: BookLeafSide, width: number, height: number,
  segmentsX = 56, segmentsY = 24): PlaneGeometry {
  if (![width, height, segmentsX, segmentsY].every(Number.isFinite) ||
      width <= 0 || height <= 0 || segmentsX < 4 || segmentsY < 1)
    throw new Error("Invalid book leaf dimensions");
  const geometry = new PlaneGeometry(width, height, segmentsX, segmentsY);
  geometry.translate((side === "right" ? 1 : -1) * width / 2, 0, 0);
  const position = geometry.attributes.position;
  for (let i = 0; i < position.count; i++) {
    const x = Math.abs(position.getX(i));
    const y = position.getY(i) / (height / 2);
    // The slight taper toward the head and tail is a folded-paper property,
    // not noise; the center elevation comes from the binding shoulders.
    position.setZ(i, bookLeafRelief(x, width) * (1 - .12 * y * y));
  }
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  return geometry;
}

/** A *solid* folded paper stratum with the same sewn shoulder as the visible
 * leaf. Repeating it with vertical offsets forms a coherent curved textblock:
 * the raised paper is genuinely supported, with cut fibres at the free edge,
 * rather than floating over a stack of rectangular slabs.
 */
export function createBookTextblockStratumGeometry(side: BookLeafSide,
  width: number, height: number, thickness = .00065,
  leafWidth = width): BoxGeometry {
  if (![width,height,thickness,leafWidth].every(Number.isFinite) ||
      width<=0 || height<=0 || thickness<=0 || leafWidth<width)
    throw new Error("Book textblock stratum requires positive finite dimensions");
  const geometry=new BoxGeometry(width,height,thickness,40,3,1);
  const position=geometry.attributes.position;
  for(let i=0;i<position.count;i++){
    // The inset stack and the wider printed leaf share the same fold in
    // WORLD space. Measuring from the stack's own shorter width produces a
    // shifted shoulder that visibly penetrates the inked sheet.
    const x=Math.abs(position.getX(i)+(side==="right"?1:-1)*leafWidth/2);
    const y=position.getY(i)/(height/2);
    position.setZ(i,position.getZ(i)+bookLeafRelief(x,leafWidth)*(1-.12*y*y));
  }
  geometry.computeVertexNormals();geometry.computeBoundingBox();
  return geometry;
}

type SpineProfile = {
  outer: { base: number; bow: number };
  inner: { base: number; bow: number };
};
const SPINE_WIDTH = .30;
const SPINE_CENTER = -.008;
/**
 * A closed, extruded arch with an inner return and physical endcaps. Its
 * curved back does not rely on a box bevel; raised bands use the same profile
 * with a narrow additional leather thickness, so they conform to the shell.
 */
export function createRoundedBookSpineGeometry(height: number,
  profile: SpineProfile = {
    outer: { base: -.218, bow: .105 },
    inner: { base: -.173, bow: .048 },
  }): ExtrudeGeometry {
  if (!Number.isFinite(height) || height <= 0 ||
      ![profile.outer.base, profile.outer.bow, profile.inner.base, profile.inner.bow].every(Number.isFinite))
    throw new Error("Invalid book spine profile");
  const shape = new Shape();
  const samples = 40;
  for (let i = 0; i <= samples; i++) {
    const theta = Math.PI * i / samples;
    const x = SPINE_CENTER + SPINE_WIDTH / 2 * Math.cos(theta);
    const z = profile.outer.base - profile.outer.bow * Math.sin(theta);
    if (i === 0) shape.moveTo(x, z);
    else shape.lineTo(x, z);
  }
  for (let i = samples; i >= 0; i--) {
    const theta = Math.PI * i / samples;
    shape.lineTo(SPINE_CENTER + SPINE_WIDTH / 2 * Math.cos(theta),
      profile.inner.base - profile.inner.bow * Math.sin(theta));
  }
  shape.closePath();
  const geometry = new ExtrudeGeometry(shape, {
    depth: height, steps: 1, bevelEnabled: false, curveSegments: 12,
  });
  // Shape XY -> world XZ, and extrusion depth -> world Y.
  geometry.rotateX(Math.PI / 2);
  geometry.translate(0, height / 2, 0);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  return geometry;
}

export function createRaisedBookBandGeometry(height: number): ExtrudeGeometry {
  return createRoundedBookSpineGeometry(height, {
    outer: { base: -.230, bow: .114 },
    inner: { base: -.216, bow: .104 },
  });
}
