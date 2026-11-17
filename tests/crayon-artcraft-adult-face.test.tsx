import {describe,expect,it} from "vitest";
import {mkdirSync,writeFileSync} from "node:fs";
import {join} from "node:path";
import {renderToStaticMarkup} from "react-dom/server";
import {inspectCrayonScene,crayonWorldPoint} from "../registry/video/materials/crayon-scene";
import {CrayonScene} from "../registry/video/materials/crayon-scene-react";
import {crayonAdultFaceStudy,portraitCriticalParts} from "../src/video/crayon-artcraft-adult-face-fixtures";
import faceMeta,{AdultFaceThreeQuarter,AdultFacePortrait,AdultFaceArtcraftWorkbench}
  from "../src/video/crayon-artcraft-adult-face.stories";
import * as artcraftStoryExports from "../src/video/crayon-artcraft-adult-face.stories";
import {Cc0SourceRegisteredFaceWorkbench} from "../src/video/crayon-artcraft-adult-face.stories";
import {CRAYON_PORTRAIT_AUDIT,crayonPortraitFrozenAudit}
  from "../src/video/crayon-artcraft-portrait-audit";

describe("ArtCraft v6 reference-led adult portrait construction (not visual approval)",()=>{
  for(const aspect of ["landscape","portrait"] as const){
    it("has independently painted semantic anatomy and solid wax in "+aspect,()=>{
      const scene=crayonAdultFaceStudy(aspect);
      expect(inspectCrayonScene(scene)).toEqual([]);
      const nodes=new Map(scene.elements.map(x=>[x.id,x]));
      expect(new Set(scene.elements.map(x=>x.id)).size).toBe(scene.elements.length);
      for(const id of portraitCriticalParts)expect(nodes.has(id),id).toBe(true);
      expect(scene.elements.length).toBeLessThan(240);
      for(const id of ["adult-face","hair-back",
        "nose-alar-wing",
        "left-eye-aperture","right-eye-aperture","left-upper-lid","right-upper-lid"]){
        const node=nodes.get(id);
        if(node?.kind!=="wax")throw new Error("No semantic wax: "+id);
        expect(node.coverage).toBe("opaque");
        expect((node.d.match(/[CQ]/g)??[]).length).toBeGreaterThanOrEqual(2);
      }
      const firstEye=nodes.get("left-eye-aperture");
      const iris=nodes.get("left-eye-iris");
      const pupil=nodes.get("left-eye-pupil");
      const lid=nodes.get("left-upper-lid");
      if(firstEye?.kind!=="wax"||iris?.kind!=="wax"||
        pupil?.kind!=="wax"||lid?.kind!=="wax")
        throw new Error("Unstructured eye paint");
      expect(firstEye.timing.start).toBeLessThan(iris.timing.start);
      expect(lid.timing.start).toBeLessThan(pupil.timing.start);
      expect(firstEye.timing.end).toBeLessThan(pupil.timing.end);
      const face=nodes.get("adult-face");
      if(face?.kind!=="wax")throw new Error("No adult cranium");
      expect(face.bounds.height/face.bounds.width).toBeGreaterThan(1.45);
      // ArtCraft rejected the elongated forehead/cheek/chin macro silhouette.
      // Test the actual rigged world geometry, not only untransformed bounds.
      expect(face.placement?.scaleY).toBeCloseTo(.82);
      expect(face.pivot).toEqual({x:0,y:-140});
      const skullTop=crayonWorldPoint(scene,face,299,{x:15,y:-290});
      const chin=crayonWorldPoint(scene,face,299,{x:27,y:99});
      const faceLeft=crayonWorldPoint(scene,face,299,{x:-128,y:-92});
      const faceRight=crayonWorldPoint(scene,face,299,{x:128,y:-92});
      const screenRatio=(chin.y-skullTop.y)/(faceRight.x-faceLeft.x);
      expect(screenRatio).toBeGreaterThan(1.15);
      expect(screenRatio).toBeLessThan(1.4);
      const uncompressed=crayonAdultFaceStudy(aspect,{headScaleY:1});
      const oldFace=uncompressed.elements.find(n=>n.id==="adult-face");
      if(!oldFace)throw new Error("Missing uncompressed head");
      const oldTop=crayonWorldPoint(uncompressed,oldFace,299,{x:15,y:-290});
      const oldChin=crayonWorldPoint(uncompressed,oldFace,299,{x:27,y:99});
      expect(chin.y-skullTop.y).toBeCloseTo(.82*(oldChin.y-oldTop.y),4);
      // Eyes, nose, hair and face are one shared facial rig, not
      // independently shifted/hand-aligned sticker layers.
      for(const id of ["left-eye-aperture","right-eye-iris","nose-bridge",
        "lip-upper-volume","hair-crown-part","forelock-loose-curl"]){
        const n=nodes.get(id);
        if(!n)throw Error("Missing attached structure "+id);
        const v=crayonWorldPoint(scene,n,299,{x:0,y:0});
        const u=crayonWorldPoint(uncompressed,
          uncompressed.elements.find(x=>x.id===id)!,299,{x:0,y:0});
        expect(v.x).toBeCloseTo(u.x,4);
        expect(v.y).not.toBeNaN();
      }
      const near=nodes.get("left-eye-aperture");
      const far=nodes.get("right-eye-aperture");
      if(near?.kind!=="wax"||far?.kind!=="wax")throw new Error("Missing eyes");
      // Eye symbols must not overwhelm adult face construction.
      expect(near.bounds.width/face.bounds.width).toBeLessThan(.3);
      expect(far.bounds.width/face.bounds.width).toBeLessThan(.23);
      expect(nodes.get("near-iris-radials")?.parentId).toBe("left-eye-iris");
      expect(nodes.get("far-iris-radials")?.parentId).toBe("right-eye-iris");
      for(const id of ["left-eye-iris","right-eye-iris"]){
        const iris=nodes.get(id);
        if(iris?.kind!=="wax")throw new Error("Missing rounded human iris");
        expect(iris.bounds.width/iris.bounds.height).toBeGreaterThan(.85);
        expect(iris.bounds.width/iris.bounds.height).toBeLessThan(1.1);
      }
      for(const [id,parent] of [
        ["eye-cast-shadow-near","left-eye-aperture"],
        ["eye-cast-shadow-far","right-eye-aperture"],
        ["iris-fibers-near","left-eye-iris"],
        ["iris-fibers-far","right-eye-iris"],
        ["brow-fibers-near","adult-face"],
        ["brow-fibers-far","adult-face"],
        ["near-iris-limbal-ring","left-eye-iris"],
        ["far-iris-limbal-ring","right-eye-iris"],
      ] as const){
        const layer=nodes.get(id);
        expect(layer?.parentId,id).toBe(parent);
        if(layer?.kind==="contour"){
          expect(layer.clipToParent,id).toBe(true);
          expect(layer.d.length).toBeGreaterThan(30);
        }else if(layer?.kind==="wax"){
          expect(layer.clipToParent,id).toBe(true);
          expect(layer.coverage).toBe("open");
        }else throw new Error("Missing eye or eyebrow layer "+id);
      }
      for(const id of ["cheek-malar-crayon-red","cheek-far-crayon-red"]){
        const node=nodes.get(id);
        if(node?.kind!=="wax")throw new Error("Missing pigmented cheek "+id);
        expect(node.coverage).toBe("open");
        expect(node.clipToParent).toBe(true);
        expect(node.blendRadius).toBeGreaterThan(0);
        expect(node.markStrength).toBeGreaterThan(id==="cheek-malar-crayon-red"?.1:.2);
        if(id==="cheek-malar-crayon-red")expect(node.blendRadius).toBeGreaterThanOrEqual(12);
      }
      const focus=nodes.get("cheek-saturated-contact");
      if(focus?.kind!=="wax")throw new Error("Missing localized cheek contact");
      expect(focus.parentId).toBe("adult-face");
      expect(focus.bounds.width).toBeLessThan(60);
      expect(focus.blendRadius).toBeLessThan(9);
      const alarWing=nodes.get("nose-alar-wing");
      if(alarWing?.kind!=="wax")throw new Error("Missing alar wing");
      expect(alarWing.bounds.width).toBeLessThan(45);
      const septum=nodes.get("nose-septum-alar");
      if(septum?.kind!=="contour")throw new Error("Missing nose septum");
      expect(septum.width).toBeLessThan(1);
      const tip=nodes.get("nose-tip-underpaint");
      if(tip?.kind!=="wax")throw new Error("Missing nasal tip wash");
      expect(tip.blendRadius).toBeGreaterThanOrEqual(8);
      expect(nodes.get("forelock-loose-curl")?.kind).toBe("wax");
      expect(nodes.get("forelock-underturn")?.parentId).toBe("forelock-loose-curl");
      for(const id of ["forelock-fiber-direction","upper-lashes-rooted-near",
        "upper-lashes-rooted-far","nose-septum-alar","dorsum-nose-bone-line"]){
        const node=nodes.get(id);
        expect(node?.kind,id).toBe("contour");
      }
      expect(nodes.get("hair-left-lower-wave")?.kind).toBe("wax");
      expect(nodes.get("hair-nape-sweep")?.kind).toBe("wax");
      expect(nodes.get("tailored-scarf-wrap")?.parentId).toBe("coat-silhouette");
      expect(nodes.get("tailored-scarf-weft")?.parentId).toBe("tailored-scarf-wrap");
      const centerLace=nodes.get("shirt-lace-ruffle-center");
      if(centerLace?.kind!=="wax")throw new Error("Missing connected middle lace");
      expect(centerLace.coverage).toBe("opaque");
      expect(centerLace.parentId).toBe("shirt-linen");
      expect((centerLace.d.match(/[CQ]/g)??[]).length).toBeGreaterThan(5);
      for(const id of ["shirt-linen-pleat-near","shirt-linen-pleat-far"]){
        const layer=nodes.get(id);
        if(layer?.kind!=="wax")throw new Error("Missing linen pleat "+id);
        expect(layer.coverage).toBe("open");
        expect(layer.parentId).toBe("shirt-linen");
        expect(layer.clipToParent).toBe(true);
      }
      for(const id of ["coat-sleeve-cap-near","coat-sleeve-cap-far",
        "coat-collar-left","coat-collar-right",
        "shirt-lace-ruffle-left","shirt-lace-ruffle-right"]){
        const node=nodes.get(id);
        if(node?.kind!=="wax")throw new Error("Missing tailored silhouette "+id);
        expect(node.coverage).toBe("opaque");
        expect(node.d.match(/[CQ]/g)?.length??0).toBeGreaterThan(3);
      }
      for(const id of ["coat-collar-felt-near","coat-collar-felt-far",
        "scarf-overlap-fold"]){
        const node=nodes.get(id);
        if(node?.kind!=="wax")throw new Error("Missing attached cloth fold "+id);
        expect(node.coverage).toBe("open");
        expect(node.clipToParent).toBe(true);
        expect(node.blendRadius).toBeGreaterThan(0);
      }
      for(const id of ["shirt-lace-edge-scallops","shirt-lace-eyelets",
        "coat-sleeve-attachment-near","coat-sleeve-attachment-far",
        "coat-body-tailoring-darts","coat-lapel-roll-near","coat-lapel-roll-far"]){
        const node=nodes.get(id);
        if(node?.kind!=="contour")throw new Error("Missing tailored stitching "+id);
        expect(node.clipToParent).toBe(true);
      }
      const neckPlane=nodes.get("neck-lateral-turn");
      if(neckPlane?.kind!=="wax")throw new Error("Missing attached lateral neck");
      expect(neckPlane.coverage).toBe("open");
      expect(neckPlane.clipToParent).toBe(true);
      expect(neckPlane.parentId).toBe("neck-under-jaw");
      expect(nodes.get("nose-sidewall-form-hatching")?.parentId).toBe("adult-face");
      const noseGrain=nodes.get("nose-sidewall-form-hatching");
      expect(noseGrain?.kind).toBe("contour");
      if(noseGrain?.kind==="contour")expect(noseGrain.clipToParent).toBe(true);
      const neck=nodes.get("neck-under-jaw");
      const scarf=nodes.get("tailored-scarf-wrap");
      const collarShadow=nodes.get("neck-jaw-cast-shadow");
      if(neck?.kind!=="wax"||scarf?.kind!=="wax"||collarShadow?.kind!=="wax")
        throw new Error("Missing neck anatomy or connected garment");
      expect(neck.markStrength).toBeLessThan(.4);
      expect(neck.underpaintGradient).toBeDefined();
      expect(scarf.bounds.y).toBeLessThan(95);
      expect(scarf.bounds.y).toBeLessThan(neck.bounds.y+neck.bounds.height-45);
      expect(collarShadow.parentId).toBe("neck-under-jaw");
      expect(collarShadow.coverage).toBe("open");
      expect(collarShadow.clipToParent).toBe(true);
      expect(nodes.get("nose-dorsal-soft-edge")?.kind).toBe("contour");
      for(const id of ["cheek-malar-glow","far-cheek-reflection",
        "freckles-near","freckles-far","forelock-woodgrain",
        "temple-curl-inner-flow","far-curl-inner-flow",
        "coat-brass-button-one","coat-brass-button-two",
        "coat-hand-sewn-piping","scarf-woven-check-diagonal",
        "linen-floral-embroidery"]){
        expect(nodes.has(id),id).toBe(true);
      }
      for(const feature of ["nose-tip-underpaint","nose-root-sunlight",
        "cheek-warm-pigment","tear-trough-value"]){
        const region=nodes.get(feature);
        if(region?.kind!=="wax")throw new Error("Missing medium-aware face part "+feature);
        expect(region.coverage).toBe("open");
        expect(region.clipToParent).toBe(true);
        expect(region.parentId).toBe("adult-face");
      }
      const blouse=nodes.get("shirt-linen");
      if(blouse?.kind!=="wax")throw new Error("Missing blouse");
      expect(blouse.bounds.width/blouse.bounds.height).toBeLessThan(.96);
      expect(blouse.bounds.width).toBeGreaterThan(160);
      expect(blouse.bounds.height).toBeGreaterThan(190);
      const knot=nodes.get("scarf-overlap-knot");
      if(knot?.kind!=="wax")throw new Error("Unattached woven scarf knot");
      expect(knot.parentId).toBe("coat-silhouette");
      expect(knot.coverage).toBe("opaque");
      expect(knot.bounds.y).toBeLessThan(118);
      const buttons=["coat-brass-button-one","coat-brass-button-two"]
        .map(id=>nodes.get(id));
      for(const b of buttons){
        if(b?.kind!=="wax")throw new Error("Missing brass closure");
        expect(b.bounds.x).toBeLessThan(-95);
      }
      const nose=nodes.get("nose-bridge");
      if(nose?.kind!=="wax")throw new Error("Missing nose");
      expect(nose.coverage).toBe("open");
      const bg=nodes.get("paper-value");
      expect(bg?.kind==="wax"&&bg.coverage).toBe("open");
      // Tonal masses are now translucent rubs OVER solid human underpainting.
      // This is physically layered wax, not a see-through character mask.
      for(const tonal of ["temple-cool","forehead-ochre","left-cheek-volume",
        "right-cheek-receding","malar-reflection","mandible-plane",
        "left-supraorbital","right-supraorbital","nose-sidewall",
        "nose-bridge","lip-upper-volume","lip-lower-volume",
        "nose-tip-reflected-wax","hair-amber-crown-glaze"]){
        const patch=nodes.get(tonal);
        if(patch?.kind!=="wax")throw new Error("Missing tonal wax "+tonal);
        expect(patch.coverage).toBe("open");
        expect(patch.parentId).toBe(patch.id==="hair-amber-crown-glaze"?
          "hair-crown-part":"adult-face");
        expect(patch.clipToParent).toBe(true);
        expect(patch.blendRadius).toBeGreaterThan(0);
        expect(patch.blendRadius).toBeLessThanOrEqual(18);
      }
      const human=nodes.get("adult-face");
      expect(human?.kind==="wax"&&human.coverage).toBe("opaque");
      expect(nodes.get("hair-back")?.parentId).toBe("adult-face");
      const hair=nodes.get("hair-back");
      const torso=nodes.get("coat-silhouette");
      if(!hair||!torso)throw new Error("Missing framing masses");
      const crown=crayonWorldPoint(scene,hair,299,{x:-25,y:-318});
      const hem=crayonWorldPoint(scene,torso,299,{x:120,y:326});
      expect(crown.y).toBeGreaterThan(8);
      expect(hem.y).toBeLessThan(scene.height-8);
      expect(crown.x).toBeGreaterThan(8);
      expect(crown.x).toBeLessThan(scene.width-8);
      for(const id of ["rooted-crown-direction","rooted-temple-direction",
        "rooted-far-wave","left-cheek-layered-wax",
        "nose-sidewall-wax","coat-wool-broken-rub"]){
        const node=nodes.get(id);
        if(node?.kind!=="contour")throw new Error("No local line: "+id);
        expect(node.clipToParent).toBe(true);
        expect(node.d.length).toBeGreaterThan(100);
      }
      const html=renderToStaticMarkup(<CrayonScene spec={scene} frame={299}/>);
      expect(html).toContain('data-km-crayon-scene="'+scene.id+'"');
      expect(html).toContain('data-km-crayon-element="adult-face"');
      expect(html).toContain('data-km-crayon-element="left-upper-lid"');
      expect(html).toContain('data-km-crayon-underpaint="opaque"');
      expect(html).toContain('data-km-crayon-soft-glaze="');
      expect(html).toContain('data-km-crayon-clipped-to="adult-face"');
      expect(html).not.toContain('data-km-crayon-lettering=');
      expect(renderToStaticMarkup(<CrayonScene spec={scene} frame={299}/>)).toBe(html);
    });
  }
  it("does not expose the rejected blue-coat bust or its old Storybook states",()=>{
    const removed=[
      "AdultFaceThreeQuarter","AdultFacePortrait","AdultFaceConstruction",
      "MatchedExpressionComparison","MatchedExpressionPortrait",
      "EyeStructureMacro","LipAndNoseMacro","TailoredGarmentMacro","MatchedEyesMacro",
    ];
    for(const exportName of removed)
      expect(artcraftStoryExports,exportName).not.toHaveProperty(exportName);
    expect(faceMeta.component).toBe(Cc0SourceRegisteredFaceWorkbench);
  });
  it("keeps unfinished face studies out of public Storybook",()=>{
    expect(faceMeta.tags).toContain("!dev");
    expect(faceMeta.title).toBe("Video production/Film Looks/Crayon/ArtCraft Adult Face Lab");
    expect(AdultFaceThreeQuarter.args??{}).toEqual({});
    expect(AdultFacePortrait.args?.aspect).toBe("portrait");
  });
  it("rejects real 2026-11-14 reference alignment rather than rewarding cosmetic wax",()=>{
    const audit=crayonPortraitFrozenAudit();
    expect(CRAYON_PORTRAIT_AUDIT.source.license).toBe("CC0 1.0");
    expect(CRAYON_PORTRAIT_AUDIT.source.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(CRAYON_PORTRAIT_AUDIT.candidate.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(audit.inspectedLandmarks).toBe(18);
    expect(audit.failedLandmarks).toHaveLength(17);
    expect(audit.failedTonalRegions.map(x=>x.region))
      .toEqual(["eye_socket","nose_planes","cheek_planes","lips"]);
    expect(audit.artisticApproval).toBe(false);
    expect(audit.sourceOriginalBytesAvailable).toBe(false);
    expect(audit.status).toBe("REJECT");
    expect(audit.faceAspectError).toBeLessThan(.16);
  });
  it("offers opt-in visible CC0 audit without contaminating normal native art",()=>{
    const args={aspect:"portrait" as const,detail:1,expression:"warm" as const,
      headScaleY:.82,startFrame:299,playbackRate:1,loop:false};
    const normal=renderToStaticMarkup(<AdultFaceArtcraftWorkbench {...args}/>);
    expect(normal).toContain('data-km-crayon-source-review="off"');
    expect(normal).not.toContain("CC0 photographic anatomy reference");
    const review=renderToStaticMarkup(<AdultFaceArtcraftWorkbench {...args}
      referenceReview showCandidateLandmarks/>);
    expect(review).toContain('data-km-crayon-portrait-audit="REJECT"');
    expect(review).toContain("17/18");
    expect(review).toContain("4/5");
    expect(review).toContain("CC0 photographic anatomy reference");
    expect((review.match(/data-km-crayon-portrait-landmark=/g)??[])).toHaveLength(18);
    const unaligned=renderToStaticMarkup(<AdultFaceArtcraftWorkbench {...args}
      aspect="landscape" referenceReview showCandidateLandmarks/>);
    expect(unaligned).not.toContain('data-km-crayon-portrait-landmark=');
    expect(unaligned).toContain("these current controls differ");
  });
  it("hand-authors distinct lip and commissure geometry for a warm expression",()=>{
    const smiling=crayonAdultFaceStudy("landscape",{expression:"warm"});
    const neutral=crayonAdultFaceStudy("landscape",{expression:"neutral"});
    for(const id of ["lip-upper-volume","lip-lower-volume","mouth-commissures"]){
      const a=smiling.elements.find(n=>n.id===id),b=neutral.elements.find(n=>n.id===id);
      if((a?.kind!=="wax"&&a?.kind!=="contour")||
        (b?.kind!=="wax"&&b?.kind!=="contour"))
        throw new Error("missing "+id);
      expect(a.d).not.toBe(b.d);
    }
    for(const scene of [smiling,neutral]){
      const elements=new Map(scene.elements.map(n=>[n.id,n]));
      const lip=elements.get("lip-upper-volume");
      const cleft=elements.get("mouth-commissures");
      const garment=elements.get("coat-silhouette");
      const sleeve=elements.get("coat-sleeve-cap-near");
      if(lip?.kind!=="wax"||cleft?.kind!=="contour"||
        garment?.kind!=="wax"||sleeve?.kind!=="wax")
        throw new Error("No native paint planes");
      expect((cleft.d.match(/M/g)??[]).length).toBeGreaterThanOrEqual(2);
      expect(lip.d).toMatch(/Q/);
      // A portrait bust should continue past the 9:16 bottom edge instead
      // of ending both sleeves as detached rounded stumps in mid-frame.
      expect(garment.bounds.y+garment.bounds.height).toBeGreaterThan(440);
      expect(sleeve.bounds.y+sleeve.bounds.height).toBeGreaterThan(440);
    }
    expect(()=>crayonAdultFaceStudy("landscape",{expression:"surprised" as "warm"}))
      .toThrow(/Invalid ArtCraft facial study/);
    expect(inspectCrayonScene(smiling)).toEqual([]);
    expect(inspectCrayonScene(neutral)).toEqual([]);
  });
  it("rejects invalid detail and animates wax at separate stages",()=>{
    expect(()=>crayonAdultFaceStudy("landscape",{detail:-.1})).toThrow();
    expect(()=>crayonAdultFaceStudy("portrait",{detail:NaN})).toThrow();
    expect(()=>crayonAdultFaceStudy("landscape",{headScaleY:.71})).toThrow();
    expect(()=>crayonAdultFaceStudy("portrait",{headScaleY:1.001})).toThrow();
    expect(()=>crayonAdultFaceStudy("portrait",{headScaleY:NaN})).toThrow();
    const scene=crayonAdultFaceStudy("landscape",{detail:.7});
    expect(inspectCrayonScene(scene)).toEqual([]);
    const start=renderToStaticMarkup(<CrayonScene spec={scene} frame={3}/>);
    const end=renderToStaticMarkup(<CrayonScene spec={scene} frame={299}/>);
    expect(start).not.toEqual(end);
    expect(end).toContain('data-km-crayon-anatomical-mask=');
  });
  it("exports actual React renderer SVGs for 1x/3x ArtCraft inspection when explicitly requested",()=>{
    if(process.env.KUMIKI_CRAYON_ARTCRAFT_PROOF!=="1")return;
    const dir="dist/crayon-artcraft-face-proof";
    mkdirSync(dir,{recursive:true});
    for(const aspect of ["landscape","portrait"] as const){
      const scene=crayonAdultFaceStudy(aspect);
      for(const frame of [1,75,160,235,299]){
        const svg=renderToStaticMarkup(<CrayonScene spec={scene} frame={frame}/>);
        writeFileSync(join(dir,"adult-face-"+aspect+"-"+frame+".svg"),svg);
      }
    }
  });
});
