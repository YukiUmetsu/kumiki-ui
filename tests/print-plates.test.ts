import { describe, expect, it } from "vitest";
import { evaluateRisoPrint, inspectRisoPrint, overprintColor, plateRegistration, printDot, printHash, type RisoPrintSpec } from "../registry/video/print-plates";
const spec: RisoPrintSpec = {
  version: 1, width: 1280, height: 720, paper: "#F2E9D6", seed: 77,
  startFrame: 15, passFrames: 65, gapFrames: 36,
  plates: [
    { id: "blue", color: "#2362A0", opacity: .95, dotCell: 9, dotAngle: 24, registration: [0, 0] },
    { id: "red", color: "#DD593D", opacity: .90, dotCell: 11, dotAngle: -19, registration: [2, -1] },
  ],
};
describe("Riso spot-ink printing", () => {
  it("validates source and rejects duplicate/malformed plates", () => {
    expect(inspectRisoPrint(spec)).toEqual([]);
    const invalid = { ...spec, plates: [spec.plates[0], { ...spec.plates[0], dotCell: 999, registration: [Number.NaN, 0] as const }] };
    expect(inspectRisoPrint(invalid).map(d => d.code)).toEqual(expect.arrayContaining(["plate-id", "plate-cell", "registration"]));
  });
  it("starts with blank paper, prints in order, then holds both without frame history", () => {
    expect(evaluateRisoPrint(spec, 0).plates.map(p => p.progress)).toEqual([0, 0]);
    expect(evaluateRisoPrint(spec, 80).plates.map(p => p.progress)).toEqual([1, 0]);
    expect(evaluateRisoPrint(spec, 190).plates.map(p => p.progress)).toEqual([1, 1]);
    const last = evaluateRisoPrint(spec, 220);
    evaluateRisoPrint(spec, 40); evaluateRisoPrint(spec, 0);
    expect(evaluateRisoPrint(spec, 220)).toEqual(last);
    expect(evaluateRisoPrint(spec, 0, true).plates.map(p => p.progress)).toEqual([1, 1]);
  });
  it("overprint combines real pigments instead of RGB alpha interpolation", () => {
    const blue = { color: "#0000FF", coverage: 1, opacity: 1 };
    const yellow = { color: "#FFFF00", coverage: 1, opacity: 1 };
    expect(overprintColor("#FFFFFF", [blue])).toBe("#0000FF");
    expect(overprintColor("#FFFFFF", [blue, yellow])).toBe("#000000");
    expect(overprintColor("#FFFFFF", [{ ...blue, coverage: 0 }])).toBe("#FFFFFF");
    expect(overprintColor("#FFFFFF", [{ ...blue, coverage: 0.5 }])).toBe("#8080FF");
  });
  it("registration and grain are repeatable, fixed in paper coordinates", () => {
    expect(plateRegistration(spec, 1, .75)).toEqual(plateRegistration(spec, 1, .75));
    expect(printHash(77, 100, 20)).toBe(printHash(77, 100, 20));
    expect(printHash(77, 100, 20)).not.toBe(printHash(77, 101, 20));
    expect(printDot(4.5, 4.5, 9, 0, 1)).toBe(true);
    expect(printDot(4.5, 4.5, 9, 0, 0)).toBe(false);
    expect(printDot(0, 0, 9, 0, 1)).toBe(false);
  });
  it("refuses invalid frames and malformed paper colors rather than silently substituting", () => {
    expect(() => evaluateRisoPrint(spec, -1)).toThrow(RangeError);
    expect(() => overprintColor("beige", [])).toThrow(RangeError);
  });
});
