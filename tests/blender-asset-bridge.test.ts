import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { AnimationClip, Box3, BoxGeometry, Group, Mesh, MeshStandardMaterial, Quaternion, Vector3, VectorKeyframeTrack } from "three";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { loadBlenderRevision, loadBlenderRevisionFromUrl } from "../registry/craft/blender-asset-bridge";
import { bakeHeroActionClip } from "../registry/craft/hero-gltf";
import { createSectionRevealThree } from "../registry/visual/section-reveal-three";
import type { SectionRevealFrame } from "../registry/visual/section-reveal";
import realBlenderManifest from "../src/craft/fixtures/blender-desk-lamp/manifest.json";
import realPhysicsManifest from "../src/craft/fixtures/blender-desk-lamp-physics/manifest.json";
import type { BakedPhysicalActionSpec } from "../registry/motion/baked-physical-motion";

async function syntheticRevision(tagged = true, withAnimation = false) {
  const scene = new Group();
  let animatedNode: Mesh | undefined;
  for (const [i, name] of ["shell", "screw-a", "screw-b"].entries()) {
    const mesh = new Mesh(new BoxGeometry(i === 0 ? 2 : 0.2, i === 0 ? 1 : 0.2, 0.5), new MeshStandardMaterial({ color: i === 0 ? "#996633" : "#aaaaaa" }));
    mesh.name = name;
    mesh.position.set(i - 1, i === 0 ? 0 : 0.5, 0);
    if (tagged) mesh.userData.kumiki_part = i === 0 ? "body" : "hardware";
    scene.add(mesh);
    if (i === 0) animatedNode = mesh;
  }
  const animations = withAnimation && animatedNode ? [new AnimationClip("lift", 1, [
    new VectorKeyframeTrack(`${animatedNode.uuid}.position`, [0, 1], [-1, 0, 0, -1, 1, 0]),
  ])] : [];
  const glb = await new GLTFExporter().parseAsync(scene, { binary: true, onlyVisible: false, animations });
  if (!(glb instanceof ArrayBuffer)) throw new Error("Expected GLB ArrayBuffer");
  const audit = testAudit(glb);
  const manifest = {
    schema_version: 1, asset_id: "first-party-fixture", units: "meters", provenance: "First-party test fixture",
    files: { model: "model.glb" }, output_bytes: { "model.glb": glb.byteLength },
    named_parts: { body: 1, hardware: 2 },
    glb_audit: { ...audit, semantic_nodes: tagged ? audit.semantic_nodes : 1 },
  };
  return { manifest, model: glb };
}

function testAudit(model: ArrayBuffer) {
  const length = new DataView(model).getUint32(12, true);
  const doc = JSON.parse(new TextDecoder().decode(new Uint8Array(model, 20, length)));
  return { bytes: model.byteLength, meshes: doc.meshes?.length ?? 0, nodes: doc.nodes?.length ?? 0,
    materials: doc.materials?.length ?? 0,
    semantic_nodes: doc.nodes.filter((node: { extras?: { kumiki_part?: string } }) => typeof node.extras?.kumiki_part === "string").length,
    external_references: 0 };
}

function isolatedFrame(ids: readonly string[], keep: string): SectionRevealFrame {
  return { id: "bridge-isolate", frame: 0, amount: 1, mode: "isolate", diagnostics: [],
    parts: new Map(ids.map(id => [id, { id, role: id === keep ? "target" as const : "other" as const,
      opacity: id === keep ? 1 : 0, clip: false, cap: false }])),
    unowned: { opacity: 0, clip: false, cap: false } };
}

function withExternalGlbUri(model: ArrayBuffer, collection: "buffers" | "images"): ArrayBuffer {
  const view = new DataView(model);
  const jsonLength = view.getUint32(12, true);
  const doc = JSON.parse(new TextDecoder().decode(new Uint8Array(model, 20, jsonLength)));
  if (collection === "buffers") doc.buffers[0].uri = "https://untrusted.example/external.bin";
  else doc.images = [{ uri: "https://untrusted.example/external.png" }];
  const encoded = new TextEncoder().encode(JSON.stringify(doc));
  const paddedLength = Math.ceil(encoded.length / 4) * 4;
  const oldPayloadEnd = 20 + jsonLength;
  const tail = new Uint8Array(model, oldPayloadEnd);
  const result = new ArrayBuffer(20 + paddedLength + tail.length);
  const output = new Uint8Array(result), header = new DataView(result);
  output.set(new Uint8Array(model, 0, 12));
  header.setUint32(8, result.byteLength, true);
  header.setUint32(12, paddedLength, true);
  output.set(new TextEncoder().encode("JSON"), 16);
  output.set(encoded, 20);
  output.fill(0x20, 20 + encoded.length, 20 + paddedLength);
  output.set(tail, 20 + paddedLength);
  return result;
}

