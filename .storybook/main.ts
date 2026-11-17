import type { StorybookConfig } from '@storybook/react-vite';
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// The version in every cached render's key (`registry/anatomy/foundation-render.ts`): a hash of the renderers' source
// and data, taken when Storybook starts, so a changed renderer never draws a stale cached picture.
function renderVersion(): string {
  const h = createHash('sha1');
  const walk = (dir: string) => {
    for (const f of readdirSync(dir).sort()) {
      const p = join(dir, f);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(ts|tsx|json)$/.test(f)) h.update(p).update(readFileSync(p));
    }
  };
  for (const d of ['anatomy', 'nature', 'materials']) walk(fileURLToPath(new URL(`../registry/${d}/`, import.meta.url)));
  return h.digest('hex').slice(0, 16);
}

const config: StorybookConfig = {
  "stories": [
    "../src/**/*.mdx",
    "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"
  ],
  "addons": [
    "@chromatic-com/storybook",
    "@storybook/addon-vitest",
    "@storybook/addon-a11y",
    "@storybook/addon-docs",
    "@storybook/addon-onboarding"
  ],
  "framework": "@storybook/react-vite",
  viteFinal: async config => ({ ...config, define: { ...config.define, __KUMIKI_RENDER_VERSION__: JSON.stringify(renderVersion()) } }),
  // Generated footage for the real-source stories (`npm run video:fixtures -- fixtures/real-source`).
  // Not committed; the stories fail with a clear message when it is missing.
  // CC0 3D plants served to the nature-world story (`/nature3d/<id>/<id>_1k.gltf`).
  // A shodō teacher's fitted forms (`local-assets/shodo-teachers/teacher.json`): the owner's
  // local study data, never committed; the shodō stories use the rules when it is missing.
  "staticDirs": [
    ...(existsSync(new URL("../fixtures/real-source/", import.meta.url))
      ? [{ "from": "../fixtures/real-source", "to": "/k1" }] : []),
    ...(existsSync(new URL("../local-assets/shodo-teachers/", import.meta.url))
      ? [{ "from": "../local-assets/shodo-teachers", "to": "/shodo-teachers" }] : []),
    { "from": "../src/video/assets/nature3d", "to": "/nature3d" }
  ]
};
export default config;