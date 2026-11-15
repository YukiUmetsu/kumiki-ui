import {expect,test} from "@playwright/test";
import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {CrayonScene} from "../../registry/video/materials/crayon-scene-react";
import {inspectCrayonScene} from "../../registry/video/materials/crayon-scene";
import {crayonWildlifePortraitScene} from "../../src/video/crayon-wildlife-portrait-fixtures";

/** ArtCraft stage 4: source-native actual CRAYON1 pixels, not composited PNGs. */
for(const item of [
  {aspect:"landscape",width:960,height:540,focusX:622,focusY:300},
  {aspect:"portrait",width:540,height:960,focusX:286,focusY:542},
] as const){
  for(const frame of [89,203,237]){
    test("Hare ocular ArtCraft v7 "+item.aspect+" frame "+frame,async({page},info)=>{
      const scene=crayonWildlifePortraitScene(item.aspect,{detail:1,earMotion:1});
      const framed={...scene,camera:[
        {frame:0,focusX:item.focusX,focusY:item.focusY,zoom:3},
        {frame:scene.durationFrames-1,focusX:item.focusX,focusY:item.focusY,zoom:3},
      ]};
      expect(inspectCrayonScene(framed)).toEqual([]);
      const errors:string[]=[];
      page.on("pageerror",e=>errors.push(e.message));
      await page.setViewportSize({width:item.width,height:item.height});
      await page.setContent("<!doctype html><html><body style='margin:0;background:#24343a'>"+
        renderToStaticMarkup(createElement(CrayonScene,{spec:framed,frame,hideScreenSpace:true}))+
        "</body></html>");
      const svg=page.locator("svg[data-km-crayon-scene]");
      await expect(svg).toBeVisible();
      await expect(svg).toHaveAttribute("viewBox",
        "0 0 "+item.width+" "+item.height);
      await expect(svg).toHaveAttribute("data-km-crayon-frame",String(frame));
      await expect(svg.locator('[data-km-crayon-element="headline"]')).toHaveCount(0);
      for(const id of ["eye-dark-rim","eye-amber-iris","eye-pupil",
        "eye-bone-light-shelf","eye-upper-lid-overhang","eye-lower-fur-fold",
        "eye-medial-canthus","eyelid-painted-occlusion"]){
        await expect(svg.locator('[data-km-crayon-element="'+id+'"]')).toBeAttached();
      }
      // Full-opacity anatomical parts must retain their opaque substrate.
      await expect(svg.locator(
        '[data-km-crayon-element="eye-upper-lid-overhang"] [data-km-crayon-underpaint="opaque"]'
      )).toHaveCount(1);
      const img=await svg.screenshot({animations:"disabled",type:"png",
        path:info.outputPath("crayon-hare-eye-"+item.aspect+"-"+frame+".png")});
      expect(img.length).toBeGreaterThan(4000);
      expect(errors).toEqual([]);
    });
  }
}