describe("Blender revision → Kumiki asset bridge", () => {
  it("replays offline collision keyframes beside PM1 and exposes inspectable, exportable actions", async () => {
    const factory = await loadBlenderRevision(await syntheticRevision(), {
      physicalActions: [{ schemaVersion: 1, id: "body-spin", durationFrames: 45, motions: [
        { kind: "spin", target: "body", axis: [0, 1, 0], angularVelocityDegPerSec: 180 },
      ] }],
      bakedActions: [{ schemaVersion: 1, id: "hardware-hit", durationFrames: 45, tracks: [
        { target: "kumiki:hardware:1", keys: [
          { frame: 0, position: [0, .5, 0], rotation: [0, 0, 0, 1] },
          { frame: 15, position: [0, 0, 0], rotation: [0, 0, 0, 1] },
          { frame: 45, position: [.5, .5, 0], rotation: [0, 0, 0, 1] },
        ] },
      ], contacts: [{ frame: 15.4, target: "kumiki:hardware:1", speedMps: 2.5, material: "metal" }] }],
    });
    const hero = factory(), screw = hero.parts.get("kumiki:hardware:1")!;
    expect(factory.actions.map(a => a.id)).toEqual(["body-spin", "hardware-hit"]);
    hero.pose?.({ id: "hardware-hit", frame: 15 });
    expect(screw.position.y).toBeCloseTo(0);
    hero.pose?.({ id: null, frame: 0 });
    expect(screw.position.y).toBeCloseTo(.5);
    hero.pose?.({ id: "hardware-hit", frame: 15 });
    expect(screw.position.y).toBeCloseTo(0);
    expect(factory.createInspectable(hero, { actionId: "hardware-hit" }).getBounds("kumiki:hardware:1", 15).max).toHaveLength(3);
    expect(factory.bakedContactEvents("hardware-hit", 60)[0]).toMatchObject({ frame: 30.8, timeSeconds: 15.4 / 30, material: "metal" });
    expect(bakeHeroActionClip(hero, "hardware-hit").tracks.length).toBeGreaterThan(0);
    hero.dispose(); factory.release();
  });

  it("imports a real Blender 4.5.4 asset revision with its original semantic roles", async () => {
    const bytes = readFileSync(resolve("src/craft/fixtures/blender-desk-lamp/model.glb"));
    const model = new Uint8Array(bytes).buffer;
    // jsdom has no image decoder; only replace that browser primitive. All
    // actual Blender glTF nodes, materials, buffers and animations still load.
    const previousDecoder = globalThis.createImageBitmap;
    globalThis.createImageBitmap = async () => ({ width: 1, height: 1 }) as ImageBitmap;
    try {
      const factory = await loadBlenderRevision({ manifest: realBlenderManifest, model });
      const hero = factory();
      expect(factory.manifest.glb_audit.semantic_nodes).toBe(17);
      expect(hero.semanticParts.get("base-fasteners")).toHaveLength(12);
      expect(hero.semanticParts.get("enameled-shade")).toHaveLength(1);
      expect(factory.createInspectable(hero).getBounds("kumiki:base-fasteners:1", 0).min).toHaveLength(3);
      hero.dispose(); factory.release();
    } finally { globalThis.createImageBitmap = previousDecoder; }
  }, 15_000);

  it("replays the actual twelve-body Blender 4.5 Bullet bake through the shared bridge", async () => {
    const root = resolve("src/craft/fixtures/blender-desk-lamp-physics");
    const model = new Uint8Array(readFileSync(`${root}/model.glb`)).buffer;
    const bakedActions = JSON.parse(readFileSync(`${root}/baked-actions.json`, "utf8")) as BakedPhysicalActionSpec[];
    const previousDecoder = globalThis.createImageBitmap;
    globalThis.createImageBitmap = async () => ({ width: 1, height: 1 }) as ImageBitmap;
    try {
      const factory = await loadBlenderRevision({ manifest: realPhysicsManifest, model }, { bakedActions });
      const hero = factory();
      expect(hero.semanticParts.get("base-fasteners")).toHaveLength(12);
      expect(bakedActions[0].durationFrames).toBe(120);
      expect(bakedActions[0].tracks).toHaveLength(12);
      expect(factory.actions.some(action => action.id === "fastener-drop")).toBe(true);
      const first = hero.parts.get("kumiki:base-fasteners:1")!;
      hero.pose?.({ id: "fastener-drop", frame: 0, fps: 30 });
      const startingY = first.position.y;
      hero.pose?.({ id: "fastener-drop", frame: 120, fps: 30 });
      expect(first.position.y).toBeLessThan(startingY - .35);
      expect(first.position.y).toBeGreaterThan(-.02);
      expect(factory.bakedContactEvents("fastener-drop")).toHaveLength(0);
      hero.dispose(); factory.release();
    } finally { globalThis.createImageBitmap = previousDecoder; }
  }, 20_000);
  it("indexes each Blender semantic instance and exposes a working inspector", async () => {
    const factory = await loadBlenderRevision(await syntheticRevision(), { license: "Original test geometry" });
    const hero = factory();
    expect([...hero.semanticParts.keys()]).toEqual(["body", "hardware"]);
    expect(hero.semanticParts.get("hardware")).toHaveLength(2);
    expect(hero.parts.get("kumiki:hardware:1")).toBe(hero.semanticParts.get("hardware")![0]);
    expect(hero.parts.get("kumiki:hardware:2")).toBe(hero.semanticParts.get("hardware")![1]);
    expect(hero.metersPerUnit).toBe(1);
    expect(hero.craft.stylization).toContain("Original test geometry");
    const inspected = factory.createInspectable(hero);
    expect(inspected.getPart("kumiki:body:1").role).toBe("body");
    const b = inspected.getBounds("kumiki:hardware:2", 0);
    expect(b.max[0]).toBeGreaterThan(b.min[0]);
    expect(inspected.capabilities.sectioning).toBe("isolate-ghost");
    hero.dispose();
    factory.release();
  });

  it("makes semantic instance IDs canonical for SectionReveal isolation on the real Blender fixture", async () => {
    const bytes = readFileSync(resolve("src/craft/fixtures/blender-desk-lamp/model.glb"));
    const previousDecoder = globalThis.createImageBitmap;
    globalThis.createImageBitmap = async () => ({ width: 1, height: 1 }) as ImageBitmap;
    try {
      const factory = await loadBlenderRevision({ manifest: realBlenderManifest, model: new Uint8Array(bytes).buffer });
      const hero = factory();
      const inspected = factory.createInspectable(hero);
      expect(hero.namedNodes.has("weighted-base")).toBe(true);
      expect(hero.parts.has("weighted-base")).toBe(false);
      const reveal = createSectionRevealThree(hero);
      reveal.apply(isolatedFrame(inspected.parts.map(p => p.id), "kumiki:base-fasteners:1"));
      let visible = 0;
      hero.group.traverse(node => { if ((node as Mesh).isMesh && node.visible) visible++; });
      expect(visible).toBe(1);
      const selected = "kumiki:base-fasteners:1";
      const faded = "kumiki:weighted-base:1";
      const ghost = isolatedFrame(inspected.parts.map(p => p.id), selected);
      reveal.apply({ ...ghost, mode: "ghost", parts: new Map([...ghost.parts].map(([id, state]) =>
        [id, { ...state, opacity: id === selected ? 1 : .25 }])) });
      const mesh = hero.parts.get(faded) as Mesh;
      const material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
      expect(material.opacity).toBeCloseTo(.25);
      reveal.dispose(); hero.dispose(); factory.release();
    } finally { globalThis.createImageBitmap = previousDecoder; }
  });

  it("keeps untagged child meshes owned by their nearest tagged ancestor", async () => {
    const root = new Group();
    const parent = new Group(); parent.name = "parent"; parent.userData.kumiki_part = "assembly";
    const child = new Mesh(new BoxGeometry(1, 1, 1), new MeshStandardMaterial()); child.name = "child";
    parent.add(child);
    const unrelated = new Mesh(new BoxGeometry(1, 1, 1), new MeshStandardMaterial()); unrelated.name = "outside";
    unrelated.position.x = 3;
    root.add(parent, unrelated);
    const model = await new GLTFExporter().parseAsync(root, { binary: true });
    if (!(model instanceof ArrayBuffer)) throw new Error("GLB required");
    const manifest = { ...((await syntheticRevision()).manifest),
      output_bytes: { "model.glb": model.byteLength },
      glb_audit: testAudit(model) };
    const factory = await loadBlenderRevision({ manifest, model });
    const hero = factory(), inspect = factory.createInspectable(hero);
    const reveal = createSectionRevealThree(hero);
    reveal.apply(isolatedFrame(inspect.parts.map(p => p.id), "kumiki:assembly:1"));
    let visible = 0;
    hero.group.traverse(node => { if ((node as Mesh).isMesh && node.visible) visible++; });
    expect(visible).toBe(1);
    reveal.dispose(); hero.dispose(); factory.release();
  });

  it("creates independent instances while preserving the original glTF hierarchy", async () => {
    const factory = await loadBlenderRevision(await syntheticRevision());
    const first = factory(), second = factory();
    const left = first.semanticParts.get("hardware")![0];
    const right = second.semanticParts.get("hardware")![0];
    expect(left).not.toBe(right);
    expect(left.parent).toBeTruthy();
    left.position.x += 5;
    expect(right.position.x).not.toBe(left.position.x);
    first.dispose(); second.dispose(); factory.release();
  });

  it("changes the inspection revision when GLB geometry changes at the same asset ID", async () => {
    const firstFactory = await loadBlenderRevision(await syntheticRevision(true, false));
    const secondFactory = await loadBlenderRevision(await syntheticRevision(true, true));
    const first = firstFactory(), second = secondFactory();
    expect(firstFactory.createInspectable(first).revision).not.toBe(secondFactory.createInspectable(second).revision);
    first.dispose(); second.dispose(); firstFactory.release(); secondFactory.release();
  });

  it("keeps Blender glTF actions frame-addressed for inspection and video", async () => {
    const factory = await loadBlenderRevision(await syntheticRevision(true, true));
    const hero = factory();
    expect(factory.actions.map(a => a.id)).toEqual(["lift"]);
    const inspected = factory.createInspectable(hero, { actionId: "lift" });
    const start = inspected.getBounds("kumiki:body:1", 0);
    const end = inspected.getBounds("kumiki:body:1", 29);
    expect(end.min[1]).toBeGreaterThan(start.min[1] + 0.5);
    hero.dispose(); factory.release();
  });

  it("adds one-call gravity/restitution actions with exact impact SFX events and random-access poses", async () => {
    const factory = await loadBlenderRevision(await syntheticRevision(), { physicalActions: [{
      schemaVersion: 1, id: "fastener-drop", durationFrames: 120,
      motions: [{ kind: "drop", target: "hardware", height: 0.9, restitution: .5, gravity: 10 }],
    }] });
    const hero = factory();
    const first = hero.parts.get("kumiki:hardware:1")!;
    hero.pose?.({ id: null, frame: 0 });
    const rest = first.getWorldPosition(new Vector3()).y;
    hero.pose?.({ id: "fastener-drop", frame: 0 });
    expect(first.getWorldPosition(new Vector3()).y - rest).toBeCloseTo(.9);
    hero.pose?.({ id: "fastener-drop", frame: 100 });
    hero.pose?.({ id: "fastener-drop", frame: 0 });
    expect(first.getWorldPosition(new Vector3()).y - rest).toBeCloseTo(.9);
    hero.pose?.({ id: null, frame: 0 });
    expect(first.getWorldPosition(new Vector3()).y).toBeCloseTo(rest);
    expect(hero.actions?.map(a => a.id)).toEqual(["fastener-drop"]);
    expect(factory.physicalEvents("fastener-drop")[0]).toMatchObject({ kind: "impact", target: "hardware" });
    const inspector = factory.createInspectable(hero, { actionId: "fastener-drop" });
    expect(inspector.getBounds("kumiki:hardware:1", 0).min[1]).toBeGreaterThan(inspector.getBounds("kumiki:hardware:1", 100).min[1] + .5);
    const clip = bakeHeroActionClip(hero, "fastener-drop");
    expect(clip.tracks.length).toBeGreaterThan(0);
    hero.dispose(); factory.release();
  });

  it("layers an authored Blender glTF clip under an independent physical spring", async () => {
    const factory = await loadBlenderRevision(await syntheticRevision(true, true), { actions: { lift: { loop: false } }, physicalActions: [{
      schemaVersion: 1, id: "lift-settle", durationFrames: 120, sourceActionId: "lift",
      motions: [{ kind: "spring", target: "body", offset: [0, .4, 0], mass: 1, stiffness: 100, damping: 24 }],
    }] });
    const hero = factory(), body = hero.parts.get("kumiki:body:1")!;
    hero.pose?.({ id: "lift-settle", frame: 0 });
    const start = body.position.y;
    hero.pose?.({ id: "lift-settle", frame: 29 });
    expect(body.position.y).toBeGreaterThan(start + .4);
    hero.pose?.({ id: "lift-settle", frame: 0 });
    expect(body.position.y).toBeCloseTo(start);
    hero.pose?.({ id: "lift-settle", frame: 120 });
    const held = body.position.y;
    hero.pose?.({ id: "lift-settle", frame: 240 });
    expect(body.position.y).toBeCloseTo(held);
    expect(factory.createInspectable(hero, { actionId: "lift-settle" }).getBounds("kumiki:body:1", 29).min[1])
      .toBeGreaterThan(factory.createInspectable(hero, { actionId: "lift-settle" }).getBounds("kumiki:body:1", 0).min[1]);
    hero.dispose(); factory.release();
  });

  it("sways linked Blender GLB siblings about a shared named hinge without reparenting", async () => {
    const bytes = readFileSync(resolve("src/craft/fixtures/blender-desk-lamp/model.glb"));
    const previousDecoder = globalThis.createImageBitmap;
    globalThis.createImageBitmap = async () => ({ width: 1, height: 1 }) as ImageBitmap;
    try {
      const factory = await loadBlenderRevision({ manifest: realBlenderManifest, model: new Uint8Array(bytes).buffer }, {
        physicalActions: [{ schemaVersion: 1, id: "arm-sway", durationFrames: 120, motions: [
          { kind: "pendulum", target: ["upper-arm", "enameled-shade"], pivot: "joint-cover",
            axis: [0, 0, 1], angleDeg: 18, lengthMeters: .65, dampingRatio: .14 },
        ] }],
      });
      const hero = factory();
      const upper = hero.semanticParts.get("upper-arm")![0], shade = hero.semanticParts.get("enameled-shade")![0];
      const anchor = hero.semanticParts.get("joint-cover")![0];
      hero.pose?.({ id: null, frame: 0 });
      anchor.updateWorldMatrix(true, true);
      const pivot = new Box3().setFromObject(anchor, true).getCenter(new Vector3());
      const origins = [upper, shade].map(node => node.getWorldPosition(new Vector3()));
      const originalUpperRotation = upper.getWorldQuaternion(new Quaternion());
      const parents = [upper.parent, shade.parent];
      hero.pose?.({ id: "arm-sway", frame: 0 });
      expect(upper.getWorldQuaternion(new Quaternion()).angleTo(originalUpperRotation)).toBeGreaterThan(.25);
      expect(shade.getWorldPosition(new Vector3()).distanceTo(origins[1])).toBeGreaterThan(.03);
      for (const [index, node] of [upper, shade].entries())
        expect(Math.abs(node.getWorldPosition(new Vector3()).distanceTo(pivot) - origins[index].distanceTo(pivot)))
          .toBeLessThan(.001); // sub-millimeter hinge alignment on the actual imported mesh
      hero.pose?.({ id: "arm-sway", frame: 47 });
      hero.pose?.({ id: "arm-sway", frame: 0 });
      expect(Math.abs(upper.getWorldPosition(new Vector3()).distanceTo(pivot) - origins[0].distanceTo(pivot)))
        .toBeLessThan(.001);
      hero.pose?.({ id: null, frame: 0 });
      expect(upper.getWorldPosition(new Vector3()).distanceTo(origins[0])).toBeLessThan(1e-6);
      expect(shade.getWorldPosition(new Vector3()).distanceTo(origins[1])).toBeLessThan(1e-6);
      expect([upper.parent, shade.parent]).toEqual(parents);
      hero.dispose(); factory.release();
    } finally { globalThis.createImageBitmap = previousDecoder; }
  }, 15_000);

  it("rejects missing roles, ambiguous hinge pivots, and colliding physics/clip IDs on load", async () => {
    const source = await syntheticRevision(true, true);
    const action = { schemaVersion: 1 as const, id: "physics", durationFrames: 60,
      motions: [{ kind: "spin" as const, target: "body", axis: [0, 1, 0] as const, angularVelocityDegPerSec: 180 }] };
    await expect(loadBlenderRevision(source, { physicalActions: [{ ...action, motions: [{ ...action.motions[0], target: "missing" }] }] }))
      .rejects.toThrow(/unknown Blender part/i);
    await expect(loadBlenderRevision(source, { physicalActions: [{ ...action, motions: [{ ...action.motions[0], pivot: "hardware" }] }] }))
      .rejects.toThrow(/exactly one Blender node/i);
    await expect(loadBlenderRevision(source, { physicalActions: [{ ...action, id: "lift" }] })).rejects.toThrow(/conflicts/i);
  });

  it("rejects a revision whose GLB does not contain its audited Blender tags", async () => {
    await expect(loadBlenderRevision(await syntheticRevision(false))).rejects.toThrow(/kumiki_part|semantic/i);
  });

  it("rejects a size mismatch before invoking the glTF parser", async () => {
    const source = await syntheticRevision();
    await expect(loadBlenderRevision({ ...source, model: source.model.slice(0, -4) })).rejects.toThrow(/size mismatch/);
  });

  it("rejects actual external GLB buffer or image URLs before any resource fetch", async () => {
    const source = await syntheticRevision();
    const originalFetch = globalThis.fetch;
    const intercepted = vi.fn();
    globalThis.fetch = intercepted as typeof fetch;
    try {
      for (const collection of ["buffers", "images"] as const) {
        const model = withExternalGlbUri(source.model, collection);
        const manifest = { ...source.manifest, output_bytes: { "model.glb": model.byteLength },
          glb_audit: { ...source.manifest.glb_audit, bytes: model.byteLength } };
        await expect(loadBlenderRevision({ manifest, model })).rejects.toThrow(/external|embedded|URI/i);
      }
      expect(intercepted).not.toHaveBeenCalled();
    } finally { globalThis.fetch = originalFetch; }
  });

  it("stops oversized model streams at the byte limit and cancels the reader", async () => {
    const source = await syntheticRevision();
    const originalFetch = globalThis.fetch;
    let cancelled = false, emitted = 0;
    globalThis.fetch = vi.fn(async () => new Response(new ReadableStream({
      pull(controller) {
        if (emitted++ === 3) { controller.close(); return; }
        controller.enqueue(new Uint8Array(source.model.byteLength));
      },
      cancel() { cancelled = true; },
    }))) as typeof fetch;
    try {
      await expect(loadBlenderRevision({ manifest: source.manifest, model: "https://example.test/model.glb" })).rejects.toThrow(/size|limit|bytes/i);
      expect(cancelled).toBe(true);
      expect(emitted).toBeLessThan(5);
    } finally { globalThis.fetch = originalFetch; }
  });

  it("rejects oversized manifest streams and invalid URL schemes before fetching the model", async () => {
    const originalFetch = globalThis.fetch;
    let cancelled = false, requests = 0, emitted = 0;
    globalThis.fetch = vi.fn(async () => {
      requests++;
      return new Response(new ReadableStream({
        pull(controller) {
          if (emitted++ === 3) { controller.close(); return; }
          controller.enqueue(new Uint8Array(600_000));
        },
        cancel() { cancelled = true; },
      }));
    }) as typeof fetch;
    try {
      await expect(loadBlenderRevisionFromUrl("file:///tmp/manifest.json")).rejects.toThrow(/HTTP|scheme|URL/i);
      expect(requests).toBe(0);
      await expect(loadBlenderRevisionFromUrl("https://example.test/manifest.json")).rejects.toThrow(/1 MiB|limit|size/i);
      expect(requests).toBe(1);
      expect(cancelled).toBe(true);
    } finally { globalThis.fetch = originalFetch; }
  });

  it("fetches a manifest and a same-folder GLB by URL and creates a usable asset", async () => {
    const source = await syntheticRevision();
    const urls: string[] = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn(async (url: string | URL | Request) => {
      urls.push(String(url));
      if (String(url).endsWith("manifest.json")) return new Response(JSON.stringify(source.manifest));
      return new Response(source.model);
    }) as typeof fetch;
    try {
      const factory = await loadBlenderRevisionFromUrl("https://cdn.example/desk/r01/manifest.json");
      const hero = factory();
      expect(urls).toEqual(["https://cdn.example/desk/r01/manifest.json", "https://cdn.example/desk/r01/model.glb"]);
      expect(hero.semanticParts.get("body")).toHaveLength(1);
      hero.dispose(); factory.release();
    } finally { globalThis.fetch = originalFetch; }
  });
});
