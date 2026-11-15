import {expect,test} from "@playwright/test";
import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {CrayonScene} from "../../registry/video/materials/crayon-scene-react";
import {inspectCrayonDrawingPlan} from "../../registry/video/materials/crayon-art-direction";
import {crayonBotanicalDrawing} from "../../src/video/crayon-drawing-system-fixtures";
import {crayonDrawingInspectionSpec} from "../../src/video/crayon-drawing-system.stories";

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

/** Native closeups preserve the exact wax marks of the film, not enlarged JPEGs. */
for(const item of [
  {aspect:"landscape",width:960,height:540},
  {aspect:"portrait",width:540,height:960},
] as const){
  for(const inspection of ["surface","stalk-leaf","contact"] as const){
    test("Crayon botanical anatomy closeup "+item.aspect+"/"+inspection,async({page},info)=>{
      const {scene}=crayonBotanicalDrawing({aspect:item.aspect,detail:1,
        pressure:.88,paperTooth:.78});
      const framed=crayonDrawingInspectionSpec(scene,inspection);
      expect(framed.elements).toBe(scene.elements);
      await page.setViewportSize({width:item.width,height:item.height});
      const html=renderToStaticMarkup(createElement(CrayonScene,{spec:framed,frame:239}));
      await page.setContent("<!doctype html><html><body style='margin:0'>"+html+"</body></html>");
      const svg=page.locator("svg[data-km-crayon-scene]");
      await expect(svg).toBeVisible();
      await expect(svg.locator('[data-km-crayon-element="pear-body"]')).toBeAttached();
      const screenshot=await svg.screenshot({type:"jpeg",quality:83,
        animations:"disabled",
        path:info.outputPath("crayon-atelier-"+item.aspect+"-"+inspection+".jpg")});
      console.log("CRAYON_CRAFT_JPEG:"+item.aspect+":"+inspection+":"+
        screenshot.toString("base64"));
    });
  }
}

/** One seed, one authored pear: only dry contact vs tapered material changes. */
for(const item of [{aspect:"landscape",width:960,height:540},
  {aspect:"portrait",width:540,height:960}] as const){
  for(const nibStyle of ["tapered","dry"] as const){
    test("Crayon fractured wax A/B "+item.aspect+"/"+nibStyle,async({page},info)=>{
      const {scene}=crayonBotanicalDrawing({
        aspect:item.aspect,detail:1,pressure:.83,paperTooth:.92,nibStyle,
      });
      const focused=crayonDrawingInspectionSpec(scene,"surface");
      expect(focused.elements).toBe(scene.elements);
      await page.setViewportSize({width:item.width,height:item.height});
      const html=renderToStaticMarkup(createElement(CrayonScene,{spec:focused,frame:239}));
      await page.setContent("<!doctype html><html><body style='margin:0'>"+html+"</body></html>");
      const svg=page.locator("svg[data-km-crayon-scene]");
      await expect(svg).toBeVisible();
      if(nibStyle==="dry")
        await expect(svg.locator('[data-km-crayon-nib="dry"]').first()).toBeAttached();
      else await expect(svg.locator('[data-km-crayon-nib="dry"]')).toHaveCount(0);
      const proof=await svg.screenshot({type:"jpeg",quality:83,
        path:info.outputPath("crayon-dry-contact-"+item.aspect+"-"+nibStyle+".jpg")});
      console.log("CRAYON_DRY_AB_JPEG:"+item.aspect+":"+nibStyle+":"+proof.toString("base64"));
    });
  }
}

/** Color-grain A/B uses the identical authored marks, camera, seed and frame. */
for(const item of [{aspect:"landscape",width:960,height:540},
  {aspect:"portrait",width:540,height:960}] as const){
  test("Crayon page-relief undercoat A/B "+item.aspect,async({page},info)=>{
    const shots:Uint8Array[]=[];
    for(const strength of [0,.9] as const){
      const {scene}=crayonBotanicalDrawing({
        aspect:item.aspect,detail:1,pressure:.83,paperTooth:.9,
        nibStyle:"dry",underpaintTooth:strength,
      });
      const focused=crayonDrawingInspectionSpec(scene,"surface");
      await page.setViewportSize({width:item.width,height:item.height});
      const html=renderToStaticMarkup(createElement(CrayonScene,{spec:focused,frame:239}));
      await page.setContent("<!doctype html><html><body style='margin:0'>"+html+"</body></html>");
      const svg=page.locator("svg[data-km-crayon-scene]");
      await expect(svg).toBeVisible();
      await expect(svg.locator('[data-km-crayon-underpaint="opaque"]').first()).toBeAttached();
      if(strength>0)
        await expect(svg.locator('[data-km-crayon-underpaint-grain=""]').first()).toBeAttached();
      else await expect(svg.locator('[data-km-crayon-underpaint-grain=""]')).toHaveCount(0);
      const img=await svg.screenshot({type:"png",animations:"disabled",
        path:info.outputPath("crayon-relief-"+item.aspect+"-"+strength+".png")});
      shots.push(img);
      console.log("CRAYON_UNDERCOAT_PNG:"+item.aspect+":"+strength+":"+img.toString("base64"));
    }
    // A true visible material change, not just different SVG markup.
    expect(Buffer.compare(shots[0],shots[1])).not.toBe(0);
  });
}
