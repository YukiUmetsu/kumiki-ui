import { describe, expect, it } from "vitest";
import { BoxGeometry, Group, Mesh, MeshStandardMaterial, Object3D, PerspectiveCamera } from "three";
import type { BufferGeometry } from "three";
import type { HeroAsset } from "../registry/craft/hero-asset";
import { inspectHeroAsset, inspectHeroApproval } from "../registry/craft/hero-quality-gate";
import type { HeroApprovalEvidence } from "../registry/craft/hero-quality-gate";
import { heroCatalog } from "../registry/domains/hero-catalog";
import { bindScreenSurface, displayFace, fitScreenContent, screenCanvasSize } from "../registry/craft/screen-surface";
import { fitHeroCamera } from "../registry/craft/hero-viewer";
import type { HeroView } from "../registry/craft/hero-viewer";
import { createLaptop, createSmartphone } from "../registry/domains/technology-3d";
import approvals from "../docs/verification/hero-approvals.json";
import { createPadlock } from "../registry/domains/privacy-3d";

function assetFixture(): HeroAsset {
  const group=new Group();
  const mesh=new Mesh(new BoxGeometry(1,1,1),new MeshStandardMaterial({
    metalness:.25,roughness:.6,
  }));
  mesh.name="functional-part"; group.add(mesh);
  return { id:"sample",group,tier:"hero",metersPerUnit:.1,
    bounds:{min:[-1,-1,-1],max:[1,1,1]},parts:new Map([["functional-part",mesh]]),
    craft:{materials:["brushed metal"],details:["threaded panel"]},
    actions:[{id:"open",label:"Open",meaning:"Reveals the contents",
      durationFrames:30,loop:false}],pose:()=>{},
    dispose:()=>{mesh.geometry.dispose();(mesh.material as MeshStandardMaterial).dispose();},
  };
}
const HASH="a".repeat(64);
function reviewFixture(): HeroApprovalEvidence {
  return {kind:"sample",reviewer:"Test reviewer",reviewedAt:"2026-10-19",
    decision:"approved",notes:"Inspected material, build and proportion against specific photos.",
    referenceUrls:["https://example.org/reference/photo-of-sample"],
    sourceFiles:[{path:"registry/craft/hero-asset.ts",sha256:HASH}],
    captures:(["front","quarter","side","detail"] as const).map((view,index)=>({
      view,path:`docs/verification/assets/hero/${view}.png`,sha256:String(index+1).repeat(64),
      width:1280,height:720,
    })),
  };
}
describe("Zero-token 3D asset structure gate",()=>{
  it("accepts meaningful physical metadata and attached semantic parts",()=>{
    const a=assetFixture();
    const report=inspectHeroAsset(a);
    expect(report.ok).toBe(true);
    expect(report.meshCount).toBe(1);
    expect(report.namedPartCount).toBe(1);
    expect(report.materialCount).toBe(1);
    a.dispose();
  });
  it("catches nonfinite geometry transforms and unsupported material parameters",()=>{
    const a=assetFixture();
    a.group.children[0].position.x=Number.NaN;
    (a.group.children[0] as Mesh).material=new MeshStandardMaterial({roughness:1.8});
    const report=inspectHeroAsset(a);
    expect(report.ok).toBe(false);
    expect(report.issues.map(x=>x.code)).toContain("nonfinite-transform");
    expect(report.issues.map(x=>x.code)).toContain("roughness-range");
    a.dispose();
  });
  it("rejects detached named parts, bad physical scale, invalid bounds and actions without pose",()=>{
    const a=assetFixture();
    a.parts=new Map([["orphan",new Object3D()]]);
    a.metersPerUnit=0;
    a.bounds={min:[0,0,0],max:[0,1,1]};
    a.pose=undefined;
    const codes=inspectHeroAsset(a).issues.map(x=>x.code);
    expect(codes).toContain("part-attachment");
    expect(codes).toContain("physical-scale");
    expect(codes).toContain("bounds");
    expect(codes).toContain("missing-pose");
    a.dispose();
  });
  it("audits an actual domain asset without WebGL or browser rendering",()=>{
    const a=createPadlock({id:"real-padlock"});
    const report=inspectHeroAsset(a);
    expect(report.meshCount).toBeGreaterThan(0);
    expect(report.ok).toBe(true);
    a.dispose();
  });
});
describe("Human-photo review evidence: deterministic preflight",()=>{
  it("accepts an explicit complete four-view proof contract, not an image quality guess",()=>{
    expect(inspectHeroApproval(reviewFixture())).toEqual([]);
  });
  it("rejects missing evidence, duplicate views, forged source paths and generic reference home pages",()=>{
    const x=reviewFixture();
    const changed:HeroApprovalEvidence={
      ...x,referenceUrls:["https://example.org/"],sourceFiles:[
        {path:"../secrets.txt",sha256:HASH},
      ],captures:x.captures.slice(1),
    };
    const codes=inspectHeroApproval(changed).map(y=>y.code);
    expect(codes).toContain("review-references");
    expect(codes).toContain("review-source-hash");
    expect(codes).toContain("review-view-missing");
  });
  it("rejects a single screenshot reused across four claimed angles",()=>{
    const evidence=reviewFixture();
    const reused:HeroApprovalEvidence={...evidence,captures:evidence.captures.map(
      (frame,index)=>({...frame,sha256:index===0?frame.sha256:evidence.captures[0].sha256}),
    )};
    expect(inspectHeroApproval(reused).map(x=>x.code)).toContain("review-reused-image");
  });
  it("prevents silently promoting unknown or unapproved assets",()=>{
    const kinds=new Set(heroCatalog().map(e=>e.kind));
    expect(kinds.size).toBe(heroCatalog().length);
    expect(approvals.schemaVersion).toBe(1);
    const reviewed=new Set<string>();
    for(const record of approvals.approvals as HeroApprovalEvidence[]){
      expect(kinds.has(record.kind)).toBe(true);
      expect(reviewed.has(record.kind)).toBe(false);
      reviewed.add(record.kind);
      expect(inspectHeroApproval(record)).toEqual([]);
    }
    // Existing assets remain WIP until evidenced, reviewed and deliberately approved.
    expect(approvals.approvals).toHaveLength(0);
  });
});

