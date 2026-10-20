import assert from "node:assert/strict";
import { test } from "node:test";
import { spawnSync } from "node:child_process";
import { prepareCatalog } from "../scripts/catalog-data.mjs";
import { inspectCatalogApi } from "../scripts/catalog-api-data.mjs";

const entries = prepareCatalog();
const inspect = (id, options) => {
  const entry = entries.find(value => value.id === id);
  assert.ok(entry, "Missing catalog entry " + id);
  return inspectCatalogApi(entry, options);
};
const exported = (data, name) => {
  const item = data.exports.find(value => value.name === name);
  assert.ok(item, "Missing export " + name);
  return item;
};
const property = (item, name) => {
  const prop = item.properties?.find(p => p.name === name);
  assert.ok(prop, "Missing source-backed property " + name);
  return prop;
};

test("React forwardRef components expose verified own props, required fields and actual defaults", () => {
  const api = inspect("pack:button");
  assert.equal(api.status, "verified");
  assert.equal(api.registryItem, "button");
  const button = exported(api, "Button");
  assert.equal(button.kind, "component");
  assert.equal(property(button, "variant").default, "primary");
  assert.equal(property(button, "size").default, "md");
  assert.equal(property(button, "isLoading").default, false);
  assert.equal(property(button, "children").required, false);
  assert.ok(button.inheritedPropertiesOmitted > 0, "React/motion props must not flood the output");
  assert.equal(exported(api, "default").aliasOf, "Button");
});

test("multi-file packs expose public exports without fabricating a single component", () => {
  const api = inspect("pack:input");
  assert.equal(api.status, "verified");
  const input = exported(api, "Input");
  const field = exported(api, "Field");
  assert.equal(input.kind, "component");
  assert.equal(field.kind, "component");
  assert.equal(property(input, "autoResize").default, false);
  assert.ok(property(field, "label"));
  assert.ok(api.sources.includes("registry/ui/field-input.tsx"));
});

test("camera props include source-verified external-frame contracts", () => {
  const api = inspect("pack:camera-stage", { exportName: "CameraStage" });
  const stage = exported(api, "CameraStage");
  assert.equal(stage.kind, "component");
  for (const name of ["timeline", "frame", "width", "height"])
    assert.equal(property(stage, name).required, true);
  assert.equal(property(stage, "cameraId").default, "camera");
  assert.equal(api.exports.length, 1);
});

test("pure motion compilers expose callable signatures, not fake component props", () => {
  const api = inspect("pack:motion-director", { exportName: "compileMotionDirector" });
  const compiler = exported(api, "compileMotionDirector");
  assert.equal(compiler.kind, "function");
  assert.equal(compiler.signatures[0].parameters[0].name, "input");
  assert.equal(compiler.signatures[0].parameters[0].type, "unknown");
  assert.match(compiler.signatures[0].returns, /DirectorCompilation/);
});

test("semantic objects resolve to their real containing pack, never invented APIs", () => {
  const api = inspect("object:finance:atm:2d");
  assert.equal(api.apiScope, "registry-pack");
  assert.equal(api.registryItem, "domain-finance-objects-2d");
  assert.match(api.note, /not a per-object API/);
});

test("unknown exported symbols fail explicitly rather than guessing", () => {
  assert.throws(() => inspect("pack:button", { exportName: "NotARealExport" }),
    /not found/);
});

test("CLI offers stable parseable JSON for agents", () => {
  const run = spawnSync(process.execPath, ["scripts/catalog-api.mjs",
    "--id=button", "--export=Button", "--format=json"],
    { encoding: "utf8", timeout: 60000 });
  assert.equal(run.status, 0, run.stderr);
  const data = JSON.parse(run.stdout);
  assert.equal(data.id, "pack:button");
  assert.equal(data.status, "verified");
  assert.equal(exported(data, "Button").kind, "component");
});
