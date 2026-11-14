import type { Meta,StoryObj } from "@storybook/react-vite";
import {CrayonPlayground} from "./crayon-scene-playground";
import {crayonSceneDefaultArgs,crayonSceneArgTypes} from "./crayon-scene-story-config";

/** Original SVG-native CRAYON1 artwork; stories share one animation player. */
const meta={
  title:"Video production/Film Looks/Crayon/Characters/Draw-In Construction",
  id:"video-crayon-draw-in",
  component:CrayonPlayground,
  args:{...crayonSceneDefaultArgs,subject:"draw-in",startFrame:190},
  argTypes:{...crayonSceneArgTypes,
    subject:{table:{disable:true}},
    startFrame:{control:{type:"range",min:0,max:449,step:1}},
    drawOrder:{control:"inline-radio",options:["outline-first","fill-first"]},
    outlineFraction:{control:{type:"range",min:.1,max:.75,step:.05}},
    waxGlaze:{control:{type:"range",min:0,max:.45,step:.03}},
  },
} satisfies Meta<typeof CrayonPlayground>;
export default meta;
type Story=StoryObj<typeof meta>;
export const CharacterDrawIn:Story={args:{subject:"draw-in",startFrame:190}};
export const CharacterDrawInPortrait:Story={args:{subject:"draw-in",aspect:"portrait",startFrame:280}};
