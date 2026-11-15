import {expect,test} from "@playwright/test";
import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {CrayonScene} from "../../registry/video/materials/crayon-scene-react";
import {crayonAdultFaceStudy} from "../../src/video/crayon-artcraft-adult-face-fixtures";

/** Only exact React-native CRAYON1 renders may serve as visual evidence.
 * This workflow produces viewable image files and machine-checks the DOM.
 * Art-director approval is separate and is NOT implied by a green job.
 */
for(const item of [
  {aspect:"landscape",width:960,height:540},
  {aspect:"portrait",width:540,height:960},
] as const){
  test("ArtCraft source-native adult face render: "+item.aspect,async({page},info)=>{
    const spec=crayonAdultFaceStudy(item.aspect);
    const art=renderToStaticMarkup(createElement(CrayonScene,{spec,frame:299}));
    await page.setViewportSize({width:item.width,height:item.height});
    const errors:string[]=[];
    page.on("pageerror",error=>errors.push(error.message));
    await page.setContent("<!doctype html><html><body style='margin:0;padding:0;width:"+
      item.width+"px;height:"+item.height+"px;overflow:hidden'>"+art+"</body></html>");
    const svg=page.locator("svg[data-km-crayon-scene]");
    await expect(svg).toBeVisible();
    await expect(svg).toHaveAttribute("viewBox",
      "0 0 "+item.width+" "+item.height);
    await expect(svg).toHaveAttribute("data-km-crayon-frame","299");
    for(const part of ["adult-face","left-upper-lid","right-upper-lid",
      "nose-alar-wing","lip-upper-volume","hair-back","coat-collar-left"]){
      await expect(svg.locator('[data-km-crayon-element="'+part+'"]')).toBeAttached();
    }
    await expect(svg.locator('[data-km-crayon-element="adult-face"] [data-km-crayon-underpaint="opaque"]')).toHaveCount(1);
    expect(errors).toEqual([]);
    // The proof remains a screenshot of the actual native renderer, never
    // a hand-created approximation or a source reference pasted onto canvas.
    const shot=await svg.screenshot({type:"jpeg",quality:77,
      path:info.outputPath("native-adult-face-"+item.aspect+"-299.jpg"),
      animations:"disabled"});
    // A compact browser-rendered thumbnail can be inspected directly by the
    // QA agent from GitHub job logs without copying third-party source art.
    // The full resolution capture is retained as the workflow artifact.
    console.log("ARTCRAFT_RENDER_JPEG:"+item.aspect+":"+shot.toString("base64"));
    // Semantic, source-framed evidence for ArtCraft eye construction and
    // pigment-blend review; do not infer quality from attached DOM elements.
    const eyeCrop=item.aspect==="landscape"?
      {x:380,y:112,width:198,height:119}:
      {x:119,y:171,width:300,height:158};
    const eyes=await page.screenshot({clip:eyeCrop,type:"jpeg",quality:84,
      path:info.outputPath("artcraft-eyes-"+item.aspect+"-299.jpg"),
      animations:"disabled"});
    console.log("ARTCRAFT_EYE_JPEG:"+item.aspect+":"+eyes.toString("base64"));
    const featureCrop=item.aspect==="landscape"?
      {x:415,y:216,width:132,height:112}:
      {x:167,y:351,width:215,height:234};
    const nasal=await page.screenshot({clip:featureCrop,type:"jpeg",quality:84,
      path:info.outputPath("artcraft-nose-mouth-"+item.aspect+"-299.jpg"),
      animations:"disabled"});
    console.log("ARTCRAFT_NOSE_JPEG:"+item.aspect+":"+nasal.toString("base64"));
  });
}
