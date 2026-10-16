import { defineConfig } from 'storybook/vite';

export default defineConfig({
  stories: ['src/**/*.stories.@js', 'src/**/*.stories.tsx'],
  core: 'storybook',
});
