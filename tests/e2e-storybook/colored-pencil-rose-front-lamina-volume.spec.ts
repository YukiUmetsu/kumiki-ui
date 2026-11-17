import {test,expect} from "@playwright/test";
import {createHash} from "node:crypto";
const sha=(b:Buffer)=>createHash("sha256").update(b).digest("hex");
const story="/iframe.html?id=video-colored-pencil-science--drawing-foundation&viewMode=story";
const newFaces=["petal-front-left","petal-front-right"] as const;

test("reversible rounded left/right physical rose laminae in 16:9 and 9:16 with true source macro",async({page},info)=>{
  await page.goto(story);
  const svg=page.locator("svg[data-km-colored-pencil]");
  const studio=page.locator("[data-km-foundation-studio]");
  await page.getByRole("combobox",{name:"Foundation subject"}).selectOption("rose");
  const fold=page.getByRole("checkbox",{name:"Foundation rose physical folds"});
  const volume=page.getByRole("checkbox",{name:"Foundation rose frontal lamina volume"});
  const macro=page.getByRole("checkbox",{name:"Foundation inspect macro"});
  const focus=page.getByRole("combobox",{name:"Foundation inspection focus"});
  await expect(volume).toBeDisabled();
  await fold.check();
  await expect(volume).toBeEnabled();
  await page.getByRole("button",{name:/6\. Burnish and visual audit/}).click();
  for(const aspect of ["landscape","portrait"] as const){
    await page.getByRole("combobox",{name:"Foundation aspect"}).selectOption(aspect);
    const before=await svg.screenshot({animations:"disabled",
      path:info.outputPath("front-belly-"+aspect+"-original-folds.png")});
    await volume.check();
    await expect(studio).toHaveAttribute("data-km-rose-frontal-volume","opt-in");
    await expect(svg.locator("[data-km-pencil-region]")).toHaveCount(16);
    await expect(svg.locator("image,foreignObject,feImage")).toHaveCount(0);
    for(const [id,option] of [
      ["petal-front-left","rose-front-left"],["petal-front-right","rose-front-right"],
    ] as const){
      const parent=svg.locator('[data-km-pencil-region="'+id+'"]');
      await expect(parent.locator("[data-km-pencil-support]")).toHaveCount(1);
      await expect(parent.locator("[data-km-pencil-details] [data-km-pencil-trace^='rbl-']")).toHaveCount(4);
      await expect(parent.locator("[data-km-pigment-layer]")).toHaveCount(3);
      await focus.selectOption(option);
      await macro.check();
      await expect(studio).toHaveAttribute("data-km-foundation-inspection-focus",id);
      await svg.screenshot({animations:"disabled",path:info.outputPath(
        "front-belly-"+aspect+"-"+id+"-215pct.png")});
      await macro.uncheck();
    }
    await focus.selectOption("default");
    const after=await svg.screenshot({animations:"disabled",
      path:info.outputPath("front-belly-"+aspect+"-rounded-native.png")});
    expect(sha(after)).not.toEqual(sha(before));
    for(const name of [
      "Foundation rose frontal local values",
      "Foundation rose physical rim thickness",
      "Foundation rose rear cup relief",
      "Foundation rose nested inner whorl",
      "Foundation rose middle cup",
      "Foundation rose calyx anatomy",
      "Foundation rose pinnate leaves",
    ])await page.getByRole("checkbox",{name}).check();
    await expect(svg.locator("[data-km-pencil-region]")).toHaveCount(44);
    await svg.screenshot({animations:"disabled",
      path:info.outputPath("front-belly-"+aspect+"-complete44-native.png")});
    for(const name of [
      "Foundation rose pinnate leaves",
      "Foundation rose calyx anatomy",
      "Foundation rose middle cup",
      "Foundation rose nested inner whorl",
      "Foundation rose rear cup relief",
      "Foundation rose physical rim thickness",
      "Foundation rose frontal local values",
    ])await page.getByRole("checkbox",{name}).uncheck();
    await volume.uncheck();
    const restored=await svg.screenshot({animations:"disabled",
      path:info.outputPath("front-belly-"+aspect+"-restored-original.png")});
    expect(sha(restored)).toEqual(sha(before));
  }
  await volume.check();
  await page.getByRole("button",{name:/3\. Light value map/}).click();
  for(const id of newFaces)
    await expect(svg.locator('[data-km-pencil-region="'+id+'"] [data-km-pencil-trace^="rbl-"]').first())
      .toHaveAttribute("stroke-dasharray","0.00000 1");
  await fold.uncheck();
  await expect(volume).toBeDisabled();
  await expect(volume).not.toBeChecked();
  await expect(studio).toHaveAttribute("data-km-rose-frontal-volume","baseline");
});

test("full frontal rose volume physically fills the previously corrected medial S-seam without pinholes",async({page})=>{
  await page.goto(story);
  const svg=page.locator("svg[data-km-colored-pencil]");
  await page.getByRole("combobox",{name:"Foundation subject"}).selectOption("rose");
  await page.getByRole("checkbox",{name:"Foundation rose physical folds"}).check();
  await page.getByRole("checkbox",{name:"Foundation rose frontal lamina volume"}).check();
  await page.getByRole("checkbox",{name:"Foundation rose physical rim thickness"}).check();
  await page.getByRole("button",{name:/6\. Burnish and visual audit/}).click();
  const coverage=await svg.evaluate(root=>{
    const petals=["petal-front-left","petal-front-right"].map(id=>
      root.querySelector('[data-km-pencil-region="'+id+'"] [data-km-pencil-support]') as SVGPathElement);
    const seam=[[252,203],[254,207],[256,211],[251,229],[247,251],[242,266]];
    return seam.map(([x,y])=>
      petals.some(path=>path.isPointInFill(new DOMPoint(x,y))));
  });
  expect(coverage).toEqual([true,true,true,true,true,true]);
  await expect(svg.locator('[data-km-pencil-region^="rose-rim-"] [data-km-pencil-support]')).toHaveCount(2);
});
