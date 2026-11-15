import {expect,test} from "@playwright/test";
import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {CrayonScene} from "../../registry/video/materials/crayon-scene-react";
import {inspectCrayonDrawingPlan} from "../../registry/video/materials/crayon-art-direction";
import {crayonBotanicalDrawing} from "../../src/video/crayon-drawing-system-fixtures";

/** Original code-rendered stills: structural evidence, NOT aesthetic approval. */
for(const item of [
  {aspect:"landscape",width:960,height:540},
  {aspect:"portrait",width:540,height:960},
] as const){
  for(const frame of [40,135,239]){
    test("Crayon native foundation "+item.aspect+" frame "+frame,async({page},info)=>{
      const {scene,plan}=crayonBotanicalDrawing({
        aspect:item.aspect,detail:1,pressure:.88,paperTooth:.78,
      });
      expect(inspectCrayonDrawingPlan(scene,plan)).toEqual([]);
      await page.setViewportSize({width:item.width,height:item.height});
      const html=renderToStaticMarkup(createElement(CrayonScene,{spec:scene,frame}));
      await page.setContent("<!doctype html><html><body style='margin:0;width:"+
        item.width+"px;height:"+item.height+"px;overflow:hidden'>"+html+
        "</body></html>");
      const svg=page.locator("svg[data-km-crayon-scene]");
      await expect(svg).toBeVisible();
      await expect(svg).toHaveAttribute("viewBox",
        "0 0 "+item.width+" "+item.height);
      await expect(svg).toHaveAttribute("data-km-crayon-frame",String(frame));
      const pear=svg.locator('[data-km-crayon-element="pear-body"]');
      const leaf=svg.locator('[data-km-crayon-element="leaf-body"]');
      await expect(pear).toBeAttached();
      await expect(leaf).toBeAttached();
      await expect(svg.locator("[data-km-crayon-lettering]")).toHaveCount(0);
      if(frame===239){
        await expect(pear.locator('[data-km-crayon-underpaint="opaque"]')).toHaveCount(1);
        await expect(svg.locator('[data-km-crayon-element="pear-blush"] [data-km-crayon-clipped-to="pear-body"]')).toHaveCount(1);
        const nodes=await svg.locator("[data-km-crayon-element]").count();
        expect(nodes).toBeGreaterThan(50);
      }
      const screenshot=await svg.screenshot({type:"jpeg",quality:82,
        animations:"disabled",path:info.outputPath(
          "crayon-atelier-"+item.aspect+"-"+frame+".jpg")});
      console.log("CRAYON_GRAMMAR_JPEG:"+item.aspect+":"+frame+":"+
        screenshot.toString("base64"));
    });
  }
}
