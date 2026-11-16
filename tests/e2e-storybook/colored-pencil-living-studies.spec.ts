import { test, expect } from "@playwright/test";

test("ArtCraft new head, fox anatomy and alpine landscape preserve final frames and macros", async({page},info)=>{
  await page.goto("/iframe.html?id=video-colored-pencil-science--living-subjects-atelier&viewMode=story");
  const svg=page.locator("svg[data-km-colored-pencil]");
  const subject=page.getByRole("combobox",{name:"Living subject"});
  const aspect=page.getByRole("combobox",{name:"Living aspect"});
  const slider=page.getByRole("slider",{name:"Living drawing frame"});
  const inspect=page.getByRole("checkbox",{name:"Living inspect macro"});
  await expect(svg).toBeVisible();
  const seek=async(frame:number)=>{
    await slider.evaluate((node,next)=>{
      const input=node as HTMLInputElement;
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")?.set?.call(input,String(next));
      input.dispatchEvent(new Event("input",{bubbles:true}));
      input.dispatchEvent(new Event("change",{bubbles:true}));
    },frame);
    await expect(svg).toHaveAttribute("data-km-pencil-frame",String(frame));
  };
  for(const output of ["landscape","portrait"] as const){
    await aspect.selectOption(output);
    await expect(svg).toHaveAttribute("viewBox",output==="landscape"?
      "0 0 960 540":"0 0 540 960");
    for(const item of ["portrait","fox","valley"] as const){
      await subject.selectOption(item);
      await expect(page.locator("[data-km-living-subject]"))
        .toHaveAttribute("data-km-living-subject",item);
      await seek(330);
      await expect(svg).toHaveAttribute("data-km-pencil-foundation","CP-F1");
      await expect(page.getByRole("combobox",{name:"Living craft rendering"})).toHaveCount(0);
      if(output==="portrait"&&item!=="valley")
        await expect(svg.locator(item==="portrait"?
          '[data-km-pencil-region="head-silhouette-01"]':
          '[data-km-pencil-region="head-main"]'))
          .toHaveAttribute("transform",/scale\(1\.38\)/);
      await expect(svg.locator("[data-km-pencil-region]")).not.toHaveCount(0);
      await svg.screenshot({animations:"disabled",
        path:info.outputPath("artcraft-living-"+item+"-"+output+".png")});
      await inspect.check();
      await expect(svg).toHaveAttribute("style",/scale\(/);
      await svg.locator("xpath=..").screenshot({animations:"disabled",
        path:info.outputPath("artcraft-living-"+item+"-macro-"+output+".png")});
      await inspect.uncheck();
      await seek(45);
      await seek(330);
      await expect(svg).toHaveAttribute("data-km-pencil-frame","330");
    }
  }
  await subject.selectOption("portrait");
  await seek(330);
  // A freshly authored, transparent head replaces the retired woman's skin.
  await expect(svg.locator('[data-km-pencil-region="head-silhouette-01"]')).toHaveCount(1);
  await expect(svg.locator('[data-km-pencil-support="head-silhouette-01"]')).toHaveCount(0);
  await expect(svg.locator('[data-km-pencil-support="face-main"]')).toHaveCount(0);
  await expect(svg.locator('[data-km-pencil-trace="newhead-sagittal-guide"]')).toHaveCount(1);
  await page.getByRole("checkbox",{name:"Living reduced motion"}).check();
  await seek(0);
  await expect(svg.locator('[data-km-pencil-region="head-silhouette-01"]')).toHaveCount(1);
  await expect(svg.locator('[data-km-pencil-support="face-main"]')).toHaveCount(0);
});


test("new human head has no fictitious facial-detail controls; fox keeps its macro checkpoints",async({page},info)=>{
  await page.goto("/iframe.html?id=video-colored-pencil-science--living-subjects-atelier&viewMode=story");
  const drawing=page.locator("svg[data-km-colored-pencil]");
  const subject=page.getByRole("combobox",{name:"Living subject"});
  const part=page.getByRole("combobox",{name:"Living facial detail"});
  await subject.selectOption("portrait");
  await expect(part).toHaveCount(0);
  await expect(drawing.locator('[data-km-pencil-region="head-silhouette-01"]')).toHaveCount(1);
  await page.getByRole("checkbox",{name:"Living inspect macro"}).check();
  await expect(drawing).toHaveAttribute("style",/scale\(2\.4\)/);
  await drawing.locator("xpath=..").screenshot({animations:"disabled",
    path:info.outputPath("artcraft-newhead-construction-only.png")});
  await page.getByRole("checkbox",{name:"Living inspect macro"}).uncheck();
  await subject.selectOption("fox");
  await expect(part).toBeVisible();
  await page.getByRole("checkbox",{name:"Living inspect macro"}).check();
  const appearances:string[]=[];
  for(const area of ["eyes","nose","mouth"] as const){
    await part.selectOption(area);
    appearances.push((await drawing.getAttribute("style"))??"");
    await drawing.locator("xpath=..").screenshot({animations:"disabled",
      path:info.outputPath("artcraft-fox-"+area+".png")});
  }
  expect(new Set(appearances).size).toBe(3);
  await subject.selectOption("valley");
  await expect(part).toHaveCount(0);
});

test("the new-head-only story has no retired woman's diagnostic coordinates",async({page},info)=>{
  await page.goto("/iframe.html?id=video-colored-pencil-science--living-subjects-atelier&viewMode=story");
  const subject=page.getByRole("combobox",{name:"Living subject"});
  await subject.selectOption("portrait");
  const warning=page.locator('[data-km-portrait-quality="head-outline-unapproved"]');
  await expect(warning).toBeVisible();
  await expect(warning).toContainText("Stage 1, unapproved head outline");
  const draw=page.locator("svg[data-km-colored-pencil]");
  await expect(draw).toHaveAttribute("data-km-pencil-foundation","CP-F1");
  await page.getByRole("checkbox",{name:"Living show output landmarks"}).check();
  const anchors=draw.locator('[data-km-portrait-output-landmarks]');
  await expect(anchors).toHaveCount(1);
  await expect(anchors.locator("circle")).toHaveCount(9);
  await expect(page.locator('[data-km-portrait-landmark-index] li')).toHaveCount(9);
  await expect(page.locator('[data-km-portrait-landmark-index]')).not.toContainText("hairline");
  const title=draw.getByText("HEAD STUDY · 01",{exact:true});
  await expect(title).toBeVisible();
  const right=await title.evaluate(el=>{
    const rect=(el as SVGGraphicsElement).getBBox();
    return rect.x+rect.width;
  });
  expect(right).toBeLessThan(445); // Landscape text must not touch right-hand head.
  await draw.screenshot({animations:"disabled",
    path:info.outputPath("artcraft-v7-human-unapproved-anatomical-anchors.png")});
  await page.getByRole("checkbox",{name:"Living show output landmarks"}).uncheck();
  await expect(anchors).toHaveCount(0);
  await subject.selectOption("fox");
  await expect(warning).toHaveCount(0);
});
