// Where the local tools of the storybook films are: one Python environment and the models, in local-assets (git ignores it).
// STORY_PY and STORY_MODELS overrule them. How to set them up: docs/component-specs/storybook-character.md#tools
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

/** The paths of the tools, whether they are there or not. */
export function tools() {
  const models = process.env.STORY_MODELS ?? join(root, "local-assets/storybook/models");
  return {
    python: process.env.STORY_PY ?? join(root, "local-assets/storybook/py/bin/python"), models, paintings: join(root, "local-assets/storybook/paintings"),
    ear: join(models, "phonectc"), julius: join(models, "julius/src/julius/julius"), kit: join(models, "segkit/src"),
  };
}

/** The paths of these tools, or one line that names the first that is missing, and the end of the process. */
export function need(...names) {
  const at = tools(), gone = names.find(n => !existsSync(at[n]));
  if (gone) { console.error(`There is no ${gone} at ${at[gone]}. See docs/component-specs/storybook-character.md#tools.`); process.exit(2); }
  return at;
}
