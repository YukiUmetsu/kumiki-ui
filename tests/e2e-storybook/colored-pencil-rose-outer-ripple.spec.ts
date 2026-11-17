import {test,expect} from "@playwright/test";
import {createHash} from "node:crypto";
const digest=(bytes:Buffer)=>createHash("sha256").update(bytes).digest("hex");
const story="/iframe.html?id=video-colored-pencil-science--drawing-foundation&viewMode=story";

test("two original rose outer petal edges A/B in both movie aspects, macro source and complete physical45 coexistence",async({page},info)=>{
  await page.goto(story);
  const svg=page.locator("svg[data-km-colored-pencil]");
  const studio=page.locator("[data-km-foundation-studio]");
  await page.getByRole("combobox",{name:"Foundation subject"}).selectOption("rose");
  const folds=page.getByRole("checkbox",{name:"Foundation rose physical folds"});
  const margins=page.getByRole("checkbox",{name:"Foundation rose outer petal edge relief"});
  const form=page.getByRole("checkbox",{name:"Foundation rose outer petal form colour"});
  const focus=page.getByRole("combobox",{name:"Foundation inspection focus"});
  const macro=page.getByRole("checkbox",{name:"Foundation inspect macro"});
  await expect(margins).toBeDisabled();
  await folds.check();
  await expect(margins).toBeEnabled();
  await page.getByRole("button",{name:/6\. Burnish and visual audit/}).click();
  for(const aspect of ["landscape","portrait"] as const){
    await page.getByRole("combobox",{name:"Foundation aspect"}).selectOption(aspect);
    const original=await svg.screenshot({animations:"disabled",
      path:info.outputPath("rose-outer-ripple-"+aspect+"-original-real-folds.png")});
    const originalPaths=await svg.evaluate(root=>{
      const ids=["outer-left","outer-right","rose-turn-outer-left","rose-turn-outer-right"];
      const p:Record<string,string|null>={};
      for(const id of ids)p[id]=root.querySelector(
        '[data-km-pencil-region="'+id+'"] path[data-km-pencil-support]')?.getAttribute("d")??null;
      return p;
    });
    await margins.check();
    await expect(studio).toHaveAttribute("data-km-rose-outer-ripple","opt-in");
    await expect(svg.locator("[data-km-pencil-region]")).toHaveCount(16);
    await expect(svg.locator("image,foreignObject,feImage")).toHaveCount(0);
    await expect(svg).toHaveAttribute("viewBox",
      aspect==="landscape"?"0 0 960 540":"0 0 540 960");
    for(const [side,inspector] of [
      ["outer-left","rose-outer-left"],["outer-right","rose-outer-right"],
    ] as const){
      const face=svg.locator('[data-km-pencil-region="'+side+'"]');
      const support=face.locator("path[data-km-pencil-support]");
      await expect(support).toHaveCount(1);
      expect(await support.getAttribute("d")).not.toBe(originalPaths[side]);
      await expect(face.locator("[data-km-pigment-layer]")).toHaveCount(3);
      await expect(face.locator('[data-km-pencil-details] [data-km-pencil-trace^="ripple-"]')).toHaveCount(5);
      // No changed physical underside: the new opaque face continues
      // to meet the original reverse along the exact upper cubic seam.
      const reverse="rose-turn-"+side;
      await expect(svg.locator('[data-km-pencil-region="'+reverse+'"] path[data-km-pencil-support]'))
        .toHaveAttribute("d",originalPaths[reverse]!);
      await focus.selectOption(inspector);
      await macro.check();
      await expect(studio).toHaveAttribute("data-km-foundation-inspection-focus",side);
      await svg.screenshot({animations:"disabled",
        path:info.outputPath("rose-outer-ripple-"+aspect+"-"+side+"-215pct.png")});
      await macro.uncheck();
    }
    await focus.selectOption("default");
    const rippled=await svg.screenshot({animations:"disabled",
      path:info.outputPath("rose-outer-ripple-"+aspect+"-asymmetric-laminae.png")});
    expect(digest(rippled)).not.toBe(digest(original));
    const study=[
      "Foundation rose outer petal form colour",
      "Foundation rose frontal lamina volume",
      "Foundation rose frontal local values",
      "Foundation rose physical rim thickness",
      "Foundation rose rear cup relief",
      "Foundation rose nested inner whorl",
      "Foundation rose center knot anatomy",
      "Foundation rose central diffuse values",
      "Foundation rose middle cup",
      "Foundation rose calyx anatomy",
      "Foundation rose pinnate leaves",
    ];
    for(const checkbox of study)
      await page.getByRole("checkbox",{name:checkbox}).check();
    await expect(svg.locator("[data-km-pencil-region]")).toHaveCount(45);
    await expect(svg.locator("[data-km-pencil-interior-details]")).toHaveCount(10);
    for(const id of ["outer-left","outer-right"])
      await expect(svg.locator('[data-km-pencil-region="'+id+'"] [data-km-pencil-interior-details] path')).toHaveCount(9);
    await svg.screenshot({animations:"disabled",
      path:info.outputPath("rose-outer-ripple-"+aspect+"-full45-with-tonal-planes.png")});
    for(const checkbox of [...study].reverse())
      await page.getByRole("checkbox",{name:checkbox}).uncheck();
    await margins.uncheck();
    await expect(studio).toHaveAttribute("data-km-rose-outer-ripple","baseline");
    const restored=await svg.screenshot({animations:"disabled",
      path:info.outputPath("rose-outer-ripple-"+aspect+"-original-restored.png")});
    expect(digest(restored)).toBe(digest(original));
  }
  await margins.check();
  await folds.uncheck();
  await expect(margins).not.toBeChecked();
  await expect(margins).toBeDisabled();
  await expect(svg.locator("[data-km-pencil-region]")).toHaveCount(11);
  await expect(studio).toHaveAttribute("data-km-rose-outer-ripple","baseline");
});