/** The camera HeroAssetViewer builds for an orbit view, so projections match what is drawn. */
function viewCamera(asset: HeroAsset, view: HeroView, width: number, height: number) {
  const pose = fitHeroCamera(asset, view, width / height);
  const camera = new PerspectiveCamera(pose.fov, width / height, pose.near, pose.far);
  camera.position.set(...pose.position);
  camera.lookAt(...pose.target);
  camera.updateMatrixWorld();
  return camera;
}

describe("ScreenSurface display binding", () => {
  it("reads each display face from its UVs: true aspect, full coverage, visible side", () => {
    const laptop = createLaptop(), phone = createSmartphone();
    const lapFace = displayFace((laptop.parts.get("laptop-display") as Mesh).geometry as BufferGeometry)!;
    expect(lapFace.aspect).toBeCloseTo((30.4 - 2) / (21.2 - 2.9), 3);
    expect(lapFace.fullUv).toBe(true);
    expect([lapFace.uAxis, lapFace.normalAxis, lapFace.vAxis]).toEqual([0, 1, 2]);
    const phoneFace = displayFace((phone.parts.get("phone-display") as Mesh).geometry as BufferGeometry)!;
    expect(phoneFace.aspect).toBeCloseTo((7.15 - .5) / (14.7 - .5), 3);
    expect(phoneFace.fullUv).toBe(true);
    expect(phoneFace.normalAxis).toBe(1);
    laptop.dispose(); phone.dispose();
  });

  it("paints to the display's own aspect, so content is never stretched", () => {
    expect(screenCanvasSize(1.5519, 2048)).toEqual({ width: 2048, height: 1320 });
    expect(screenCanvasSize(.4683, 2048)).toEqual({ width: 959, height: 2048 });
    // contain letterboxes a 4:3 image on a 16:9-ish area; cover crops it instead.
    expect(fitScreenContent(390, 800, 780, 780, "contain")).toEqual({ x: 0, y: 205, width: 390, height: 390 });
    const cover = fitScreenContent(390, 800, 780, 780, "cover");
    expect(cover.width).toBeCloseTo(800, 6); expect(cover.height).toBeCloseTo(800, 6); expect(cover.x).toBeCloseTo(-205, 6);
  });

  it("reports a missing or invalid part as an error instead of throwing, and keeps the asset untouched", () => {
    const phone = createSmartphone();
    const display = phone.parts.get("phone-display") as Mesh, before = display.material as MeshStandardMaterial, map = before.emissiveMap;
    const missing = bindScreenSurface(phone, { part: "phone-glass", content: { kind: "paint", draw: () => {} } });
    expect(missing.status).toBe("error");
    expect(missing.diagnostics().map(d => d.code)).toEqual(["screen-surface-part-missing"]);
    const notMesh = bindScreenSurface(phone, { part: "phone-body", content: { kind: "paint", draw: () => {} } });
    expect(notMesh.diagnostics()[0]).toMatchObject({ code: "screen-surface-part-invalid", severity: "error" });
    expect(display.material).toBe(before);
    expect(before.emissiveMap).toBe(map);
    phone.dispose();
  });

  it("without a canvas (Node, jsdom) reports unpainted, keeps the display's canvas geometry and paints nothing", () => {
    const phone = createSmartphone();
    const surface = bindScreenSurface(phone, { part: "phone-display", content: { kind: "paint", draw: () => {} } });
    expect(surface.status).toBe("unpainted");
    expect(surface.diagnostics().map(d => d.code)).toContain("screen-surface-no-canvas");
    expect(surface.canvas!.width / surface.canvas!.height).toBeCloseTo((7.15 - .5) / (14.7 - .5), 2);
    expect(surface.paintAt(0)).toBe(false);
    surface.dispose();
    phone.dispose();
  });

  it("projects the display's corners in screen order and faces the camera at the default pose", () => {
    const phone = createSmartphone();
    const surface = bindScreenSurface(phone, { part: "phone-display", content: { kind: "paint", draw: () => {} }, designWidth: 390 });
    phone.pose?.({ id: null, frame: 0, fps: 30 });
    const projection = surface.project(viewCamera(phone, { azimuth: 0, elevation: 0 }, 540, 960), 540, 960)!;
    const [tl, tr, br, bl] = projection.corners;
    expect(tl.y).toBeLessThan(bl.y);           // the display's top is up on screen
    expect(tl.x).toBeLessThan(tr.x);
    expect(Math.abs(tl.y - tr.y)).toBeLessThan(Math.abs(tl.x - tr.x) * .2); // upright, nearly level
    expect(projection.facing).toBeGreaterThan(0);
    expect(projection.inside).toBe(true);
    expect(Math.hypot(br.x - tl.x, br.y - tl.y)).toBeGreaterThan(0);
    surface.dispose(); phone.dispose();
  });

  it("moves the projected corners with the device and reports facing away when the display turns from the camera", () => {
    const phone = createSmartphone();
    const surface = bindScreenSurface(phone, { part: "phone-display", content: { kind: "paint", draw: () => {} }, designWidth: 390 });
    const camera = viewCamera(phone, { azimuth: 0, elevation: 0 }, 540, 960);
    phone.pose?.({ id: null, frame: 0, fps: 30 });
    const rest = surface.project(camera, 540, 960)!;
    phone.pose?.({ id: "turn", frame: 30, fps: 30 }); // halfway: the device has turned 180°
    const turned = surface.project(camera, 540, 960)!;
    expect(turned.facing).toBeLessThan(0);
    expect(surface.diagnostics(camera, 540, 960).map(d => d.code)).toContain("screen-surface-facing-away");
    expect(Math.abs(turned.center.x - rest.center.x) + Math.abs(turned.corners[0].x - rest.corners[0].x)).toBeGreaterThan(1);
    phone.pose?.({ id: null, frame: 0, fps: 30 });
    expect(surface.project(camera, 540, 960)!.corners[0].x).toBeCloseTo(rest.corners[0].x, 6);
    surface.dispose(); phone.dispose();
  });

  it("flags text that would render too small on screen, and clears the flag once the camera is close enough", () => {
    const phone = createSmartphone();
    const surface = bindScreenSurface(phone, { part: "phone-display", content: { kind: "paint", draw: () => {} }, designWidth: 390, minTextPx: 14, minScreenTextPx: 9 });
    phone.pose?.({ id: null, frame: 0, fps: 30 });
    const far = surface.diagnostics(viewCamera(phone, { azimuth: 0, elevation: 0, zoom: 1 }, 540, 960), 540, 960);
    expect(far.map(d => d.code)).toContain("screen-surface-unreadable");
    const near = surface.diagnostics(viewCamera(phone, { azimuth: 0, elevation: 0, zoom: 3 }, 540, 960), 540, 960);
    expect(near.map(d => d.code)).not.toContain("screen-surface-unreadable");
    surface.dispose(); phone.dispose();
  });
});
