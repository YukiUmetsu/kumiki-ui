import type { Meta, StoryObj } from "@storybook/react-vite";
import { InkLooksStudio } from "./ink-film-looks-studio";

/** The original three ink looks remain one configurable Studio, now nested
 * under the same Chinese Ink Storybook folder as the material and film demos. */
const meta={ title:"Video production/Film Looks/Chinese Ink/Studio",
  id:"video-chinese-ink-looks",component:InkLooksStudio,
  parameters:{layout:"fullscreen"} } satisfies Meta<typeof InkLooksStudio>;
export default meta;

export const ChineseInkPainting: StoryObj<typeof InkLooksStudio> = {
  name: "Chinese Ink · Brush Painting Animation",
  render: () => <InkLooksStudio initialMode="painting"/>,
};
export const ChineseInkDocumentary: StoryObj<typeof InkLooksStudio> = {
  name: "Chinese Ink · Documentary and Explainer Animation",
  render: () => <InkLooksStudio initialMode="documentary"/>,
};
export const ChineseInkCharacter: StoryObj<typeof InkLooksStudio> = {
  name: "Chinese Ink · Character Animation",
  render: () => <InkLooksStudio initialMode="character"/>,
};
