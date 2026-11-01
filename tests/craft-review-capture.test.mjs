import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createCraftReviewPlan } from "../scripts/craft-review-plan.mjs";

describe("craft environment screenshot capture planning", () => {
  it("plans baseline/detail comparisons and both video aspect ratios without opening a browser", () => {
    const output = createCraftReviewPlan(["--plan"]);
    assert.equal(output.plan.length, 54);
    assert.equal(output.dryRun, true);
    assert.equal(output.plan.filter(value => value.scene === "street").length, 30);
    assert.equal(output.plan.filter(value => value.scene === "hillside").length, 6);
    assert.equal(output.plan.filter(value => value.scene === "masonry").length, 12);
    assert.equal(output.plan.filter(value => value.scene === "streetlamp").length, 6);
    assert.deepEqual(new Set(output.plan.filter(value => value.scene === "masonry").map(value => value.mode)),
      new Set(["bonded", "flat"]));
    assert.deepEqual(new Set(output.plan.filter(value => value.scene === "street").map(value => value.mode)),
      new Set(["detailed", "no-rooms", "no-streetscape", "no-masonry", "baseline"]));
    assert.equal(new Set(output.plan.map(entry => JSON.stringify(entry))).size, output.plan.length);
    assert.deepEqual(new Set(output.plan.map(value => value.aspect)), new Set(["landscape", "portrait"]));
    assert.deepEqual(new Set(output.plan.map(value => value.frame)), new Set([0, 58, 120]));
  });

  it("supports bounded user-selected combinations", () => {
    const output = createCraftReviewPlan(["--scenes=street", "--aspects=portrait", "--seeds=1,99", "--frames=0,120"]);
    assert.equal(output.plan.length, 20);
    assert.equal(output.plan[0].aspect, "portrait");
    assert.equal(output.plan.at(-1).seed, 99);
    const closeups = createCraftReviewPlan(["--scenes=masonry,streetlamp", "--aspects=landscape", "--frames=0,120"]);
    assert.equal(closeups.plan.length, 6);
    assert.equal(closeups.plan[0].mode, "bonded");
    assert.equal(closeups.plan.at(-1).scene, "streetlamp");
  });

  it("rejects malformed, duplicate or excessive capture plans before any output", () => {
    for (const args of [
      ["--scenes=street,street"], ["--aspects=square"], ["--frames=0,130"],
      ["--seeds=1,1"], ["--port=70000"], ["--unknown=true"],
      ["--seeds=1,2,3,4,5", "--frames=0,20,40,60,120"],
    ]) {
      assert.throws(() => createCraftReviewPlan(args), `${args.join(" ")} should fail`);
    }
  });
});
