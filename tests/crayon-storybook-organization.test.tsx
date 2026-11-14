import {describe,expect,it} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {CrayonPlayground} from "../src/video/crayon-scene-playground";
import {crayonSceneDefaultArgs} from "../src/video/crayon-scene-story-config";
import sceneMeta,{WaterCycle,WaterCyclePortrait,StorybookTown,IllustratedData} from "../src/video/crayon-scene.stories";
import wildlifeMeta,{WildlifeHarePortrait,WildlifeHarePortraitVertical,WildlifeHareEyeMacro,WildlifeHareFurMacro,WildlifeHareMuzzleMacro,WildlifeHareEarMacro} from "../src/video/crayon-wildlife.stories";
import actingMeta,{CharacterPerformance,CharacterPerformancePortrait} from "../src/video/crayon-acting.stories";
import walkMeta,{CharacterWalkCycle,CharacterWalkPortrait,CharacterTwoBoneIK,CharacterTwoBoneIKPortrait} from "../src/video/crayon-walk.stories";
import drawMeta,{CharacterDrawIn,CharacterDrawInPortrait} from "../src/video/crayon-draw-in.stories";
import dragonMeta,{DragonVillage,DragonVillagePortrait,DragonVillageDuo,DragonAnatomyDetail,DragonAnatomyDetailPortrait,CastleMasonryDetail,DragonHandRedraw,DragonWingMorph} from "../src/video/crayon-dragon.stories";
import materialMeta from "../src/video/crayon-material-studies.stories";
import legacyMeta from "../src/video/crayon-storybook.stories";

describe("Crayon Storybook organization",()=>{
 it("keeps each production discipline in its own sidebar group, without duplicate ids",()=>{
   const metas=[sceneMeta,wildlifeMeta,actingMeta,walkMeta,drawMeta,dragonMeta,materialMeta,legacyMeta];
   const ids=metas.map(m=>m.id);
   expect(new Set(ids).size).toBe(metas.length);
   expect(ids).toContain("video-crayon-scene-engine");
   expect(metas.every(m=>m.title.startsWith("Video production/Film Looks/Crayon/"))).toBe(true);
   const folders=metas.map(m=>m.title.split("/").slice(3,-1).join("/"));
   expect(folders.filter(Boolean).length).toBe(metas.length);
   expect(folders.some(name=>name.includes("Wildlife"))).toBe(true);
   expect(folders.some(name=>name.includes("Characters"))).toBe(true);
   expect(folders.some(name=>name.includes("Materials"))).toBe(true);
 });
 it("places all curated stories once, with complete playback defaults",()=>{
   const groups=[
     {meta:sceneMeta,stories:[WaterCycle,WaterCyclePortrait,StorybookTown,IllustratedData]},
     {meta:wildlifeMeta,stories:[WildlifeHarePortrait,WildlifeHarePortraitVertical,WildlifeHareEyeMacro,WildlifeHareFurMacro,WildlifeHareMuzzleMacro,WildlifeHareEarMacro]},
     {meta:actingMeta,stories:[CharacterPerformance,CharacterPerformancePortrait]},
     {meta:walkMeta,stories:[CharacterWalkCycle,CharacterWalkPortrait,CharacterTwoBoneIK,CharacterTwoBoneIKPortrait]},
     {meta:drawMeta,stories:[CharacterDrawIn,CharacterDrawInPortrait]},
     {meta:dragonMeta,stories:[DragonVillage,DragonVillagePortrait,DragonVillageDuo,DragonAnatomyDetail,DragonAnatomyDetailPortrait,CastleMasonryDetail,DragonHandRedraw,DragonWingMorph]},
   ];
   expect(groups.flatMap(x=>x.stories)).toHaveLength(26);
   const expected=["seed","paperTooth","aspect","playbackRate","loop","startFrame","reducedMotion"];
   for(const {meta,stories} of groups){
     expect(stories.length).toBeGreaterThan(1);
     expect(meta.args).toEqual(expect.objectContaining(Object.fromEntries(expected.map(k=>[k,expect.anything()]))));
     for(const story of stories){
       expect(story.args?.subject??meta.args.subject).toBeTruthy();
       expect(story.args?.startFrame??meta.args.startFrame).toBeLessThanOrEqual(449);
     }
   }
   expect(crayonSceneDefaultArgs.wildlifeCrop).toBe("composition");
   expect(CrayonPlayground).toBeTypeOf("function");
 });
 it("the new close-ups use the original composable scene renderer, not raster screenshots",()=>{
   expect(wildlifeMeta.args.subject).toBe("wildlife-portrait");
   const macroStories=[WildlifeHareEyeMacro,WildlifeHareFurMacro,WildlifeHareMuzzleMacro,WildlifeHareEarMacro];
   const crops=macroStories.map(story=>story.args?.wildlifeCrop);
   expect(new Set(crops).size).toBe(4);
   expect(crops).toEqual(expect.arrayContaining(["eye","fur","muzzle","ear"]));
   const html=renderToStaticMarkup(<CrayonPlayground {...crayonSceneDefaultArgs}
      subject="wildlife-portrait" aspect="landscape" wildlifeCrop="muzzle"
      startFrame={228} reducedMotion/>);
   expect(html).toContain('data-km-crayon-scene="crayon-wildlife-portrait-landscape"');
   expect(html).toContain('data-km-crayon-element="maxillary-junction"');
   expect(html).toContain('data-km-crayon-underpaint="opaque"');
   expect(html).not.toContain('data-km-crayon-element="headline"');
 });
 it("specializes each director's controls to the actual runtime frame range",()=>{
   expect((wildlifeMeta.argTypes?.startFrame as {control:{max:number}}).control.max).toBe(239);
   expect((actingMeta.argTypes?.startFrame as {control:{max:number}}).control.max).toBe(269);
   expect((walkMeta.argTypes?.startFrame as {control:{max:number}}).control.max).toBe(269);
   expect((dragonMeta.argTypes?.startFrame as {control:{max:number}}).control.max).toBe(329);
   expect((drawMeta.argTypes?.startFrame as {control:{max:number}}).control.max).toBe(449);
   expect((sceneMeta.argTypes?.startFrame as {control:{max:number}}).control.max).toBe(239);
 });
});
