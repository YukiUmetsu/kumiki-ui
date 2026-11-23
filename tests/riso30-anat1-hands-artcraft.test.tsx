import {describe,expect,it} from "vitest";
import {HAND_POSES} from "../registry/anatomy/anatomy-pose";
import {SURFACE_FORMS,ANSUR} from "../registry/anatomy/anatomy-reference";
import {inspectRisoCharacter,evaluateRisoCharacter} from "../registry/video/riso-character";
import {COURIER} from "../src/video/riso-character-demo";
import {PAPER_ARTIST,evaluateRisoHumanEnsemble} from "../src/video/riso-human-ensemble";
import {RISO_PAPER_ARTIST_SHEET} from "../src/video/riso-human-ensemble";
import {RISO_COURIER_SHEET} from "../src/video/riso-character-mesh-sheets";
import {evaluateRiso40PaperGrip} from "../src/video/riso40-paper-fingertip-contact";
import {
 RISO30_ANAT1_HAND,RISO30_GRIP_FOREGROUND_IDS,
 inspectRisoHandArtcraft,risoHandArtcraftParts,layoutRisoHandArtcraft,
} from "../src/video/riso-hand-artcraft";
const actors=[COURIER,PAPER_ARTIST] as const;
const sides=["left","right"] as const;
const frames=[0,46,78,126,144,160,178,198,202,239] as const;
const dist=(a:{x:number;y:number},b:{x:number;y:number})=>Math.hypot(a.x-b.x,a.y-b.y);

