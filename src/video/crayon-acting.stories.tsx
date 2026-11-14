import type { Meta,StoryObj } from "@storybook/react-vite";
import {CrayonPlayground} from "./crayon-scene-playground";
import {crayonSceneDefaultArgs,crayonSceneArgTypes} from "./crayon-scene-story-config";

/** Original SVG-native CRAYON1 artwork; stories share one animation player. */
const meta={
  title:"Video production/Film Looks/Crayon/Characters/Acting & Expression",
  id:"video-crayon-acting",
  component:CrayonPlayground,
  args:{...crayonSceneDefaultArgs,subject:"performance",startFrame:176},
  argTypes:{...crayonSceneArgTypes,
    subject:{table:{disable:true}},
    startFrame:{control:{type:"range",min:0,max:269,step:1}},
    editorialDetail:{control:{type:"range",min:0,max:1,step:.05}},
  },
} satisfies Meta<typeof CrayonPlayground>;
export default meta;
type Story=StoryObj<typeof meta>;
export const CharacterPerformance:Story={args:{subject:"performance",startFrame:176}};
export const CharacterPerformancePortrait:Story={args:{subject:"performance",aspect:"portrait",startFrame:176}};
