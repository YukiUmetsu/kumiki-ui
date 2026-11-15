import type { Meta,StoryObj } from "@storybook/react-vite";
import {CrayonPlayground} from "./crayon-scene-playground";
import {crayonSceneDefaultArgs,crayonDirectorArgTypes} from "./crayon-scene-story-config";

/** Remade ArtCraft child portrait and garment studies, still portable CRAYON1. */
const meta={
  title:"Video production/Film Looks/Crayon/Blue Coat — Portrait Atelier",
  id:"video-crayon-acting",
  // ArtCraft v6: reject the legacy gallery until actual 16:9/9:16 crops,
  // rig extrema and reference-led visual acceptance are verified.
  tags:["!dev"],
  component:CrayonPlayground,
  args:{...crayonSceneDefaultArgs,subject:"performance",startFrame:176},
  argTypes:crayonDirectorArgTypes("acting",269),
} satisfies Meta<typeof CrayonPlayground>;
export default meta;
type Story=StoryObj<typeof meta>;
export const CharacterPerformance:Story={args:{subject:"performance",startFrame:176}};
export const CharacterPerformancePortrait:Story={args:{subject:"performance",aspect:"portrait",startFrame:176}};
export const CharacterFaceMacro:Story={args:{subject:"performance",startFrame:238,atelierCrop:"face",atelierExpression:"smile"}};
export const CharacterCostumeMacro:Story={args:{subject:"performance",startFrame:238,atelierCrop:"costume",atelierExpression:"smile"}};
export const CharacterCuriousPortrait:Story={args:{subject:"performance",startFrame:238,atelierExpression:"wonder"}};
export const CharacterConcernedPortrait:Story={args:{subject:"performance",startFrame:238,atelierExpression:"concern"}};
