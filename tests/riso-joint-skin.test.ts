import { describe, expect, it } from "vitest";
import { risoJointSkinPath } from "../registry/video/riso-joint-skin";
import { evaluateRisoCharacter, inspectRisoCharacter } from "../registry/video/riso-character";
import type { RisoMatrix } from "../registry/video/riso-character";
import { COURIER, PAPER_BIRD } from "../src/video/riso-character-demo";

const matrix = (x: number, y: number, s = 1): RisoMatrix => ({
  a: s, b: 0, c: 0, d: s, e: x, f: y,
});
const skinParts = COURIER.parts.filter(p => p.skin);
describe("RISO4 joint-bound painterly contour skins", () => {
  it("draws finite, closed tapered paths at different rotations and at folded joints", () => {
    const skin = { tipJoint: "tip", baseWidth: 20, tipWidth: 12, overlap: 3, bow: 2 };
    const vertical = risoJointSkinPath(matrix(0, 0), matrix(0, 40), skin);
    const diagonal = risoJointSkinPath(matrix(0, 0), matrix(25, 25), skin);
    const collapsed = risoJointSkinPath(matrix(0, 0), matrix(0, 0), skin);
    expect(vertical).toMatch(/^M.* C.* Q.* C.* Q.* Z$/);
    expect(vertical).not.toBe(diagonal);
    expect(collapsed).not.toMatch(/NaN|Infinity|e\+|e-/);
    expect(vertical).not.toMatch(/NaN|Infinity/);
    expect(diagonal).not.toMatch(/NaN|Infinity/);
    expect(risoJointSkinPath(matrix(0, 0, 2), matrix(0, 40, 2), skin))
      .not.toBe(vertical);
  });
  it("skinned courier preserves original independently drawn gloves, boots and face", () => {
    expect(skinParts.map(p => p.id).sort()).toEqual([
      "left-forearm", "left-shin", "left-thigh", "left-upper-sleeve",
      "right-forearm", "right-shin", "right-thigh", "right-upper-sleeve",
    ].sort());
    expect(COURIER.parts.find(p => p.id === "mouth")!.skin).toBeUndefined();
    expect(COURIER.parts.find(p => p.id === "left-boot")!.skin).toBeUndefined();
    expect(PAPER_BIRD.parts.every(p => p.skin === undefined)).toBe(true);
    expect(inspectRisoCharacter(COURIER)).toEqual([]);
  });
  it("sticks to evaluated knee, ankle, elbow and wrist after IK without double transform", () => {
    for (const frame of [0, 10, 46, 80, 112, 157, 198, 239]) {
      const pose = evaluateRisoCharacter(COURIER, frame);
      for (const part of skinParts) {
        const drawing = pose.parts.find(p => p.id === part.id)!;
        expect(drawing.d).toMatch(/^M.* Z$/);
        expect(drawing.d).not.toMatch(/NaN|Infinity/);
        expect(drawing.transform).toBe("matrix(1 0 0 1 0 0)");
        expect(drawing.opacity).toBe(1);
      }
      expect(pose.parts.find(p => p.id === "left-boot")!.transform)
        .not.toBe("matrix(1 0 0 1 0 0)");
    }
    const bend = evaluateRisoCharacter(COURIER, 46);
    const stand = evaluateRisoCharacter(COURIER, 198);
    const leftAt = (pose: typeof bend) => pose.parts.find(p => p.id === "left-thigh")!.d;
    expect(leftAt(bend)).not.toBe(leftAt(stand));
    const repeat = evaluateRisoCharacter(COURIER, 46);
    evaluateRisoCharacter(COURIER, 220);
    expect(leftAt(evaluateRisoCharacter(COURIER, 46))).toBe(leftAt(repeat));
  });
  it("rejects missing tips, non-child tips, zero/invalid widths and excessive overlap", () => {
    const replaceSkin = (skin: NonNullable<(typeof COURIER.parts)[number]["skin"]>) =>
      ({ ...COURIER, parts: COURIER.parts.map(p => p.id === "left-thigh" ? { ...p, skin } : p) });
    const base = skinParts.find(p => p.id === "left-thigh")!.skin!;
    for (const edit of [
      { ...base, tipJoint: "no-such-joint" },
      { ...base, tipJoint: "left-ankle" },
      { ...base, baseWidth: 0 },
      { ...base, tipWidth: Infinity },
      { ...base, overlap: -1 },
      { ...base, bow: 999 },
    ]) {
      expect(inspectRisoCharacter(replaceSkin(edit)).some(x => x.path.endsWith("/skin")))
        .toBe(true);
    }
  });
});
