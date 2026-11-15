import { test,expect } from "@playwright/test";

test("the single Colour-pencil foundation story uses the same pipeline for all subjects",async({page},info)=>{
  await page.goto("/iframe.html?id=video-colored-pencil-science--drawing-foundation&viewMode=story");
  const scene=page.locator("[data-km-foundation-studio]");
  const svg=page.locator("svg[data-km-colored-pencil]");
  const subject=page.getByRole("combobox",{name:"Foundation subject"});
  const aspect=page.getByRole("combobox",{name:"Foundation aspect"});
  await expect(scene).toBeVisible();
  await expect(svg).toHaveAttribute("data-km-pencil-foundation","CP-F1");
  await expect(svg).toHaveAttribute(
    "data-km-pencil-render-method","authored-vector-pigment");
  await expect(svg).toHaveAttribute("data-km-pencil-photo-pixels","none");
  await expect(scene).toHaveAttribute("data-km-foundation-stage","review");
  await expect(svg.locator("[data-km-pencil-craft-base]").first()).toBeVisible();
  for(const format of ["landscape","portrait"] as const){
    await aspect.selectOption(format);
    await expect(svg).toHaveAttribute("viewBox",format==="landscape"?"0 0 960 540":"0 0 540 960");
    for(const item of ["rose","fox","portrait","architecture","fabric","valley"] as const){
      await subject.selectOption(item);
      await expect(svg).toHaveAttribute("data-km-pencil-foundation","CP-F1");
      await expect(svg.locator("[data-km-pencil-region]").first()).toBeVisible();
      // A CP-F1 vector drawing is not photograph stylization: no SVG
      // bitmap/foreignObject reference, no uploaded source/canvas image,
      // and full details remain named editable pencil strokes.
      const provenance=await svg.evaluate(node=>({
        photoElements:node.querySelectorAll(
          "image,foreignObject,feImage").length,
        pencilMarks:node.querySelectorAll(
          "[data-km-pigment-layer] path").length,
        tracedGeometry:node.querySelectorAll(
          "[data-km-graphite] path").length,
      }));
      expect(provenance.photoElements).toBe(0);
      expect(provenance.pencilMarks).toBeGreaterThan(100);
      expect(provenance.tracedGeometry).toBeGreaterThan(10);
      if(item==="fox"){
        for(const region of ["periocular-form","mask","eye-far","eye-near"])
          await expect(svg.locator(
            '[data-km-pencil-region="'+region+'"]')).toHaveCount(1);
      }
      if(["rose","fox","portrait"].includes(item)){
        await svg.screenshot({animations:"disabled",
          path:info.outputPath("pencil-foundation-"+item+"-"+format+".png")});
      }
    }
  }
  // Precise stage checkpoints must correspond to actual addressable drawing frames.
  await aspect.selectOption("landscape");
  await subject.selectOption("rose");
  for(const [name,frame,stage] of [
    ["1. Reference & structure",0,"observe"],
    ["2. Contour and silhouette",52,"outline"],
    ["3. Light value map",106,"undertone"],
    ["4. Cross-layer colour",168,"layer"],
    ["5. Rooted texture & edges",254,"detail"],
    ["6. Burnish and visual audit",335,"review"],
  ] as const){
    await page.getByRole("button",{name:new RegExp(name.replace(".","\\.") )}).click();
    await expect(svg).toHaveAttribute("data-km-pencil-frame",String(frame));
    await expect(scene).toHaveAttribute("data-km-foundation-stage",stage);
  }
  await page.getByRole("checkbox",{name:"Foundation inspect macro"}).check();
  await expect(svg).toHaveAttribute("style",/scale\(2.15\)/);
  await page.getByRole("checkbox",{name:"Foundation inspect macro"}).uncheck();
  const burnish=page.getByRole("slider",{name:"Foundation burnish"});
  await burnish.focus();await burnish.press("ArrowLeft");
  const tooth=page.getByRole("slider",{name:"Foundation paper tooth"});
  await tooth.focus();await tooth.press("ArrowLeft");
  await expect(svg).toHaveAttribute("data-km-pencil-foundation","CP-F1");
});
