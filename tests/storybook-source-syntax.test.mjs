import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { reviewStorybookSyntax } from "../scripts/check-video-storybook-source.mjs";

function withProject(files, run) {
  const root = mkdtempSync(join(tmpdir(), "kumiki-story-parse-"));
  try {
    for (const [name, contents] of Object.entries(files)) {
      const target = join(root, "src/components/video", name);
      mkdirSync(join(root, "src/components/video"), {recursive:true});
      writeFileSync(target, contents);
    }
    return run(root);
  } finally { rmSync(root, {recursive:true, force:true}); }
}
test("valid Scene Templates JSX and imported renderer pass syntax preflight", () =>
  withProject({
    "scene-templates.stories.tsx": `import { Scene } from "./renderer"; export default {title:"Scene"};
      export const Default={render:()=> <Scene/>};`,
    "renderer.tsx": `export const Scene=()=> <div style={{position:"relative"}}/>;`,
  }, root => {
    const result=reviewStorybookSyntax(root, ["src/components/video"]);
    assert.equal(result.issues.length, 0);
    assert.equal(result.files.length, 2);
  })
);
test("regression: missing JSX closing slash reports the real module and line", () =>
  withProject({
    "scene-templates.stories.tsx": `import { Scene } from "./renderer";
      export const Default={render:()=> <Scene/>};`,
    "renderer.tsx": `export function Scene(){return <div>{Array.from({length:2},(_,i)=>{
      return <div key={i} style={{position:"absolute"}};})}</div>}`,
  }, root => {
    const result=reviewStorybookSyntax(root, ["src/components/video"]);
    assert.ok(result.issues.length>0, "TypeScript parser must detect malformed JSX");
    assert.ok(result.issues.some(d=>d.file==="src/components/video/renderer.tsx"));
    assert.ok(result.issues.some(d=>d.line>=1&&d.column>=1));
  })
);
test("bad local import has an actionable module path", () =>
  withProject({
    "scene-templates.stories.tsx": 'import { Demo } from "./does-not-exist"; export const DemoScene=()=> <div/>;',
  }, root => {
    const result=reviewStorybookSyntax(root, ["src/components/video"]);
    assert.ok(result.issues.some(d=>d.message.includes('Unresolved local import "./does-not-exist"')));
  })
);
