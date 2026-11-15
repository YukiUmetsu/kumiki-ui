import {expect,test} from "@playwright/test";
import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {AdultFaceExpressionComparison} from "../../src/video/crayon-artcraft-adult-face.stories";

/** Browser proof for the actual paired native SVG geometry, not a mock thumbnail. */
for(const item of [
  {aspect:"landscape",width:1120,height:840},
  {aspect:"portrait",width:440,height:1000},
] as const){
  test("ArtCraft matched facial comparison layout: "+item.aspect,async({page},info)=>{
    await page.setViewportSize({width:item.width,height:item.height});
    const content=renderToStaticMarkup(createElement(AdultFaceExpressionComparison,{
      aspect:item.aspect,detail:1,expression:"warm",headScaleY:.82,
      startFrame:299,playbackRate:1,loop:false,
    }));
    await page.setContent("<!doctype html><html><body style='margin:0'>"+content+"</body></html>");
    const root=page.locator("[data-km-crayon-artcraft-comparison]");
    const figures=root.locator("figure");
    const scenes=root.locator("svg[data-km-crayon-scene]");
    await expect(figures).toHaveCount(2);
    await expect(scenes).toHaveCount(2);
    await expect(scenes.nth(0)).toHaveAttribute("data-km-crayon-frame","299");
    await expect(scenes.nth(1)).toHaveAttribute("data-km-crayon-frame","299");
    const frames=await figures.evaluateAll(nodes=>nodes.map(node=>{
      const b=node.getBoundingClientRect();
      return {left:b.left,right:b.right,top:b.top,bottom:b.bottom,
        width:b.width,height:b.height};
    }));
    expect(frames.every(b=>b.width>0&&b.height>0)).toBe(true);
    const [a,b]=frames;
    expect(a.right<=b.left || a.bottom<=b.top).toBe(true);
    const rootBox=await root.boundingBox();
    expect(rootBox).not.toBeNull();
    if(!rootBox)throw Error("No comparison layout bounds");
    expect(frames.every(b=>b.left>=rootBox.x-1 &&
      b.right<=rootBox.x+rootBox.width+1)).toBe(true);
    await root.screenshot({path:info.outputPath("artcraft-expressions-"+item.aspect+".png"),
      animations:"disabled"});
  });
}

/** Region-by-region source-native screenshot evidence. Unlike a scaled bitmap,
 * each view is rendered again with the CRAYON1 source camera.
 */
for(const item of [
  {aspect:"landscape",width:1120,height:840},
  {aspect:"portrait",width:440,height:1000},
] as const){
  for(const inspection of ["eyes","nose-mouth","garment"] as const){
    test("ArtCraft native inspection "+item.aspect+"/"+inspection,async({page},info)=>{
      await page.setViewportSize({width:item.width,height:item.height});
      const html=renderToStaticMarkup(createElement(AdultFaceExpressionComparison,{
        aspect:item.aspect,detail:1,expression:"warm",headScaleY:.82,
        startFrame:299,playbackRate:1,loop:false,inspection,
      }));
      await page.setContent("<!doctype html><html><body style='margin:0'>"+html+"</body></html>");
      const root=page.locator("[data-km-crayon-artcraft-comparison]");
      await expect(root).toHaveAttribute("data-km-crayon-artcraft-inspection",inspection);
      const scenes=root.locator("svg[data-km-crayon-scene]");
      await expect(scenes).toHaveCount(2);
      for(const scene of [scenes.nth(0),scenes.nth(1)]){
        await expect(scene).toHaveAttribute("data-km-crayon-frame","299");
        await expect(scene.locator('[data-km-crayon-element="adult-face"]')).toBeAttached();
      }
      const figures=await root.locator("figure").evaluateAll(nodes=>nodes.map(node=>{
        const b=node.getBoundingClientRect();
        return {left:b.left,right:b.right,top:b.top,bottom:b.bottom};
      }));
      expect(figures[0].right<=figures[1].left ||
        figures[0].bottom<=figures[1].top).toBe(true);
      const bounds=await root.boundingBox();
      expect(bounds).not.toBeNull();
      if(!bounds)throw Error("Missing comparison review area");
      expect(figures.every(b=>b.left>=bounds.x-1&&
        b.right<=bounds.x+bounds.width+1)).toBe(true);
      const proof=await root.screenshot({type:"jpeg",quality:77,
        path:info.outputPath("artcraft-"+item.aspect+"-"+inspection+".jpg"),
        animations:"disabled"});
      console.log("ARTCRAFT_INSPECTION_JPEG:"+item.aspect+":"+inspection+":"+
        proof.toString("base64"));
    });
  }
}
