import type { StorybookConfig } from '@storybook/react-vite';

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
  "options": {
    "storySort": {
      "method": "alphabetical",
      "order": [
        "Discover",
        "Components",
        "Patterns",
        "Media",
        "Motion",
        "Infographic",
        "Explainers",
        "House Math",
        ["Overview", "Home Kit 3D", "Inspectable Asset", "*", "Lab"],
        "Pages"
      ]
    }
  }
};
export default config;