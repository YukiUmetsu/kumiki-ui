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
  "staticDirs": [
    ...(existsSync(new URL("../fixtures/real-source/", import.meta.url))
      ? [{ "from": "../fixtures/real-source", "to": "/k1" }] : []),
    { "from": "../src/video/assets/nature3d", "to": "/nature3d" }
  ]
};
export default config;