import {describe,expect,it} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {CrayonPlayground,applyCrayonStudyWaxSettings,crayonPreviewPaperOverrides} from "../src/video/crayon-scene-playground";
import {crayonSceneDefaultArgs,crayonSceneArgTypes} from "../src/video/crayon-scene-story-config";
import {crayonWildlifePortraitScene} from "../src/video/crayon-wildlife-portrait-fixtures";
import sceneMeta,{WaterCycle,WaterCyclePortrait,StorybookTown,IllustratedData} from "../src/video/crayon-scene.stories";
import wildlifeMeta,{WildlifeHarePortrait,WildlifeHarePortraitVertical,WildlifeHareEyeMacro,WildlifeHareFurMacro,WildlifeHareMuzzleMacro,WildlifeHareEarMacro} from "../src/video/crayon-wildlife.stories";
import actingMeta,{CharacterPerformance,CharacterPerformancePortrait,CharacterFaceMacro,CharacterCostumeMacro,CharacterCuriousPortrait,CharacterConcernedPortrait} from "../src/video/crayon-acting.stories";
import walkMeta,{CharacterWalkCycle,CharacterWalkPortrait,CharacterTwoBoneIK,CharacterTwoBoneIKPortrait} from "../src/video/crayon-walk.stories";
import drawMeta,{CharacterDrawIn,CharacterDrawInPortrait} from "../src/video/crayon-draw-in.stories";
import dragonMeta,{DragonVillage,DragonVillagePortrait,DragonVillageDuo,DragonAnatomyDetail,DragonAnatomyDetailPortrait,CastleMasonryDetail,DragonHandRedraw,DragonWingMorph} from "../src/video/crayon-dragon.stories";
import materialMeta from "../src/video/crayon-material-studies.stories";
import drawingMeta from "../src/video/crayon-drawing-system.stories";
import adultFaceMeta from "../src/video/crayon-artcraft-adult-face.stories";
import legacyMeta from "../src/video/crayon-storybook.stories";

