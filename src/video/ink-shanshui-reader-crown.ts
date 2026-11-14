/**
 * ArtCraft v6 source-led static construction: scroll reader's wrapped crown.
 *
 * Source: user's 1672 x 941 riverside scholar painting, face crop
 * approximately x 445..555, y 282..412. Other parts and figures unchanged.
 *
 * The approved painting shows (1) a small tied rear wing, (2) a tall,
 * asymmetrically folded front topknot, (3) a shorter rear lobe, (4) a soft,
 * rounded band whose lower edge DESCENDS toward the right brow, and (5) two
 * narrow tails hanging left/down from a single knot. The previous art was a
 * broad, almost horizontal double-ribbon with a reversed band slope.
 *
 * Separate semantic regions make connectivity and overlap inspectable;
 * they flatten to the existing head-attached "hair" asset. Each contour is
 * original authored SVG geometry, not a source-image trace or copied pixels.
 */
import type {CharacterPathShape} from "../../registry/character/definition";
import {inkPressureStroke} from "./ink-shanshui-fine-craft";

const p=(d:string,fill="none",stroke="$ink",strokeWidth=1,opacity=1):
  CharacterPathShape=>({
    type:"path",d,fill,stroke,strokeWidth,opacity,
  });
const brush=(a:[number,number],b:[number,number],
  c:[number,number],d:[number,number],width:number,
  seed:number,ink="$ink",opacity=.8):CharacterPathShape=>
  inkPressureStroke({
    from:{x:a[0],y:a[1]},c1:{x:b[0],y:b[1]},
    c2:{x:c[0],y:c[1]},to:{x:d[0],y:d[1]},
    width,seed,ink,opacity,samples:20,
  });

export type ReaderCrownRegion=
  "trailing-silk"|"rear-tie-wing"|"sideburn"|"rear-topknot"|
  "front-topknot"|"cap-shell"|"forehead-band"|"fold-lines"|
  "dry-ink-grain";

export interface ReaderCrownReferenceRegion {
  id:ReaderCrownRegion;
  description:string;
  /** design-space contact points, in same 260x340 head-local coordinate system */
  attachments:readonly {x:number;y:number}[];
  confidence:"observed"|"interpreted";
}
/** The reference-to-topology map is a structural contract, not just labels. */
export const READER_CROWN_STRUCTURE:readonly ReaderCrownReferenceRegion[]=[
  {id:"trailing-silk",description:"two narrow tapered tails emerge beneath the LEFT cap band, drift left and down",attachments:[{x:121,y:78},{x:119,y:83}],confidence:"observed"},
  {id:"rear-tie-wing",description:"small dark wing behind the cap and temple, not a third large ribbon",attachments:[{x:115,y:70}],confidence:"observed"},
  {id:"sideburn",description:"slim opaque hair behind the ear, hidden by its light anterior rim",attachments:[{x:115,y:89}],confidence:"observed"},
  {id:"rear-topknot",description:"shorter right silk lobe folds into crown under front bun",attachments:[{x:156,y:63}],confidence:"observed"},
  {id:"front-topknot",description:"taller rounded left bun with one concave upper seam and internal compression folds",attachments:[{x:143,y:58}],confidence:"observed"},
  {id:"cap-shell",description:"rounded, nonpolygonal cap crown bridges lobes into forehead band",attachments:[{x:127,y:76},{x:163,y:77}],confidence:"observed"},
  {id:"forehead-band",description:"opaque rolled cloth hem slopes gently downward toward far brow (right)",attachments:[{x:112,y:82},{x:170,y:91}],confidence:"observed"},
  {id:"fold-lines",description:"three dominant tapered folds run from back-left root toward cap curvature and not evenly spaced",attachments:[{x:126,y:78}],confidence:"observed"},
  {id:"dry-ink-grain",description:"fine low-opacity irregular fibres inside cloth volumes, not random background dots",attachments:[{x:144,y:75}],confidence:"interpreted"},
] as const;

const ORDER:readonly ReaderCrownRegion[]=[
  "trailing-silk","rear-tie-wing","sideburn","rear-topknot",
  "front-topknot","cap-shell","forehead-band","fold-lines",
  "dry-ink-grain",
];

