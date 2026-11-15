import type { Meta,StoryObj } from "@storybook/react-vite";
import {CrayonPlayground} from "./crayon-scene-playground";
import {crayonSceneDefaultArgs,crayonDirectorArgTypes} from "./crayon-scene-story-config";

/** Remade illustrated protagonist; old independent film fixtures are not deleted. */
const meta={
  title:"Video production/Film Looks/Crayon/Blue Coat — Walk & Rigging",
  id:"video-crayon-walk",
  // ArtCraft v6: reject the legacy gallery until actual 16:9/9:16 crops,
  // rig extrema and reference-led visual acceptance are verified.
  tags:["!dev"],
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
