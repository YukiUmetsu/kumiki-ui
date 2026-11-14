import type { Meta,StoryObj } from "@storybook/react-vite";
import {CrayonPlayground} from "./crayon-scene-playground";
import {crayonSceneDefaultArgs,crayonDirectorArgTypes} from "./crayon-scene-story-config";

/** Original SVG-native CRAYON1 artwork; stories share one animation player. */
const meta={
  title:"Video production/Film Looks/Crayon/Wildlife/The Wild Hare",
  id:"video-crayon-wildlife",
  component:CrayonPlayground,
  args:{...crayonSceneDefaultArgs,subject:"wildlife-portrait",startFrame:198},
  argTypes:crayonDirectorArgTypes("wildlife",239),
} satisfies Meta<typeof CrayonPlayground>;
export default meta;
type Story=StoryObj<typeof meta>;
export const WildlifeHarePortrait:Story={
  args:{subject:"wildlife-portrait",aspect:"landscape",startFrame:198,
    wildlifeDetail:1,wildlifeEarMotion:1,paperTooth:.69},
};
export const WildlifeHarePortraitVertical:Story={
  args:{subject:"wildlife-portrait",aspect:"portrait",startFrame:198,
    wildlifeDetail:1,wildlifeEarMotion:1,paperTooth:.69},
};
export const WildlifeHareEyeMacro:Story={
  args:{subject:"wildlife-portrait",aspect:"landscape",
    startFrame:224,wildlifeCrop:"eye",wildlifeDetail:1,
    wildlifeEarMotion:1,paperTooth:.69},
};
export const WildlifeHareFurMacro:Story={
  args:{subject:"wildlife-portrait",aspect:"landscape",
    startFrame:224,wildlifeCrop:"fur",wildlifeDetail:1,
    wildlifeEarMotion:1,paperTooth:.69},
};
export const WildlifeHareMuzzleMacro:Story={
  args:{subject:"wildlife-portrait",aspect:"landscape",startFrame:224,
    wildlifeCrop:"muzzle",wildlifeDetail:1,wildlifeEarMotion:1,paperTooth:.69},
};
export const WildlifeHareEarMacro:Story={
  args:{subject:"wildlife-portrait",aspect:"landscape",startFrame:224,
    wildlifeCrop:"ear",wildlifeDetail:1,wildlifeEarMotion:1,paperTooth:.69},
};