export function readerCrownRegions(detail=1):
  Record<ReaderCrownRegion,CharacterPathShape[]>{
  if(!Number.isFinite(detail)||detail<0||detail>1)
    throw new RangeError("Reader crown art detail must be between 0 and 1.");
  const mid=detail>=.4,high=detail>=.8;

  const trailingSilk:CharacterPathShape[]=[
    // Inked root is *under* the cap. Both tails share a real tying region.
    // Unlike the rejected straight bands, the two free ends narrow down to
    // < 2 design px while the midspan bends with the falling cloth.
    p("M122.6 74.7 C106.4 82.5 90.6 95.7 69.6 103.8 C59.3 108 52.9 109.6 45.3 111.1 C56.8 113.8 68.7 111.1 79.2 106.8 C99.3 99.4 115.1 89.7 126.1 80.7 Z",
      "$deep","$shadow",.83,.93),
    p("M121.2 77.7 C107.7 95.7 97.5 111.3 77.5 120.5 C72.5 123.1 67.7 124.6 62.3 125.5 C75 126.9 83.3 124.9 92.6 119.4 C107.2 110.4 119.3 95.6 126.1 83.4 Z",
      "$wash","$shadow",.68,.89),
    p("M120.3 79.2 C102.3 92.8 76.4 107.6 53.2 110.1",
      "none","$paper",.7,.45),
    p("M120.6 84.8 C103.9 105.6 92.9 117.8 72.7 122.3",
      "none","$shadow",.65,.64),
  ];
  if(mid)trailingSilk.push(
    brush([120.4,80.1],[98.1,94.3],[76.1,103.2],[56.3,109.9],
      .85,701,"$ink",.62),
    brush([118.7,84],[104.8,104.2],[90.4,115.9],[78.1,121.1],
      .53,702,"$paper",.56),
  );

  const rearTieWing:CharacterPathShape[]=[
    p("M121.1 66.4 C111.9 63.7 104.9 66.3 100.1 72.9 C95.1 77.5 94.6 83.5 98.4 87.7 C104.8 88.4 113.7 83.6 122.5 78.1 Z",
      "$deep","$ink",.89,1),
    p("M101.6 77.8 C108.9 72 114.8 71.9 122.9 72.5",
      "none","$wash",.93,.67),
  ];
  const sideburn:CharacterPathShape[]=[
    p("M116.4 81.2 C112.4 88.9 111.5 97.5 111.9 107.8 C114.1 115 117.3 116.9 120.3 114.2 C117.8 109.4 115.6 101 118 92.3 L122.7 84.4 Z",
      "$ink","none",0,1),
    p("M114.1 93.8 Q112.2 103.4 115.1 111.2",
      "none","$wash",.58,.57),
  ];
  const rearTopknot:CharacterPathShape[]=[
    p("M153.1 36.6 C162.1 35.7 173.5 41.9 176.3 50.9 C179.3 57.8 176.5 65.7 171.8 69.9 C166.6 72.7 160.1 72.3 153.8 67.4 C157.4 56.6 156 45.9 153.1 36.6 Z",
      "$shadow","$ink",1.12,1),
    p("M164.9 40.1 C171.2 44.8 173 50.6 173.2 59.5 C171.7 64.4 169.7 67.7 166.4 69.3 C169.1 60 166.3 49.7 164.9 40.1 Z",
      "$deep","none",0,.38),
    brush([162.2,41.1],[167.3,46.5],[169.5,55.7],[168,63.6],
      1.47,711,"$ink",.74),
  ];
  if(mid)rearTopknot.push(
    brush([173,48.2],[177.2,56.1],[173.7,62.5],[170.2,66.7],
      .72,712,"$paper",.52),
  );
  const frontTopknot:CharacterPathShape[]=[
    // Two distinct turning planes (upper bulb and folded throat), not a
    // single symmetrical ellipse. Main left lobe overlaps right lobe.
    p("M133.8 61.5 C134.5 49.5 136.6 40.7 142.9 33.9 C148.2 28.8 158.4 29.8 162.8 36.3 C167.1 44.2 167.2 55.1 162.9 62 C157.1 65.9 150.6 68.6 143.1 69.1 C139.1 68.2 135 66.2 133.8 61.5 Z",
      "$deep","$ink",1.2,1),
    p("M135.4 58.6 C136.6 43 143.2 34.7 151.9 33 C147.3 40.7 143.8 53.7 143.5 68.2 C139.3 66.4 136.7 63.6 135.4 58.6 Z",
      "$shadow","none",0,.65),
    // The dark ink underfold expresses the pressure at the base of the tie.
    p("M141.6 64.1 C149.8 61.9 157.1 60.7 163.6 62.6 C157.2 68.7 150.2 70.5 144 69.2 Z",
      "$ink","none",0,.31),
    brush([144.4,38.5],[140.6,48],[140.6,56.1],[140.8,63.3],
      2.7,721,"$ink",.78),
    brush([150.5,35.1],[149.3,44.3],[153.5,53.8],[150.2,61.8],
      1.2,722,"$shadow",.77),
  ];
  if(mid)frontTopknot.push(
    brush([157.7,36.4],[162.8,45.2],[160.1,55.2],[157,60.1],
      .81,723,"$paper",.53),
    p("M138.7 55 Q139.1 46.1 142.6 40.2",
      "none","$wash",.82,.63),
  );
  const capShell:CharacterPathShape[]=[
    // Repeated concave/convex contour transitions around a skull tilt.
    p("M113.9 77.1 C119.8 66.5 129 60.9 139.5 60.2 C149.2 59.9 163.3 64.4 168.6 72.7 C171.9 78.1 173.1 82 172.3 88.4 C159 81.4 145.1 77.1 132.3 78 C124.7 78.2 117.8 81.4 112.5 85.8 C111.8 82.8 112.8 79.5 113.9 77.1 Z",
      "$shadow","$ink",1.23,1),
    // Pigment gathers behind the seam at the far forehead turn.
    p("M146 63.6 C156 64.1 166.9 70.8 169.9 81.2 C160.9 76.3 151.7 72.9 140.5 72.5 C141.2 69.4 143.2 66.7 146 63.6 Z",
      "$deep","none",0,.25),
  ];
  const foreheadBand:CharacterPathShape[]=[
    // IMPORTANT: source's front band falls DOWN to the right. Old band
    // rose to the right, reading as a rigid pointed helmet over the eyes.
    p("M112.4 79.1 C119.7 71.6 135.5 69.9 146.1 71.7 C157.5 73.6 168.9 80.6 172 87.8 C171.8 90.1 170.7 91.4 168.6 90.2 C156.6 86.2 146.5 84.5 137.2 83.8 C128.7 83.3 120.8 85.6 113.6 86.7 C111.6 85.9 111.2 82.6 112.4 79.1 Z",
      "$deep","$ink",1.27,1),
    p("M113.8 84.6 C125 80.3 133.3 79.4 142.8 80.5 C154.3 81.4 163.9 85.9 169 89.5",
      "none","$ink",1.18,.8),
    // Silk edging is a broken fine contour, not a second uniform stripe.
    brush([116.4,85.5],[130.7,82.2],[141.5,82.6],[155.5,86.3],
      .92,731,"$paper",.54),
  ];
  const foldLines:CharacterPathShape[]=[
    // Three distinctive fan-like dry brushes originate near the lower-left
    // bound cloth, curving toward the crown (not parallel hatch wallpaper).
    brush([120.1,77.4],[126.1,70.3],[135,68.2],[143.1,67.7],
      2.8,741,"$ink",.74),
    brush([122.8,80.1],[132.9,73.7],[141.8,73.1],[151.4,74.7],
      1.63,742,"$ink",.65),
    brush([126.5,80.8],[134.5,77.6],[140.4,77.5],[146,79.2],
      .85,743,"$wash",.55),
  ];
  if(mid)foldLines.push(
    brush([117.1,79.9],[123.4,72.2],[128.2,71.2],[135.3,70.6],
      1.08,744,"$ink",.66),
    brush([132.1,64.2],[143.6,62],[155.9,66.8],[162.2,72.7],
      .74,745,"$paper",.54),
  );
  const dryGrain:CharacterPathShape[]=[];
  if(mid)for(let i=0;i<(high?11:5);i++){
    const x=124+(i*4.2)%36,y=71+((i*7)%12);
    const dx=(i%3===0?-2.5:2)+i*.14;
    dryGrain.push(brush([x,y],[x+dx*.3,y-2.7],
      [x+dx*.83,y-4.1],[x+dx,y-4.6],.18+(i%3)*.14,
      801+i,i%4===0?"$paper":"$ink",i%4===0?.4:.27));
  }
  const map:Record<ReaderCrownRegion,CharacterPathShape[]>={
    "trailing-silk":trailingSilk,
    "rear-tie-wing":rearTieWing,
    sideburn,
    "rear-topknot":rearTopknot,
    "front-topknot":frontTopknot,
    "cap-shell":capShell,
    "forehead-band":foreheadBand,
    "fold-lines":foldLines,
    "dry-ink-grain":dryGrain,
  };
  return map;
}

export function readerCrownShapes(detail=1):CharacterPathShape[]{
  const r=readerCrownRegions(detail);
  return ORDER.flatMap(key=>r[key]);
}
