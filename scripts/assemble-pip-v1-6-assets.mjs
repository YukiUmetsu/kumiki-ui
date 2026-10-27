/**
 * Import registered artwork from the user-provided Pip Animated Rig v1.6 Complete ZIP.
 *
 * Usage (after extracting the ZIP):
 *   node scripts/assemble-pip-v1-6-assets.mjs /path/to/Pip_Animated_Rig
 *
 * All source drawings remain intact. Gesture arms are mechanically registered on
 * a shared transparent 500px canvas because CharacterPart has one pivot shared
 * by every variant. Requires ImageMagick's `convert` command at import time only.
 */
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const sourceRoot = process.argv[2] && resolve(process.argv[2]);
if (!sourceRoot) throw new Error("Provide the extracted Pip_Animated_Rig directory.");

const manifest = JSON.parse(readFileSync(join(sourceRoot, "rig.json"), "utf8"));
if (manifest.schemaVersion !== "1.6-rebuild" || manifest.stage.width !== 1440 || manifest.stage.height !== 900) {
  throw new Error("Expected the registered Pip v1.6 rebuild with 1440×900 coordinates.");
}
const arms = JSON.parse(readFileSync(join(sourceRoot, manifest.art.arms), "utf8"));
const requiredArms = ["relaxed", "point", "wave", "open", "ask"].flatMap(kind => ["left", "right"].map(side => `${kind}_${side}`));
if (requiredArms.some(key => !arms[key])) throw new Error("Missing a registered forepaw variant.");

const dest = resolve(dirname(fileURLToPath(import.meta.url)), "../src/character/fixtures/pip-assets-v1-6");
mkdirSync(dest, { recursive: true });
const assetDir = join(sourceRoot, "assets/pip");
const rest = ["torso", "tail", "leg_left", "leg_right", "head_blank", "scarf", "satchel_shoulderstrap"];
const mouths = Array.from({ length: 7 }, (_, stage) => `mouth_stage_${stage}`);
const inbetweens = Array.from({ length: 6 }, (_, stage) =>
  Array.from({ length: 3 }, (_, frame) => `mouth_inbetween_${stage}_${stage + 1}_${frame + 1}`)).flat();

for (const basename of [...rest, ...mouths, ...inbetweens]) {
  copyFileSync(join(assetDir, `${basename}.png`), join(dest, `${basename}.png`));
}

// This registration is equivalent to renderer.mjs's drawArm() translation:
// every image's proximal shoulder landmark sits at (250, 250) in its frame.
for (const name of requiredArms) {
  const registration = arms[name];
  const left = Math.round(250 - registration.origin[0]);
  const top = Math.round(250 - registration.origin[1]);
  if (left < 0 || top < 0 || left + registration.width > 500 || top + registration.height > 500) {
    throw new Error(`Forepaw ${name} exceeds its shared 500px registration canvas.`);
  }
  execFileSync("convert", [
    "-size", "500x500", "xc:none", "(", join(assetDir, registration.file),
    "-resize", `${registration.width}x${registration.height}!`, ")",
    "-geometry", `+${left}+${top}`, "-compose", "Over", "-composite",
    join(dest, `arm_${name}.png`),
  ]);
}
console.log(`Imported ${rest.length + mouths.length + inbetweens.length + requiredArms.length} v1.6 PNG assets into ${dest}`);
