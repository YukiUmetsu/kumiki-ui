import { describe, expect, it } from "vitest";
import { InstancedMesh, Mesh } from "three";
import { createBookHero3D } from "../src/components/video/scene-book-3d";
import { DEMO_SCENES } from "../src/components/video/scene-template-fixtures";
import { evaluateEverydayCamera } from "../registry/video/everyday-scenes-3d";
import type { EverydaySceneSpec } from "../registry/video/everyday-scenes-3d";

describe("cinematic physical book craft", () => {
  it("models its binding and leaf strata instead of relying on a cover box", () => {
    const book = createBookHero3D(DEMO_SCENES["page-turn-story"]);
    try {
      for (const name of ["book-leather-spine", "book-headband-head", "book-headband-tail",
        "book-gilt-raised-ribs", "book-page-signatures", "book-silk-ribbon", "cover-gilt-ornament"])
        expect(book.parts.has(name), `${name} is a physical detail`).toBe(true);
      const strata = book.parts.get("book-page-signatures") as InstancedMesh;
      expect(strata).toBeInstanceOf(InstancedMesh);
      expect(strata.count).toBeGreaterThanOrEqual(64);
      const board = book.parts.get("front-hardcover-board") as Mesh;
      expect(board.geometry.attributes.position.count).toBeGreaterThan(24);
      const spine = book.parts.get("book-leather-spine") as Mesh;
      const rightPage = book.parts.get("open-right-page") as Mesh;
      spine.geometry.computeBoundingBox();rightPage.geometry.computeBoundingBox();
      // The outer spine must not sit proud of the open sheet and look like a
      // giant gold clasp dividing both leaves in the movie.
      expect(spine.position.z + spine.geometry.boundingBox!.max.z)
        .toBeLessThan(rightPage.position.z + rightPage.geometry.boundingBox!.min.z);
    } finally { book.dispose(); }
  });

  it("retains the exact bending leaf after out-of-order film seeks", () => {
    const book = createBookHero3D(DEMO_SCENES["page-turn-story"]);
    try {
      const turning = book.parts.get("turning-front-page") as Mesh;
      book.pose?.({ id: "turn-pages", frame: 54, fps: 30 });
      const first = new Float32Array(turning.geometry.attributes.position.array);
      book.pose?.({ id: "turn-pages", frame: 5, fps: 30 });
      book.pose?.({ id: "turn-pages", frame: 54, fps: 30 });
      expect(new Float32Array(turning.geometry.attributes.position.array)).toEqual(first);
    } finally { book.dispose(); }
  });

  it("authors independent landscape and portrait camera motion", () => {
    const base: EverydaySceneSpec = {
      schemaVersion: 1, id: "book-film", recipeId: "epic-book-storytelling",
      durationFrames: 300, fps: { num: 30, den: 1 }, width: 960, height: 540,
      content: { title: "The story", pages: [
        { heading: "First", text: "First chapter" },
        { heading: "Second", text: "Second chapter" },
        { heading: "Third", text: "Third chapter" },
      ] },
    };
    const wideStart = evaluateEverydayCamera(base, 0);
    const wideEnd = evaluateEverydayCamera(base, 299);
    const portrait = evaluateEverydayCamera({ ...base, width: 540, height: 960 }, 299);
    const portraitClosed = evaluateEverydayCamera({ ...base, width: 540, height: 960 }, 0);
    const portraitOpened = evaluateEverydayCamera({ ...base, width: 540, height: 960 }, 70);
    expect(wideEnd.position).not.toEqual(wideStart.position);
    expect(portrait.position).not.toEqual(wideEnd.position);
    expect(wideEnd.target).not.toEqual(wideStart.target);
    expect(portraitOpened.target[0]).toBeLessThan(portraitClosed.target[0]);
    expect(portraitOpened.target).toEqual(portrait.target);
  });
});
