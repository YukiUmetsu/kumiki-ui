import assert from "node:assert/strict";
import test from "node:test";
import { selectFilmFrame } from "../scripts/film-frame-core.mjs";

const film = { durationFrames: 100, scenes: [
  { id: "hook", startFrame: 0, endFrame: 40 },
  { id: "answer", startFrame: 40, endFrame: 100 },
], cut: { transitions: [{ kind: "crossfade", startFrame: 36, endFrame: 44, toShotId: "answer" }] } };

test("selects the frame's scene and marks only its true opening", () => {
  assert.deepEqual(selectFilmFrame(film, 0), { frame: 0, sceneId: "hook", transition: false, opening: true });
  assert.deepEqual(selectFilmFrame(film, 20), { frame: 20, sceneId: "hook", transition: false, opening: false });
  assert.deepEqual(selectFilmFrame(film, 44), { frame: 44, sceneId: "answer", transition: false, opening: false });
});

test("transition frames use destination ownership and skip normal content audit", () => {
  assert.deepEqual(selectFilmFrame(film, 36), { frame: 36, sceneId: "answer", transition: true, opening: false });
  assert.deepEqual(selectFilmFrame(film, 40), { frame: 40, sceneId: "answer", transition: true, opening: false });
  assert.deepEqual(selectFilmFrame(film, 43), { frame: 43, sceneId: "answer", transition: true, opening: false });
});

test("accepts the last frame and rejects out-of-range, fractional and unsafe frames", () => {
  assert.equal(selectFilmFrame(film, 99).sceneId, "answer");
  for (const frame of [-1, 100, 2.5, NaN, Infinity, 2 ** 54])
    assert.throws(() => selectFilmFrame(film, frame), RangeError);
});

test("does not silently audit a gap in the compiled scene timeline", () => {
  assert.throws(() => selectFilmFrame({ ...film, scenes: [] }, 10), /No compiled scene/);
});
