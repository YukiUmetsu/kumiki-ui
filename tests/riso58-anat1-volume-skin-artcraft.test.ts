import {describe,expect,it} from "vitest";
import {flattenRisoSvgPath,risoContourSignedArea}
  from "../registry/video/riso-path-geometry";
import {evaluateRisoCharacter,inspectRisoCharacter}
  from "../registry/video/riso-character";
import {COURIER} from "../src/video/riso-character-demo";
import {PAPER_ARTIST,evaluateRisoHumanEnsemble}
  from "../src/video/riso-human-ensemble";
import {riso57PalmLandmarks}
  from "../src/video/riso57-palm-contact-silhouette";
import {inspectRiso44PrintedIndexContact}
  from "../src/video/riso44-source-index-paper-contact";
import {inspectRiso33HandFan}
  from "../src/video/riso33-hand-negative-space";
import {inspectRiso36RedFingerSilhouettes}
  from "../src/video/riso36-red-silhouette-gate";
import {
  RISO58_ANAT1_SURFACE,
  riso58ReconstructedBones,riso58ContactSkin,
  riso58ProjectSkinPoint,riso58ApplyContactSkin,
  riso58InverseHandPoint,
} from "../src/video/riso58-anat1-volume-skin";

const active=[
  {spec:COURIER,actor:"courier",side:"right",other:"left"},
  {spec:PAPER_ARTIST,actor:"paper-artist",side:"left",other:"right"},
] as const;
const dist3=(a:{x:number;y:number;z:number},b:{x:number;y:number;z:number})=>
  Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
