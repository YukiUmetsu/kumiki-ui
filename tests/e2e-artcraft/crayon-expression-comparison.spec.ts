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
