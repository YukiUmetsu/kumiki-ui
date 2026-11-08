import { describe, expect, it } from "vitest";
import { DataUtils, Mesh, MeshBasicMaterial, MeshPhysicalMaterial, PerspectiveCamera, PlaneGeometry, Group } from "three";
import { inspectStudioShot, lightSweepCrossFrame, lightSweepSettle, lightSweepState, sweepProgress } from "../registry/visual/studio-shots";
import type { LightSweepSpec } from "../registry/visual/studio-shots";
import { createStripLight } from "../registry/visual/strip-light";
import { createStudioEnvironmentTexture } from "../registry/craft/hero-studio";
import { createLaptop, createSmartphone } from "../registry/domains/technology-3d";
import { shot3dCues, shot3dTurnCue } from "../registry/video/film-3d";
import type { FilmShot3dContent } from "../registry/video/film-3d";
import { compileFilm } from "../registry/video/film-document";
import { compileAdBrief } from "../registry/video/ad-formats";

const SPEC: LightSweepSpec = { durationFrames: 190, yaw: -32, pitch: 8, from: -110, to: 95, sweepStart: 18, sweepEnd: 84, claim: { text: "Edge to edge, one piece", enter: 108 } };
const codes = (spec: Partial<LightSweepSpec>) => inspectStudioShot("light-sweep", { ...SPEC, ...spec }, 30).map(p => p.code);

describe("light sweep timing", () => {
  it("glides from start to rest without going backwards", () => {
    const samples = Array.from({ length: 101 }, (_, i) => sweepProgress(SPEC, i / 100));
    expect(samples[0]).toBeCloseTo(0, 5);
    expect(samples[100]).toBeCloseTo(1, 5);
    expect(samples.every((v, i) => !i || v >= samples[i - 1] - 1e-9)).toBe(true);
  });
  it("slows where the face mirrors the camera, so the reflection crosses the glass instead of flashing", () => {
    const cross = lightSweepCrossFrame(SPEC)!, at = (frame: number) => SPEC.from + (SPEC.to - SPEC.from) * sweepProgress(SPEC, (frame - SPEC.sweepStart) / (SPEC.sweepEnd - SPEC.sweepStart));
    // The strip is at −2 × yaw at the crossing frame.
    expect(at(cross)).toBeCloseTo(-2 * SPEC.yaw, 0);
    const speed = (frame: number) => Math.abs(at(frame + 1) - at(frame - 1)) / 2;
    const even = (SPEC.to - SPEC.from) / (SPEC.sweepEnd - SPEC.sweepStart);
    expect(speed(cross)).toBeLessThan(even * .4);
    // Without the linger, the glide is a plain ease.
    expect(sweepProgress({ ...SPEC, linger: 0 }, .5)).toBeCloseTo(.5, 5);
    expect(lightSweepCrossFrame({ ...SPEC, to: 30 })).toBeUndefined();
  });
  it("opens dark, brings fill and rim up only after the light rests, and wakes the screen for the hold", () => {
    const at = (frame: number, spec = SPEC) => lightSweepState(spec, frame, [0, 0, 0], 1, 16 / 9);
    expect(at(0).reveal).toBe(0);
    expect(at(60).rise).toBe(0);
    expect(at(lightSweepSettle(SPEC)).rise).toBe(1);
    expect(at(80).display).toBe(0);
    expect(at(SPEC.sweepEnd + 12).display).toBe(1);
    expect(at(80, { ...SPEC, screen: "on" }).display).toBe(1);
    expect(at(170, { ...SPEC, screen: "off" }).display).toBe(0);
    expect(at(0).turn).toBe(SPEC.yaw);
  });
  it("checks the craft rules", () => {
    expect(codes({})).toEqual([]);
    expect(codes({ sweepEnd: 40 })).toContain("studio-sweep-fast");
    expect(codes({ sweepStart: 50, sweepEnd: 120, claim: undefined })).toContain("studio-dark-long");
    expect(codes({ to: 160 })).toContain("studio-sweep-rests-behind");
    expect(codes({ from: 20, to: 60 })).toContain("studio-sweep-short");
    expect(codes({ durationFrames: 120, claim: undefined })).toContain("studio-hold-short");
    expect(codes({ durationFrames: 170 })).toContain("studio-text-short");
    expect(codes({ claim: { text: "Too soon", enter: 90 } })).toContain("studio-text-before-settle");
  });
});

