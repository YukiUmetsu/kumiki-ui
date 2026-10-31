import { describe, expect, it } from "vitest";
import { inspectHeroAsset } from "../registry/craft/hero-quality-gate";
import {
  createEverydayDeskScene, evaluateEverydayCamera, toEverydayBookSpec, validateEverydaySceneSpec,
} from "../registry/video/everyday-scenes-3d";
import type { EverydaySceneSpec } from "../registry/video/everyday-scenes-3d";
import { createBookHero3D, createBookOnDesk3D } from "../src/components/video/scene-book-3d";
import { Box3 } from "three";
import type { MeshPhysicalMaterial } from "three";
import type { Mesh } from "three";

const scene = (recipeId: EverydaySceneSpec["recipeId"]): EverydaySceneSpec => ({
  schemaVersion: 1, id: "example", recipeId,
  fps: { num: 30, den: 1 }, durationFrames: 150, width: 960, height: 540,
  content: { title: "How a document becomes a record", caption: "A clear documented handoff",
    document: { title: "INVOICE", total: "$ 580.00" }, software: { title: "Processed", status: "Saved to records" },
    pages: [{ heading: "A beginning", text: "The first page tells us where to look." },
      { heading: "A discovery", text: "The next page leads us onward." },
      { heading: "A resolution", text: "A compelling ending deserves a pause." }] },
});

