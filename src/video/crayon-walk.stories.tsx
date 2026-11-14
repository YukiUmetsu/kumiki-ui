import type { Meta,StoryObj } from "@storybook/react-vite";
import {CrayonPlayground} from "./crayon-scene-playground";
import {crayonSceneDefaultArgs,crayonDirectorArgTypes} from "./crayon-scene-story-config";

/** Original SVG-native CRAYON1 artwork; stories share one animation player. */
const meta={
  title:"Video production/Film Looks/Crayon/Characters/Walk & Rigging",
  id:"video-crayon-walk",
  component:CrayonPlayground,
  args:{...crayonSceneDefaultArgs,subject:"walk",startFrame:156},
  argTypes:crayonDirectorArgTypes("walk",269),
} satisfies Meta<typeof CrayonPlayground>;
export default meta;
type Story=StoryObj<typeof meta>;
export const CharacterWalkCycle:Story={args:{subject:"walk",startFrame:156}};
export const CharacterWalkPortrait:Story={args:{subject:"walk",aspect:"portrait",startFrame:156}};
export const CharacterTwoBoneIK:Story={args:{subject:"walk",rig:"ik",stride:1.15,stepLift:1.35,startFrame:124}};
export const CharacterTwoBoneIKPortrait:Story={args:{subject:"walk",rig:"ik",aspect:"portrait",stride:1.1,stepLift:1.35,startFrame:124}};