test("softly scalloped distal rim is source-fill, paper locked and its five dry marks obey absolute six-stage clock",async({page})=>{
  await page.goto(story);
  const svg=page.locator("svg[data-km-colored-pencil]");
  await page.getByRole("combobox",{name:"Foundation subject"}).selectOption("rose");
  await page.getByRole("checkbox",{name:"Foundation rose physical folds"}).check();
  await page.getByRole("checkbox",{name:"Foundation rose outer petal edge relief"}).check();
  const edges=svg.locator('[data-km-pencil-region="outer-left"] [data-km-pencil-details] [data-km-pencil-trace^="ripple-"]');
  await expect(edges).toHaveCount(5);
  await page.getByRole("button",{name:/3\. Light value map/}).click();
  await expect(edges.first()).toHaveAttribute("stroke-dasharray","0.00000 1");
  await page.getByRole("button",{name:/6\. Burnish and visual audit/"}).click();
  await expect(edges.first()).toHaveAttribute("stroke-dasharray","1.00000 1");
  const areas=await svg.evaluate(root=>{
    const ids=["outer-left","outer-right"];
    return ids.map(id=>{
      const p=root.querySelector('[data-km-pencil-region="'+id+'"] [data-km-pencil-support]') as SVGPathElement;
      const r=p.getBBox();
      // Real filled pigment support: nonzero physical face, not a thin
      // contour trick or after-the-fact decorative outline.
      return {width:r.width,height:r.height,area:r.width*r.height};
    });
  });
  for(const a of areas){
    expect(a.width).toBeGreaterThan(120);
    expect(a.height).toBeGreaterThan(130);
    expect(a.area).toBeGreaterThan(17500);
  }
  const hash=digest(await svg.screenshot({animations:"disabled"}));
  await page.getByRole("button",{name:/3\. Light value map/"}).click();
  await page.getByRole("button",{name:/6\. Burnish and visual audit/"}).click();
  expect(digest(await svg.screenshot({animations:"disabled"}))).toBe(hash);
});