describe("everyday 3D recipes", () => {
  it("requires valid dimensions, positive fps, known recipe and authored document content", () => {
    expect(() => validateEverydaySceneSpec(scene("cinematic-desk-explainer"))).not.toThrow();
    expect(() => validateEverydaySceneSpec({ ...scene("invoice-to-software"), width: 0 })).toThrow(/width/);
    expect(() => validateEverydaySceneSpec({ ...scene("invoice-to-software"), fps: { num: 0, den: 1 } })).toThrow(/fps/);
    expect(() => validateEverydaySceneSpec({ ...scene("invoice-to-software"), recipeId: "invalid" as never })).toThrow(/recipe/);
    expect(() => validateEverydaySceneSpec({ ...scene("invoice-to-software"), deskFinish: "glossy" as never })).toThrow(/finish/);
    expect(() => validateEverydaySceneSpec({ ...scene("invoice-to-software"), lightingPreset: "rainbow" as never })).toThrow(/lighting/);
    expect(() => validateEverydaySceneSpec(scene("document-investigation"))).toThrow(/highlightRow/);
    expect(() => validateEverydaySceneSpec({ ...scene("document-investigation"), content: {
      ...scene("document-investigation").content,
      document: { rows: [{ label: "Selected", value: "125" }] }, highlightRow: 2,
    } })).toThrow(/highlightRow/);
    expect(() => validateEverydaySceneSpec({ ...scene("invoice-to-software"),
      content: { ...scene("invoice-to-software").content, software: { title: "", status: "saved" } } })).toThrow(/Software/);
  });

  it.each(["cinematic-desk-explainer", "invoice-to-software"] as const)("composes %s using existing crafted assets", recipeId => {
    const asset = createEverydayDeskScene(scene(recipeId));
    try {
      const report = inspectHeroAsset(asset);
      expect(report.issues.filter(i => i.severity === "error")).toEqual([]);
      expect(asset.items.has("laptop")).toBe(true);
      expect(asset.items.has("invoice")).toBe(true);
      expect(asset.parts.has("laptop/laptop-lid-hinge")).toBe(true);
      expect(asset.parts.has("invoice/document-print")).toBe(true);
      expect(asset.set?.kind).toBe("desk");
    } finally { asset.dispose(); }
  });

  it("random access restores the identical invoice handoff and laptop hinge pose", () => {
    const asset = createEverydayDeskScene(scene("invoice-to-software"));
    try {
      const paper = asset.group.getObjectByName("item-invoice")!;
      const hinge = asset.parts.get("laptop/laptop-lid-hinge")!;
      asset.pose?.({ id: "play", frame: 93, fps: 30 });
      const position = paper.position.toArray(), rotation = hinge.rotation.x;
      expect(position[1]).toBeGreaterThan(.12);
      asset.pose?.({ id: "play", frame: 15, fps: 30 });
      asset.pose?.({ id: "play", frame: 93, fps: 30 });
      expect(paper.position.toArray()).toEqual(position);
      expect(hinge.rotation.x).toBeCloseTo(rotation, 7);
      const display = asset.parts.get("laptop/laptop-display") as Mesh;
      const screen = display.material as MeshPhysicalMaterial;
      asset.pose?.({ id: "play", frame: 100, fps: 30 });
      const awaiting = screen.emissiveMap;
      asset.pose?.({ id: "play", frame: 135, fps: 30 });
      const received = screen.emissiveMap;
      expect(received).not.toBe(awaiting);
      asset.pose?.({ id: "play", frame: 25, fps: 30 });
      asset.pose?.({ id: "play", frame: 100, fps: 120 });
      expect(screen.emissiveMap).toBe(awaiting);
      asset.pose?.({ id: "play", frame: 135, fps: 120 });
      expect(screen.emissiveMap).toBe(received);
    } finally { asset.dispose(); }
  });

  it("keeps authored laptop/notification beats aligned to the film at different output rates", () => {
    const asset = createEverydayDeskScene(scene("cinematic-desk-explainer"));
    try {
      const hinge = asset.parts.get("laptop/laptop-lid-hinge")!;
      asset.pose?.({ id: "play", frame: 130, fps: 30 });
      const openAt30 = hinge.rotation.x;
      asset.pose?.({ id: "play", frame: 130, fps: 120 });
      expect(hinge.rotation.x).toBeCloseTo(openAt30, 7);
      asset.pose?.({ id: "play", frame: 20, fps: 24 });
      asset.pose?.({ id: "play", frame: 130, fps: 24 });
      expect(hinge.rotation.x).toBeCloseTo(openAt30, 7);
    } finally { asset.dispose(); }
  });

  it("holds a final, composed still for reduced-motion consumers", () => {
    const asset = createEverydayDeskScene(scene("cinematic-desk-explainer"));
    try {
      asset.pose?.({ id: "play", frame: 149, fps: 30 });
      const hinge = asset.parts.get("laptop/laptop-lid-hinge")!.rotation.x;
      const folderX = asset.group.getObjectByName("item-folder")!.position.x;
      asset.pose?.({ id: "play", frame: 0, fps: 30 });
      asset.pose?.({ id: "static", frame: 0, fps: 30 });
      expect(asset.parts.get("laptop/laptop-lid-hinge")!.rotation.x).toBeCloseTo(hinge, 7);
      expect(asset.group.getObjectByName("item-folder")!.position.x).toBeCloseTo(folderX, 7);
    } finally { asset.dispose(); }
  });

  it("reveals the selected line only after the investigation camera has settled", () => {
    const spec: EverydaySceneSpec = { ...scene("document-investigation"),
      content: { ...scene("document-investigation").content,
        document: { rows: [{ label: "Research", value: "20" }, { label: "Evidence", value: "40" }] }, highlightRow: 1 } };
    const asset = createEverydayDeskScene(spec);
    try {
      expect([...asset.items.keys()]).toEqual(["invoice"]);
      const marker = asset.parts.get("invoice/document-highlight-region")!;
      expect(marker).toBeDefined();
      asset.pose?.({ id: "play", frame: 50, fps: 30 });
      expect(marker.visible).toBe(false);
      asset.pose?.({ id: "play", frame: 127, fps: 30 });
      const scale = marker.scale.x;
      expect(scale).toBeCloseTo(1);
      asset.pose?.({ id: "play", frame: 18, fps: 30 });
      asset.pose?.({ id: "play", frame: 127, fps: 30 });
      expect(marker.scale.x).toBe(scale);
      asset.pose?.({ id: "play", frame: 127, fps: 120 });
      expect(marker.scale.x).toBe(scale);
      expect(evaluateEverydayCamera(spec, 130).position[1]).toBeLessThan(evaluateEverydayCamera(spec, 0).position[1]);
    } finally { asset.dispose(); }
  });

  it("offers the same PBR desk geometry with a white lacquer surface", () => {
    const asset = createEverydayDeskScene({ ...scene("cinematic-desk-explainer"), deskFinish: "white" });
    try {
      expect(asset.group.getObjectByName("desk-white-top")).toBeDefined();
      expect(asset.group.getObjectByName("desk-walnut-top")).toBeUndefined();
      expect(asset.parts.has("laptop/laptop-display")).toBe(true);
      expect(asset.group.getObjectByName("item-phone")?.rotation.x).toBeCloseTo(-Math.PI / 2);
    } finally { asset.dispose(); }
  });

  it("uses one configurable lighting vocabulary for desk and physical book", () => {
    const desk = createEverydayDeskScene({ ...scene("document-investigation"),
      lightingPreset: "warm-documentary", content: {
        ...scene("document-investigation").content,
        document: { rows: [{ label: "Selected", value: "1" }] }, highlightRow: 0,
      } });
    try {
      expect(desk.studio?.palette).toBe("sand");
      expect(desk.studio?.rimColor).toBe("#ffe1b4");
    } finally { desk.dispose(); }
    const book = createBookOnDesk3D(toEverydayBookSpec(scene("epic-book-storytelling")),
      undefined, { palette: "ivory", keyAzimuth: 28 });
    try { expect(book.studio?.palette).toBe("ivory"); }
    finally { book.dispose(); }
  });

  it("keeps an authored portrait camera instead of cropping the landscape pose", () => {
    const landscape = evaluateEverydayCamera(scene("cinematic-desk-explainer"), 110);
    const portrait = evaluateEverydayCamera({ ...scene("cinematic-desk-explainer"), width: 540, height: 960 }, 110);
    expect(portrait.position).not.toEqual(landscape.position);
    expect(portrait.position.every(Number.isFinite)).toBe(true);
    expect(evaluateEverydayCamera(scene("cinematic-desk-explainer"), 110)).toEqual(landscape);
  });

  it("maps an authored book directly to the existing physically bending-page renderer", () => {
    const spec = toEverydayBookSpec(scene("epic-book-storytelling"));
    expect(spec.recipeId).toBe("page-turn-story");
    expect(spec.content.documentTitle).toBe("How a document becomes a record");
    expect(spec.content.spreads).toHaveLength(3);
    expect(spec.content.spreads?.[2].right.heading).toBe("A resolution");
  });

  it("directs the physical hardcover using the same public camera evaluator as ContentGen", () => {
    const spec = scene("epic-book-storytelling");
    expect(evaluateEverydayCamera(spec, 0)).toEqual({
      position: [8, 11, 13], target: [-1.5, .4, 2.6], fov: 36,
    });
    expect(evaluateEverydayCamera(spec, 149).position).toEqual([5, 10, 11]);
    expect(evaluateEverydayCamera({ ...spec, width: 540, height: 960 }, 149)).toEqual({
      position: [8, 17, 21], target: [-1.5, .4, 2.6], fov: 35,
    });
  });

  it("opens a real hardcover before bending pages, with reversible cover hinge", () => {
    const book = createBookHero3D(toEverydayBookSpec(scene("epic-book-storytelling")));
    try {
      const hinge = book.parts.get("front-cover-hinge");
      const right = book.parts.get("open-right-page");
      expect(hinge).toBeDefined();
      expect(right).toBeDefined();
      book.pose?.({ id: "turn-pages", frame: 0 });
      expect(hinge!.rotation.y).toBeCloseTo(0);
      // Text-block pages exist beneath the closed hardcover; the moving board
      // occludes them in perspective, rather than a page popping in late.
      expect(right!.visible).toBe(true);
      book.pose?.({ id: "turn-pages", frame: 65 });
      expect(Math.abs(hinge!.rotation.y)).toBeGreaterThan(3);
      expect(right!.visible).toBe(true);
      book.pose?.({ id: "turn-pages", frame: 70 });
      const leaf = book.parts.get("turning-front-page") as Mesh;
      expect(leaf.visible).toBe(true);
      const curved = [...(leaf.geometry.attributes.position.array as Float32Array)];
      expect(curved.some((v, i) => i % 3 === 2 && Math.abs(v) > .02)).toBe(true);
      book.pose?.({ id: "turn-pages", frame: 3 });
      book.pose?.({ id: "turn-pages", frame: 70 });
      expect([...(leaf.geometry.attributes.position.array as Float32Array)]).toEqual(curved);
      const opened = hinge!.rotation.y;
      book.pose?.({ id: "turn-pages", frame: 14 });
      book.pose?.({ id: "turn-pages", frame: 65 });
      expect(hinge!.rotation.y).toBeCloseTo(opened, 7);
    } finally { book.dispose(); }
  });

  it("grounds the hardcover horizontally on the existing desk and mat", () => {
    const composed = createBookOnDesk3D(toEverydayBookSpec(scene("epic-book-storytelling")));
    try {
      expect(composed.set?.kind).toBe("desk");
      expect(composed.parts.has("book/front-cover-hinge")).toBe(true);
      expect(composed.group.getObjectByName("item-book")?.rotation.x).toBeCloseTo(-Math.PI / 2);
      expect(composed.group.getObjectByName("desk-walnut-top")).toBeDefined();
      composed.pose?.({ id: "turn-pages", frame: 70, fps: 30 });
      composed.group.updateMatrixWorld(true);
      const turningLeaf = composed.parts.get("book/turning-front-page") as Mesh;
      expect(turningLeaf.visible).toBe(true);
      // A desk-mounted sheet must rise above the tabletop. A positive local
      // page angle would turn underneath it, despite passing geometry tests.
      const raisedBounds = new Box3().setFromObject(turningLeaf);
      expect(raisedBounds.min.y).toBeGreaterThan(.05);
      expect(raisedBounds.max.y).toBeGreaterThan(1.2);
    } finally { composed.dispose(); }
  });
});