const cross=(a:readonly number[],b:readonly number[],c:readonly number[])=>
 (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
describe("RISO58 ArtCraft: ANAT1 real joint-constrained 3D skin volume",()=>{
  it("reconstructs true proximal and intermediate THREE-dimensional bone length from actually projected original joints",()=>{
    expect(RISO58_ANAT1_SURFACE.originalSourceKnots).toBe(16);
    for(const {spec,side,actor} of active){
      for(const frame of [0,144,154,156,160,166,180,202,239]){
        const pose=evaluateRisoCharacter(spec,frame);
        const hand=pose.joints.find(j=>j.id===side+"-hand")!;
        const local=riso58InverseHandPoint(hand.matrix,hand);
        expect(local[0]).toBeCloseTo(0,4);
        expect(local[1]).toBeCloseTo(0,4);
        const bones=riso58ReconstructedBones(spec,side,frame);
        expect(bones.map(b=>b.digit)).toEqual(["index","middle","ring","pinky"]);
        for(const b of bones){
          expect(dist3(b.mcp,b.pip)).toBeCloseTo(b.trueProximal,2);
          expect(dist3(b.pip,b.dip)).toBeCloseTo(b.trueIntermediate,2);
          expect(b.depthProximal).toBeGreaterThanOrEqual(0);
          expect(b.depthIntermediate).toBeGreaterThanOrEqual(0);
          if(b.digit==="index"){
            expect(b.side).toBe("radial");
            expect(b.pip.z).toBeGreaterThanOrEqual(0);
          }else{
            expect(b.side).toBe("ulnar");
            expect(b.pip.z).toBeLessThanOrEqual(0);
          }
        }
      }
      const contact=riso58ReconstructedBones(spec,side,160);
      expect(contact.filter(x=>x.digit!=="index")
        .every(x=>x.depthProximal>3.7)).toBe(true);
      const source=riso58ContactSkin(spec,actor,side);
      expect(source.bones.map(b=>b.digit)).toEqual(contact.map(b=>b.digit));
      expect(source.maxSurfaceDepth).toBeGreaterThan(1.8);
      expect(source.maxVolumeDisplacement).toBeGreaterThan(.85);
      expect(source.maxVolumeDisplacement).toBeLessThan(9);
    }
  });
  it("projects same true 3D source point through correctly handed signed yaw without moving original Z=0 joints",()=>{
    const q={x:4,y:5,z:0};
    for(const side of ["left","right"] as const)
      expect(riso58ProjectSkinPoint(q,side)).toEqual([4,5]);
    const behind={x:4,y:5,z:-3};
    const front={x:4,y:5,z:3};
    expect(riso58ProjectSkinPoint(front,"right")[0]).toBeGreaterThan(4);
    expect(riso58ProjectSkinPoint(behind,"right")[0]).toBeLessThan(4);
    expect(riso58ProjectSkinPoint(front,"left")[0]).toBeLessThan(4);
    expect(riso58ProjectSkinPoint(behind,"left")[0]).toBeGreaterThan(4);
    expect(()=>riso58ProjectSkinPoint({x:0,y:NaN,z:4},"right")).toThrow();
  });
  it("rebuilds ONE original positive RED part from the actual four MCP roots, thumb/index web and cupped hypothenar",()=>{
    for(const {spec,actor,side,other} of active){
      expect(inspectRisoCharacter(spec,["red","blue"])).toEqual([]);
      const source=riso58ContactSkin(spec,actor,side,160);
      const neutral=riso57PalmLandmarks(actor,side);
      expect(source.anchors).toHaveLength(16);
      expect(source.anchors.map(x=>x.landmark)).toEqual(neutral.map(x=>x.landmark));
      const by=new Map(source.anchors.map(k=>[k.landmark,k]));
      const webs=["index-middle-web","middle-ring-web","ring-little-web"];
      for(const web of webs){
        const node=by.get(web)!;
        expect(node.z).toBeLessThan(0);
      }
      expect(by.get("thenar-bulge")!.z).toBeGreaterThan(2);
      expect(by.get("first-web-inset")!.z).toBeGreaterThan(0);
      expect(by.get("fifth-mcp")!.z).toBeLessThan(-1);
      const live=evaluateRisoCharacter(spec,160);
      const palm=spec.parts.find(p=>p.id===side+"-glove")!;
      const otherPalm=spec.parts.find(p=>p.id===other+"-glove")!;
      const animated=live.parts.find(p=>p.id===palm.id)!;
      expect(palm.pathKeys?.map(k=>k.frame)).toEqual([0,146,160,180,205,239]);
      expect(palm.pathKeys?.[0].d).toBe(palm.d);
      expect(palm.pathKeys?.[2].d).toBe(source.path);
      expect(animated.d).toBe(source.path);
      expect(animated.plate).toBe("red");
      expect(animated.paint).toBe("solid");
      expect(otherPalm.pathKeys).toBeUndefined();
      expect(palm.d.match(/C/g)).toHaveLength(16);
      expect(animated.d.match(/C/g)).toHaveLength(16);
      const original=flattenRisoSvgPath(palm.d,.12);
      const projected=flattenRisoSvgPath(source.path,.12);
      expect(original).toHaveLength(1);
      expect(projected).toHaveLength(1);
      expect(projected[0].closed).toBe(true);
      expect(Math.abs(risoContourSignedArea(projected[0].points))).toBeGreaterThan(160);
      expect(Math.abs(risoContourSignedArea(projected[0].points))).toBeLessThan(340);
      const pts=projected[0].points;
      // Actual printed RED positive skin has no bow-tie self-intersection;
      // no hidden zero-area patch is accepted as a fake continuous palm.
      for(let i=0;i<pts.length;i++)for(let j=i+2;j<pts.length;j++){
        if(i===0&&j===pts.length-1)continue;
        expect(cross(pts[i],pts[(i+1)%pts.length],pts[j])*
          cross(pts[i],pts[(i+1)%pts.length],pts[(j+1)%pts.length])<0&&
          cross(pts[j],pts[(j+1)%pts.length],pts[i])*
          cross(pts[j],pts[(j+1)%pts.length],pts[(i+1)%pts.length])<0)
          .toBe(false);
      }
      // This is a genuine revision to the same 16-C morph, not a separate
      // painted glove part that hides disconnected original fingers.
      const same=riso58ApplyContactSkin(spec,actor);
      expect(same.parts.map(p=>p.id)).toEqual(spec.parts.map(p=>p.id));
      expect(same.parts.map(p=>[p.plate,p.paint,p.knockoutOnly]))
        .toEqual(spec.parts.map(p=>[p.plate,p.paint,p.knockoutOnly]));
    }
  });
  it("keeps every original 24fps bone, registered physical ink layer, and index-over/ thumb-under pressure after 3D volume source",()=>{
    for(const {spec,side} of active){
      for(const frame of [0,142,146,148,156,160,166,180,198,206,239]){
        const pose=evaluateRisoCharacter(spec,frame);
        const palm=pose.parts.find(p=>p.id===side+"-glove")!;
        expect(palm.plate).toBe("red");
        const ink=inspectRiso36RedFingerSilhouettes(spec,frame,side);
        expect(ink.sourcePartCount).toBe(12);
        const geometry=inspectRiso33HandFan(spec,frame,side);
        expect(geometry.minimumAxisGap).toBeGreaterThan(3);
        expect(geometry.intersectingAxisPairs).toEqual([]);
        if(frame===0)
          expect(palm.d).toBe(spec.parts.find(p=>p.id===palm.id)!.d);
      }
      for(const aspect of ["landscape","portrait"] as const)
      for(const frame of [160,166]){
        const film=evaluateRisoHumanEnsemble(frame,aspect);
        const contact=inspectRiso44PrintedIndexContact(spec,frame,side,
          spec.id==="courier"?film.first:film.second,film.sheet);
        expect(contact.redIndexAreaTouchesPaper).toBe(true);
        expect(contact.thumbUnderPaper).toBe(true);
      }
    }
  });
});