describe("Crayon Storybook organization",()=>{
 it("keeps all Crayon demos directly under one Storybook folder without duplicate story IDs",()=>{
   const metas=[sceneMeta,wildlifeMeta,actingMeta,walkMeta,drawMeta,dragonMeta,
     materialMeta,legacyMeta,drawingMeta,adultFaceMeta];
   const ids=metas.map(m=>m.id);
   expect(new Set(ids).size).toBe(metas.length);
   expect(ids).toContain("video-crayon-scene-engine");
   const prefix="Video production/Film Looks/Crayon/";
   for(const meta of metas){
     expect(meta.title.startsWith(prefix)).toBe(true);
     const page=meta.title.slice(prefix.length);
     expect(page.length).toBeGreaterThan(0);
     expect(page).not.toContain("/");
   }
   expect(new Set(metas.map(m=>m.title)).size).toBe(metas.length);
   // Experimental artwork stays quarantined; navigation cleanup is not
   // artistic approval of an unreviewed face or material demo.
   expect(adultFaceMeta.tags).toContain("!dev");
   expect(drawingMeta.tags).toContain("!dev");
 });
 it("places all curated stories once, with complete playback defaults",()=>{
   const groups=[
     {meta:sceneMeta,stories:[WaterCycle,WaterCyclePortrait,StorybookTown,IllustratedData]},
     {meta:wildlifeMeta,stories:[WildlifeHarePortrait,WildlifeHarePortraitVertical,WildlifeHareEyeMacro,WildlifeHareFurMacro,WildlifeHareMuzzleMacro,WildlifeHareEarMacro]},
     {meta:actingMeta,stories:[CharacterPerformance,CharacterPerformancePortrait,CharacterFaceMacro,CharacterCostumeMacro,CharacterCuriousPortrait,CharacterConcernedPortrait]},
     {meta:walkMeta,stories:[CharacterWalkCycle,CharacterWalkPortrait,CharacterTwoBoneIK,CharacterTwoBoneIKPortrait]},
     {meta:drawMeta,stories:[CharacterDrawIn,CharacterDrawInPortrait]},
     {meta:dragonMeta,stories:[DragonVillage,DragonVillagePortrait,DragonVillageDuo,DragonAnatomyDetail,DragonAnatomyDetailPortrait,CastleMasonryDetail,DragonHandRedraw,DragonWingMorph]},
   ];
   expect(groups.flatMap(x=>x.stories)).toHaveLength(30);
   const expected=["seed","paperTooth","aspect","playbackRate","loop","startFrame","reducedMotion"];
   for(const {meta,stories} of groups){
     expect(stories.length).toBeGreaterThan(1);
     expect(meta.args).toEqual(expect.objectContaining(Object.fromEntries(expected.map(k=>[k,expect.anything()]))));
     for(const story of stories){
       expect(story.args?.subject??meta.args.subject).toBeTruthy();
       expect(story.args?.startFrame??meta.args.startFrame).toBeLessThanOrEqual(449);
     }
   }
   for(const unapproved of [actingMeta,walkMeta,drawMeta,dragonMeta,wildlifeMeta]){
     expect(unapproved.tags).toContain("!dev");
   }
   expect(legacyMeta.tags).toContain("!dev");
   expect(materialMeta.tags).toContain("!dev");
   expect(crayonSceneDefaultArgs.wildlifeCrop).toBe("composition");
   expect(crayonSceneDefaultArgs.paperRecipe).toBe("authored");
   expect(crayonSceneDefaultArgs.atelierCrop).toBe("composition");
   expect(CrayonPlayground).toBeTypeOf("function");
 });
 it("the new close-ups use the original composable scene renderer, not raster screenshots",()=>{
   expect(wildlifeMeta.args.subject).toBe("wildlife-portrait");
   const macroStories=[WildlifeHareEyeMacro,WildlifeHareFurMacro,WildlifeHareMuzzleMacro,WildlifeHareEarMacro];
   const crops=macroStories.map(story=>story.args?.wildlifeCrop);
   expect(new Set(crops).size).toBe(4);
   expect(crops).toEqual(expect.arrayContaining(["eye","fur","muzzle","ear"]));
   // Every macro camera must pass the CRAYON1 camera contract (zoom 1..3):
   // the eye crop once asked for 3.35 and the story threw.
   for(const story of macroStories)
     expect(()=>renderToStaticMarkup(<CrayonPlayground {...crayonSceneDefaultArgs}
       {...story.args} subject="wildlife-portrait" reducedMotion/>)).not.toThrow();
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

 it("focuses Crayon control panels on each director and never exposes unrelated rigs",()=>{
   const control=(meta:{argTypes?:unknown},name:string)=>
     (meta.argTypes as Record<string,{control?:unknown;table?:{disable?:boolean;category?:string};options?:unknown}>)[name];
   const groups=[
     {meta:sceneMeta,shown:["subject","paperTooth"],hidden:["wingPower","wildlifeCrop","rig","waxGlaze"]},
     {meta:wildlifeMeta,shown:["wildlifeDetail","wildlifeCrop","wildlifeEarMotion"],hidden:["wingPower","stride","editorialDetail","drawOrder"]},
     {meta:actingMeta,shown:["editorialDetail","atelierExpression","atelierCrop"],hidden:["wildlifeCrop","rig","wingPower"]},
     {meta:walkMeta,shown:["rig","stride","stepLift"],hidden:["wildlifeDetail","cast","drawOrder"]},
     {meta:drawMeta,shown:["drawOrder","outlineFraction","waxGlaze"],hidden:["rig","wingPower","wildlifeCrop"]},
     {meta:dragonMeta,shown:["wingPower","villageDetail","shot","cast"],hidden:["wildlifeCrop","stepLift","editorialDetail"]},
   ];
   for(const {meta,shown,hidden} of groups){
     for(const name of shown){
       expect(control(meta,name)?.table?.disable).not.toBe(true);
       expect(control(meta,name)?.table?.category).toBe(name==="paperTooth"?"Wax & Paper":"Subject & Acting");
     }
     for(const name of hidden){
       expect(control(meta,name)).toEqual({control:false,table:{disable:true}});
     }
     for(const name of ["aspect","seed","paperTooth","playbackRate","loop","startFrame","reducedMotion"]){
       expect(control(meta,name)?.table?.disable).not.toBe(true);
     }
     expect(control(meta,"startFrame")?.table?.category).toBe("Playback");
     expect(control(meta,"paperTooth")?.table?.category).toBe("Wax & Paper");
   }
   expect(control(sceneMeta,"subject")?.options).toEqual(["water-cycle","city","numbers"]);
   for(const meta of [wildlifeMeta,actingMeta,walkMeta,drawMeta,dragonMeta]){
     expect(control(meta,"subject")).toEqual({control:false,table:{disable:true}});
   }
 });

 it("preserves each ArtCraft wax region's native nib/order/mark length unless deliberately overridden",()=>{
   const scene=crayonWildlifePortraitScene("landscape");
   const wax=scene.elements.find(node=>node.kind==="wax"&&node.id==="shoulder-silhouette");
   const contour=scene.elements.find(node=>node.kind==="contour");
   expect(wax).toBeDefined();
   expect(contour).toBeDefined();
   const authored={nibStyle:"authored" as const,strokeOrder:"authored" as const,markLength:"authored" as const};
   expect(applyCrayonStudyWaxSettings(wax!,authored)).toBe(wax);
   expect(applyCrayonStudyWaxSettings(contour!,{nibStyle:"rounded",strokeOrder:"scanline",markLength:"short"})).toBe(contour);
   const experiment=applyCrayonStudyWaxSettings(wax!,{
     nibStyle:"rounded",strokeOrder:"scanline",markLength:"short",
   });
   expect(experiment).toEqual({...wax,nibStyle:"rounded",strokeOrder:"scanline",markLength:"short"});
   expect(wax).toMatchObject({nibStyle:"tapered",strokeOrder:"patches",markLength:"long"});
   const partial=applyCrayonStudyWaxSettings(wax!,{
     nibStyle:"authored",strokeOrder:"authored",markLength:"short",
   });
   expect(partial).toEqual({...wax,markLength:"short"});
   expect(crayonSceneDefaultArgs).toMatchObject(authored);
   for(const key of ["nibStyle","strokeOrder","markLength"]){
     expect((crayonSceneArgTypes[key as keyof typeof crayonSceneArgTypes] as {options?:string[]}).options).toContain("authored");
   }
 });

 it("defaults to film-identical paper recipes, preserving both native aspects and all material seeds",()=>{
   const original=crayonWildlifePortraitScene("landscape");
   const vertical=crayonWildlifePortraitScene("portrait");
   const source={paperRecipe:"authored" as const,seed:54,paperTooth:.64};
   for(const base of [original,vertical]){
     const override=crayonPreviewPaperOverrides(source);
     expect(override).toEqual({});
     expect({...base,...override}).toEqual(base);
     expect(base.seed).toBe(8642);
     expect(base.paperTooth).toBe(.69);
   }
   const preview=renderToStaticMarkup(<CrayonPlayground {...crayonSceneDefaultArgs}
     subject="wildlife-portrait" aspect="landscape" startFrame={239} reducedMotion/>);
   expect(preview).toContain('data-km-crayon-seed="8642"');
 });
 it("allows explicit seed and tooth experiments without changing original film specs",()=>{
   const base=crayonWildlifePortraitScene("landscape");
   const custom={paperRecipe:"custom" as const,seed:771,paperTooth:.3};
   const override=crayonPreviewPaperOverrides(custom);
   expect(override).toEqual({seed:771,paperTooth:.3});
   expect({...base,...override}).toMatchObject(override);
   expect(base.seed).toBe(8642);
   expect(base.paperTooth).toBe(.69);
   expect(()=>crayonPreviewPaperOverrides({...custom,seed:NaN})).toThrow(/paper recipe/);
   expect(()=>crayonPreviewPaperOverrides({...custom,paperTooth:-.1})).toThrow(/paper recipe/);
   expect(()=>crayonPreviewPaperOverrides({...custom,paperTooth:1.1})).toThrow(/paper recipe/);
   for(const page of [sceneMeta,wildlifeMeta,actingMeta,walkMeta,drawMeta,dragonMeta]){
     const args=page.argTypes as Record<string,{options?:string[];if?:{arg:string;eq:string};table?:{category?:string}}>;
     expect(args.paperRecipe.options).toEqual(["authored","custom"]);
     expect(args.paperRecipe.table?.category).toBe("Wax & Paper");
     expect(args.seed.if).toEqual({arg:"paperRecipe",eq:"custom"});
     expect(args.paperTooth.if).toEqual({arg:"paperRecipe",eq:"custom"});
   }
 });
 it("never overlays unmeasured editorial SVG copy on portrait art",()=>{
   const science=renderToStaticMarkup(<CrayonPlayground {...crayonSceneDefaultArgs}
     subject="water-cycle" aspect="portrait" startFrame={239} reducedMotion/>);
   expect(science).toContain('data-km-crayon-scene="');
   expect(science).not.toContain('data-km-crayon-lettering="headline"');
   expect(science).not.toContain('data-km-crayon-lettering="subtitle"');
   expect(science).not.toContain('data-km-crayon-element="footer"');
   const actor=renderToStaticMarkup(<CrayonPlayground {...crayonSceneDefaultArgs}
     subject="performance" aspect="portrait" startFrame={239} reducedMotion/>);
   expect(actor).toContain('data-km-crayon-element="face"');
   expect(actor).not.toContain('data-km-crayon-lettering="headline"');
   expect(actor).not.toContain('data-km-crayon-element="subtitle"');
   // Storybook still labels the film in accessible HTML, outside the artwork.
   expect(actor).toContain("The Blue Coat / Portrait Atelier");
   const wide=renderToStaticMarkup(<CrayonPlayground {...crayonSceneDefaultArgs}
     subject="performance" aspect="landscape" startFrame={239} reducedMotion/>);
   expect(wide).toContain('data-km-crayon-element="headline"');
 });
});
