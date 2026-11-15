import type { Meta,StoryObj } from "@storybook/react-vite";
import {CrayonPlayground} from "./crayon-scene-playground";
import {crayonSceneDefaultArgs,crayonDirectorArgTypes} from "./crayon-scene-story-config";

/** The remade ArtCraft child is constructed by authentic editable wax marks. */
const meta={
  title:"Video production/Film Looks/Crayon/Characters/The Blue Coat / Draw-In Construction",
  id:"video-crayon-draw-in",
  // ArtCraft v6: reject the legacy gallery until actual 16:9/9:16 crops,
  // rig extrema and reference-led visual acceptance are verified.
  tags:["!dev"],
  component:CrayonPlayground,
  args:{...crayonSceneDefaultArgs,subject:"draw-in",startFrame:190},
  argTypes:crayonDirectorArgTypes("draw-in",449),
} satisfies Meta<typeof CrayonPlayground>;
export default meta;
type Story=StoryObj<typeof meta>;
export const CharacterDrawIn:Story={args:{subject:"draw-in",startFrame:190}};
export const CharacterDrawInPortrait:Story={args:{subject:"draw-in",aspect:"portrait",startFrame:280}};