describe("light sweep stage", () => {
  it("has a dark room for the sweep, darker than the strip look", () => {
    const mean = (look: "sweep" | "strip") => {
      const data = createStudioEnvironmentTexture(64, look).image.data as Uint16Array;
      let sum = 0;
      for (let i = 0; i < data.length; i += 4) sum += DataUtils.fromHalfFloat(data[i]);
      return sum / (data.length / 4);
    };
    expect(mean("sweep")).toBeLessThan(mean("strip") * .3);
  });
  it("patches standard and physical materials with the near strip, and restores them", () => {
    const glass = new MeshPhysicalMaterial(), card = new MeshBasicMaterial(), root = new Group();
    root.add(new Mesh(new PlaneGeometry(), glass), new Mesh(new PlaneGeometry(), card), new Mesh(new PlaneGeometry(), glass));
    const before = glass.customProgramCacheKey(), strip = createStripLight(), detach = strip.attach(root);
    expect(glass.customProgramCacheKey()).toContain("km-strip");
    expect(card.onBeforeCompile).toBe(MeshBasicMaterial.prototype.onBeforeCompile);
    const shader = { uniforms: {}, fragmentShader: "void main() {\n#include <opaque_fragment>\n}", vertexShader: "" };
    glass.onBeforeCompile(shader as never, undefined as never);
    expect(shader.fragmentShader).toContain("kmStripReflect");
    expect(Object.keys(shader.uniforms)).toContain("kmStripCenter");
    detach();
    expect(glass.customProgramCacheKey()).toBe(before);
  });
  it("places the strip in view space from the camera, each frame outright", () => {
    const strip = createStripLight(), camera = new PerspectiveCamera(26, 16 / 9, .1, 100), root = new Group();
    camera.position.set(0, 0, 10); camera.lookAt(0, 0, 0);
    const glass = new MeshPhysicalMaterial(); root.add(new Mesh(new PlaneGeometry(), glass)); strip.attach(root);
    const shader = { uniforms: {} as Record<string, { value: { z?: number; x?: number } }>, fragmentShader: "void main() {\n#include <opaque_fragment>\n}", vertexShader: "" };
    glass.onBeforeCompile(shader as never, undefined as never);
    strip.update(camera, { center: [0, 0, 0], azimuth: 0, distance: 2, width: .3, height: 3 }, 1);
    expect(shader.uniforms.kmStripCenter.value.z).toBeCloseTo(-8);
    strip.update(camera, { center: [0, 0, 0], azimuth: 90, distance: 2, width: .3, height: 3 }, 1);
    expect(shader.uniforms.kmStripCenter.value.x).toBeCloseTo(2);
  });
  it("lets the phone and the laptop turn their displays off and on", () => {
    for (const asset of [createSmartphone({ id: "phone" }), createLaptop({ id: "laptop" })]) {
      expect(typeof asset.display).toBe("function");
      const lit = () => { let level = -1; asset.group.traverse(o => { if (o instanceof Mesh && o.name.endsWith("-display")) level = (o.material as MeshPhysicalMaterial).emissiveIntensity; }); return level; };
      asset.display!(0); expect(lit()).toBe(0);
      asset.display!(1); expect(lit()).toBe(1);
      asset.dispose();
    }
  });
});

describe("light sweep in a film", () => {
  const content: FilmShot3dContent = { shot: "light-sweep", subject: "phone", label: "A phone drawn out of the dark by a strip light.", spec: { ...SPEC, durationFrames: undefined } as never };
  it("names its moments, with the crossing marked transient and the turn on the settle", () => {
    const cues = shot3dCues(content, 190, 30);
    expect(cues.map(c => c.id)).toEqual(["sweep", "cross", "settle", "claim"]);
    expect(cues.find(c => c.id === "cross")?.transient).toBe(true);
    expect(shot3dTurnCue(content)).toBe("settle");
  });
  it("reviews the crossing at the moment itself", () => {
    const result = compileFilm({ schemaVersion: 1, id: "sweep", fps: { num: 30, den: 1 }, outputs: [{ id: "small", width: 640, height: 360 }],
      scenes: [{ id: "reveal", recipeId: "shot-3d", durationFrames: 190, content }] });
    expect(result.diagnostics.filter(d => d.severity === "error")).toEqual([]);
    if (!result.ok) return;
    const cross = result.film.scenes[0].cues.find(c => c.id === "cross")!;
    expect(result.film.reviewFrames.find(f => f.label === "cross")?.frame).toBe(cross.frame);
  });
  it("is offered to ads as a product reveal", () => {
    const result = compileAdBrief({ id: "a", format: "three-reasons", brand: { name: "Brand A", color: "#2f6bff", cta: { text: "Try it" } }, hook: "Three reasons people switch",
      points: ["Faster", "Clearer", "Free"], product: { subject: "phone", claim: "Every charge, live", reveal: "sweep" } });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const product = result.film.scenes.find(scene => scene.id === "product")!;
    expect((product.content as FilmShot3dContent).shot).toBe("light-sweep");
    expect(compileFilm(result.film).diagnostics.filter(d => d.severity === "error" || /^(ad-|story-|studio-)/.test(d.code))).toEqual([]);
  });
});
