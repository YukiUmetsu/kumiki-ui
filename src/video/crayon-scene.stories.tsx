import type {Meta,StoryObj} from "@storybook/react-vite";
import {CrayonPlayground} from "./crayon-scene-playground";
import {crayonSceneDefaultArgs,crayonSceneArgTypes} from "./crayon-scene-story-config";

/** General-purpose authoring playground; themed films live in dedicated folders. */
const meta={
  title:"Video production/Film Looks/Crayon/Scenes/Scene Engine",
  id:"video-crayon-scene-engine",
  component:CrayonPlayground,
  args:crayonSceneDefaultArgs,
  argTypes:{
    ...crayonSceneArgTypes,
    startFrame:{control:{type:"range",min:0,max:239,step:1}},
  },
} satisfies Meta<typeof CrayonPlayground>;
export default meta;
type Story=StoryObj<typeof meta>;
export const WaterCycle:Story={};
export const WaterCyclePortrait:Story={args:{aspect:"portrait",startFrame:239}};
export const StorybookTown:Story={args:{subject:"city",startFrame:239}};
export const IllustratedData:Story={args:{subject:"numbers",startFrame:239}};
