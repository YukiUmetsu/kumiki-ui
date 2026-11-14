import type { Meta,StoryObj } from "@storybook/react-vite";
import {CrayonPlayground} from "./crayon-scene-playground";
import {crayonSceneDefaultArgs,crayonDirectorArgTypes} from "./crayon-scene-story-config";

/** Original SVG-native CRAYON1 artwork; stories share one animation player. */
const meta={
  title:"Video production/Film Looks/Crayon/Characters/Draw-In Construction",
  id:"video-crayon-draw-in",
  component:CrayonPlayground,
  args:{...crayonSceneDefaultArgs,subject:"draw-in",startFrame:190},
  argTypes:crayonDirectorArgTypes("draw-in",449),
} satisfies Meta<typeof CrayonPlayground>;
export default meta;
type Story=StoryObj<typeof meta>;
export const CharacterDrawIn:Story={args:{subject:"draw-in",startFrame:190}};
export const CharacterDrawInPortrait:Story={args:{subject:"draw-in",aspect:"portrait",startFrame:280}};
