/** Original measured-style geometry for a rounded-back bound book.
 *
 * Book space: X is the distance from the center fold, Y runs head to tail,
 * and +Z points out of the printed pages. The shape intentionally models the
 * characteristic dip / shoulder of an opened signature, not a flat plane
 * with an image pasted on top.
 */
import { BoxGeometry, ExtrudeGeometry, PlaneGeometry, Shape } from "three";

export type BookLeafSide = "left" | "right";

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
