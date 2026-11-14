import type { Meta,StoryObj } from "@storybook/react-vite";
import {CrayonPlayground} from "./crayon-scene-playground";
import {crayonSceneDefaultArgs,crayonDirectorArgTypes} from "./crayon-scene-story-config";

/** Original SVG-native CRAYON1 artwork; stories share one animation player. */
const meta={
  title:"Video production/Film Looks/Crayon/Fantasy/Dragon Village",
  id:"video-crayon-dragon",
  component:CrayonPlayground,
  args:{...crayonSceneDefaultArgs,subject:"dragon-village",startFrame:155},
  argTypes:crayonDirectorArgTypes("dragon",329),
} satisfies Meta<typeof CrayonPlayground>;
export default meta;
type Story=StoryObj<typeof meta>;
export const DragonVillage:Story={args:{subject:"dragon-village",startFrame:155}};
export const DragonVillagePortrait:Story={args:{subject:"dragon-village",aspect:"portrait",startFrame:207}};
export const DragonVillageDuo:Story={args:{subject:"dragon-village",cast:"duo",dragonPalette:"copper",startFrame:260}};
export const DragonAnatomyDetail:Story={args:{subject:"dragon-village",shot:"dragon",villageDetail:1,startFrame:241}};
export const DragonAnatomyDetailPortrait:Story={args:{subject:"dragon-village",shot:"dragon",villageDetail:1,aspect:"portrait",startFrame:241}};
export const CastleMasonryDetail:Story={args:{subject:"dragon-village",shot:"architecture",villageDetail:1,startFrame:241}};
export const DragonHandRedraw:Story={args:{subject:"dragon-village",shot:"dragon",redrawStrength:1,exposureFrames:2,startFrame:221}};
export const DragonWingMorph:Story={args:{subject:"dragon-village",shot:"dragon",wingPower:1.3,redrawStrength:.82,exposureFrames:3,startFrame:182}};
