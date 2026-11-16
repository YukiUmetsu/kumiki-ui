import type { StorybookConfig } from '@storybook/react-vite';
import { existsSync } from 'node:fs';

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