describe("RISO30 ArtCraft + ANAT1 source fingertip press engraving",()=>{
  it("references ANAT1 genuine hand-pose/range and surface topology rather than guessed anatomy",()=>{
    expect(RISO30_ANAT1_HAND.anatomicalKnuckleIds).toEqual(
      SURFACE_FORMS.filter(x=>x.region==="hand").map(x=>x.id));
    expect(RISO30_ANAT1_HAND.anatomicalKnuckleIds).toContain("knuckle-arc");
    expect(RISO30_ANAT1_HAND.handLengthMedianMm).toBe(ANSUR.male.measurements.handlength.p50);
    expect(RISO30_ANAT1_HAND.handLengthMedianMm).toBeGreaterThan(150);
    expect(RISO30_ANAT1_HAND.handLengthMedianMm).toBeLessThan(260);
    expect(RISO30_ANAT1_HAND.pinchPose).toEqual(HAND_POSES.pinch(".R"));
    expect(RISO30_ANAT1_HAND.gripPose).toEqual(HAND_POSES.grip(".R"));
    expect(RISO30_ANAT1_HAND.gripPose).not.toEqual(RISO30_ANAT1_HAND.relaxedPose);
    expect(RISO30_ANAT1_HAND.authoredFingerTipUnits.middle)
      .toBeGreaterThan(RISO30_ANAT1_HAND.authoredFingerTipUnits.index);
    expect(RISO30_ANAT1_HAND.authoredFingerTipUnits.index)
      .toBeGreaterThan(RISO30_ANAT1_HAND.authoredFingerTipUnits.ring);
    expect(RISO30_ANAT1_HAND.authoredFingerTipUnits.thumb)
      .toBeLessThan(RISO30_ANAT1_HAND.authoredFingerTipUnits.ring);
  });

  it.each(actors)("%s keeps original 24fps handoff and validates every source ink contour",actor=>{
    expect(inspectRisoCharacter(actor)).toEqual([]);
    expect(actor.durationFrames).toBe(240);
    expect(actor.cadence).toBe(2);
    for(const side of sides){
      const parts=risoHandArtcraftParts(actor.id as "courier"|"paper-artist",side);
      // 14 RISO30 marks, 4 RISO31 DIP creases, the RISO32 thumb-IP crease and 4 RISO37 dorsal planes (23 in all;
      // RISO31's own test pins the same 23). Every one is named so a dropped or renamed mark fails here.
      const digits=["index","middle","ring","pinky"];
      expect(parts.map(p=>p.id).sort()).toEqual([
        "knuckle-arc","thenar-plane","thenar-fold","wrist-crease","thumb-nail","dorsal-tendon",
        ...digits.flatMap(d=>[d+"-nail",d+"-joint-crease",d+"-dip-crease",d+"-dorsal-plane"]),
        "thumb-ip-crease",
      ].map(id=>side+"-glove-"+id).sort());
      const names=parts.map(p=>p.id);
      expect(new Set(names).size).toBe(names.length);
      const specNames=actor.parts.map(p=>p.id);
      expect(new Set(specNames).size).toBe(specNames.length);
      expect(parts.every(p=>p.id.startsWith(side+"-glove-"))).toBe(true);
      expect(parts.every(p=>p.joint.startsWith(side+"-"))).toBe(true);
      expect(parts.every(p=>p.opacity===undefined&&!p.knockoutOnly&&!p.skin)).toBe(true);
      expect(new Set(parts.map(p=>p.plate))).toEqual(new Set(["blue","red"]));
      // Red planes and the fine DIP/IP/dorsal engravings print on the light screen; RISO37 softened the blue nails,
      // thenar fold and wrist crease from solid ink to the mid screen (riso37-anatomical-engraving pins those).
      const midScreen=["thenar-fold","wrist-crease","thumb-nail",...digits.map(d=>d+"-nail")].map(id=>side+"-glove-"+id);
      for(const p of parts.filter(p=>p.paint==="screen"))
        expect(p.screenTone,p.id).toBe(midScreen.includes(p.id)?"mid":"light");
      expect(parts.filter(p=>p.paint==="solid").every(p=>p.plate==="blue")).toBe(true);
      for(const id of ["knuckle-arc","thenar-plane","thenar-fold","wrist-crease",
        "index-nail","middle-nail","ring-nail","pinky-nail","thumb-nail",
        "index-joint-crease","middle-joint-crease","ring-joint-crease","pinky-joint-crease","dorsal-tendon"])
        expect(specNames).toContain(side+"-glove-"+id);
    }
  });

  it("Courier and Artist have independent original knuckle and wrinkle geometry, not one copy-pasted decorative stamp",()=>{
    for(const side of sides){
      const courier=risoHandArtcraftParts("courier",side);
      const artist=risoHandArtcraftParts("paper-artist",side);
      expect(courier.map(x=>x.id)).toEqual(artist.map(x=>x.id));
      expect(courier.filter((x,i)=>x.d!==artist[i].d).length).toBeGreaterThanOrEqual(10);
    }
  });

  it.each(actors)("%s has physically connected 5-digit wrists throughout both film actors and each animation pose",actor=>{
    for(const side of sides)
      for(const f of frames){
        const hand=inspectRisoHandArtcraft(actor,f,side);
        expect(hand.frame).toBe(f);
        expect(hand.plateNames).toEqual(["blue","red"]);
        expect(hand.actuallyEngraved).toBe(true);
        expect(hand.sourceCount).toBeGreaterThan(17);
        expect(hand.fingers).toEqual(["thumb","index","middle","ring","pinky"].map(id=>side+"-"+id));
        expect(hand.independentDigitTransforms).toBe(true);
        expect(hand.palmToFingerRoots.length).toBe(5);
        expect(hand.palmToFingerRoots.every(x=>Number.isFinite(x)&&x>3&&x<30)).toBe(true);
        expect(hand.referenceKnuckleCount).toBeGreaterThan(0);
      }
  });

  it("2D source anatomy meshes expose all five genuine red-plate digits and the palm-surface geometry",()=>{
    for(const actor of actors){
      const sheet=actor.id==="courier"?RISO_COURIER_SHEET:RISO_PAPER_ARTIST_SHEET;
      const regions=sheet.regions.filter(r=>r.category==="hand");
      expect(regions.length).toBeGreaterThan(15);
      for(const side of sides){
        const missing=actor.id==="courier"
          ? ["glove-"+side+"-index","glove-"+side+"-middle","glove-"+side+"-ring","glove-"+side+"-pinky"]
          : ["index","middle","ring","pinky"].map(id=>side+"-glove-"+id);
        for(const id of missing){
          const region=regions.find(r=>r.id===id);
          expect(region,actor.id+" missing 5th finger source region "+id).toBeDefined();
          expect(region!.parts.every(p=>actor.parts.some(part=>part.id===p&&part.plate==="red"))).toBe(true);
        }
        const palm=actor.id==="courier"?"glove-"+side+"-metacarpal":side+"-glove-knuckle-arc";
        expect(regions.find(r=>r.id===palm)).toBeDefined();
      }
    }
  });

  it.each(actors)("%s: true five-finger source crop contains rotating thumb and pinky from entrance through handoff",actor=>{
    for(const side of sides){
      for(let f=0;f<240;f+=2){
        const pose=evaluateRisoCharacter(actor,f);
        const crop=layoutRisoHandArtcraft(pose,side,6.2,446,482);
        expect(crop.scale,actor.id+" broken crop at frame "+f).toBeGreaterThan(2);
        expect(crop.scale).toBeLessThanOrEqual(6.2);
        expect(crop.marginX,actor.id+" hand source clipped horizontally f"+f).toBeGreaterThanOrEqual(35);
        expect(crop.marginY,actor.id+" hand source clipped vertically f"+f).toBeGreaterThanOrEqual(34);
        expect(crop.paperBounds.left).toBeLessThan(crop.paperBounds.right);
        expect(crop.paperBounds.top).toBeLessThan(crop.paperBounds.bottom);
        expect(layoutRisoHandArtcraft(pose,side,6.2,446,482)).toEqual(crop);
      }
    }
  });

  it("new nail beds and finger-fold engravings print ABOVE the real paper at the exact handhold, not as a separate sticker",()=>{
    for(const side of sides){
      const layerIds=RISO30_GRIP_FOREGROUND_IDS(side);
      // RISO32 added the moving thumb-IP crease as the ninth crease (a light screen like the DIP creases).
      expect(layerIds).toHaveLength(14);
      expect(layerIds.every(id=>id.startsWith(side+"-glove"))).toBe(true);
      expect(layerIds.filter(id=>id.includes("nail"))).toHaveLength(5);
      expect(layerIds.filter(id=>id.includes("crease"))).toHaveLength(9);
      expect(layerIds).toContain(side+"-glove-thumb-ip-crease");
      for(const actor of actors)expect(layerIds.every(id=>
        actor.parts.some(p=>p.id===id&&p.plate==="blue"&&
          (id.endsWith("-dip-crease")||id.endsWith("-thumb-ip-crease")
            ? p.paint==="screen"&&p.screenTone==="light"
            : id.endsWith("-nail")
              ? p.paint==="screen"&&p.screenTone==="mid"
              : p.paint==="solid")))).toBe(true);
    }
    for(const aspect of ["landscape","portrait"] as const){
      const first=evaluateRisoHumanEnsemble(160,aspect);
      const received=evaluateRisoHumanEnsemble(202,aspect);
      expect(first.width).toBe(aspect==="landscape"?960:540);
      expect(received.owner).toBe("receiver");
      expect(dist(first.source,received.source)).toBeGreaterThan(10);
      for(const frame of frames){
        const props=evaluateRisoHumanEnsemble(frame,aspect);
        expect(Number.isFinite(props.source.x)&&Number.isFinite(props.receiver.y)).toBe(true);
        const courier=evaluateRisoCharacter(COURIER,frame);
        expect(courier.ik.every(i=>i.reachable)).toBe(true);
        // The source-paper contact points remain anchored to existing
        // hands, regardless of how many individual printed nail contours
        // are added to the real glove source. Since RISO40 the anchor is the
        // midpoint of the opposed thumb-IP and index-DIP pads, not the wrist.
        const grip=evaluateRiso40PaperGrip(COURIER,frame,"right",props.first);
        expect(props.source.x).toBeCloseTo(grip.paperAnchor.x,5);
        expect(props.source.y).toBeCloseTo(grip.paperAnchor.y,5);
        const src=courier.joints.find(j=>j.id==="right-hand")!;
        const wrist={x:props.first.x+src.x*props.first.scale,y:props.first.y+src.y*props.first.scale};
        expect(dist(props.source,wrist)).toBeLessThan(30*props.first.scale);
      }
    }
  });
});
