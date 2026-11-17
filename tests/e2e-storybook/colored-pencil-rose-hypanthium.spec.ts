import {test,expect} from "@playwright/test";
import {createHash} from "node:crypto";
const digest=(bytes:Buffer)=>createHash("sha256").update(bytes).digest("hex");
const story="/iframe.html?id=video-colored-pencil-science--drawing-foundation&viewMode=story";

test("real rose hypanthium rises into two front petals without changing the five sepals, both aspect films and source macro",async({page},info)=>{
  await page.goto(story);
  const studio=page.locator("[data-km-foundation-studio]");
  const svg=page.locator("svg[data-km-colored-pencil]");
  await page.getByRole("combobox",{name:"Foundation subject"}).selectOption("rose");
  const folded=page.getByRole("checkbox",{name:"Foundation rose physical folds"});
  const calyx=page.getByRole("checkbox",{name:"Foundation rose calyx anatomy"});
  const attached=page.getByRole("checkbox",{name:"Foundation rose hypanthium attachment"});
  const focus=page.getByRole("combobox",{name:"Foundation inspection focus"});
  const macro=page.getByRole("checkbox",{name:"Foundation inspect macro"});
  await expect(attached).toBeDisabled();
  await folded.check();
  await expect(attached).toBeDisabled();
  await calyx.check();
  await expect(attached).toBeEnabled();
  await page.getByRole("button",{name:/6\. Burnish and visual audit/}).click();

  for(const aspect of ["landscape","portrait"] as const){
    await page.getByRole("combobox",{name:"Foundation aspect"}).selectOption(aspect);
    const receptor=svg.locator('[data-km-pencil-region="calyx-receptacle"] [data-km-pencil-support]');
    const beforePath=await receptor.getAttribute("d");
    const before=await svg.screenshot({animations:"disabled",
      path:info.outputPath("rose-hypanthium-"+aspect+"-old-calyx-and-real-fold.png")});
    await attached.check();
    await expect(studio).toHaveAttribute("data-km-rose-hypanthium-attachment","opt-in");
    await expect(svg).toHaveAttribute("viewBox",
      aspect==="landscape"?"0 0 960 540":"0 0 540 960");
    await expect(svg.locator("[data-km-pencil-region]")).toHaveCount(21);
    await expect(svg.locator("image,foreignObject,feImage")).toHaveCount(0);
    expect(await receptor.getAttribute("d")).not.toEqual(beforePath);
    const details=svg.locator(
      '[data-km-pencil-region="calyx-receptacle"] [data-km-pencil-details] [data-km-pencil-trace^="rhyp-"]');
    await expect(details).toHaveCount(5);

    const anatomy=await svg.evaluate(root=>{
      const p=(id:string)=>root.querySelector(
        '[data-km-pencil-region="'+id+'"] [data-km-pencil-support]') as SVGPathElement;
      const cup=p("calyx-receptacle");
      const stem=p("stem");
      const point=(x:number,y:number)=>new DOMPoint(x,y);
      // Source-space coordinates, not distorted CSS/page pixels.
      const rising:[[number,number],[number,number],[number,number]]=[
        [239,280],[248,282],[260,278]];
      const shoulder=rising.map(([x,y])=>cup.isPointInFill(point(x,y)));
      const stalkAtBase=cup.isPointInFill(point(245,316))&&
        stem.isPointInFill(point(245,316));
      const sepalIds=["calyx-sepal-far-left","calyx-sepal-far-right",
        "calyx-sepal-near-left","calyx-sepal-near-right","calyx-sepal-axial"];
      const rooted=sepalIds.filter(id=>cup.isPointInFill(p(id).getPointAtLength(0))).length;
      return {shoulder,stalkAtBase,rooted};
    });
    expect(anatomy.shoulder).toEqual([true,true,true]);
    expect(anatomy.stalkAtBase).toBe(true);
    expect(anatomy.rooted).toBe(5);

    const improved=await svg.screenshot({animations:"disabled",
      path:info.outputPath("rose-hypanthium-"+aspect+"-true-joined-calyx.png")});
    expect(digest(improved)).not.toEqual(digest(before));
    await focus.selectOption("rose-calyx");
    await expect(studio).toHaveAttribute("data-km-foundation-inspection-focus","calyx-receptacle");
    await macro.check();
    await svg.screenshot({animations:"disabled",
      path:info.outputPath("rose-hypanthium-"+aspect+"-junction-source-215pct.png")});
    await macro.uncheck();
    await focus.selectOption("default");

    const extras=[
      "Foundation rose outer petal edge relief",
      "Foundation rose outer petal form colour",
      "Foundation rose frontal lamina volume",
      "Foundation rose frontal local values",
      "Foundation rose physical rim thickness",
      "Foundation rose rear cup relief",
      "Foundation rose nested inner whorl",
      "Foundation rose center knot anatomy",
      "Foundation rose central diffuse values",
      "Foundation rose interpetal contact shadows",
      "Foundation rose middle cup",
      "Foundation rose pinnate leaves",
    ];
    for(const label of extras)
      await page.getByRole("checkbox",{name:label}).check();
    await expect(svg.locator("[data-km-pencil-region]")).toHaveCount(45);
    await expect(svg.locator('[data-km-pencil-region="calyx-receptacle"] [data-km-pencil-support]')).toHaveCount(1);
    await svg.screenshot({animations:"disabled",
      path:info.outputPath("rose-hypanthium-"+aspect+"-all45-native-pigment.png")});
    for(const label of [...extras].reverse())
      await page.getByRole("checkbox",{name:label}).uncheck();
    await attached.uncheck();
    await expect(studio).toHaveAttribute("data-km-rose-hypanthium-attachment","baseline");
    expect(await receptor.getAttribute("d")).toBe(beforePath);
    const restored=await svg.screenshot({animations:"disabled",
      path:info.outputPath("rose-hypanthium-"+aspect+"-source-restored.png")});
    expect(digest(restored)).toBe(digest(before));
  }
  await attached.check();
  await calyx.uncheck();
  await expect(attached).not.toBeChecked();
  await expect(attached).toBeDisabled();
  await calyx.check();
  await attached.check();
  await folded.uncheck();
  await expect(attached).not.toBeChecked();
  await expect(attached).toBeDisabled();
  await expect(svg.locator("[data-km-pencil-region]")).toHaveCount(16);
});

test("hypanthium cuticle microfibres obey all six native pencil film stages and reversible absolute-time scrubs",async({page})=>{
  await page.goto(story);
  const svg=page.locator("svg[data-km-colored-pencil]");
  await page.getByRole("combobox",{name:"Foundation subject"}).selectOption("rose");
  await page.getByRole("checkbox",{name:"Foundation rose physical folds"}).check();
  await page.getByRole("checkbox",{name:"Foundation rose calyx anatomy"}).check();
  await page.getByRole("checkbox",{name:"Foundation rose hypanthium attachment"}).check();
  const details=svg.locator(
    '[data-km-pencil-region="calyx-receptacle"] [data-km-pencil-details] [data-km-pencil-trace^="rhyp-"]');
  await expect(details).toHaveCount(5);
  await page.getByRole("button",{name:/3\. Light value map/}).click();
  await expect(details.first()).toHaveAttribute("stroke-dasharray","0.00000 1");
  await page.getByRole("button",{name:/6\. Burnish and visual audit/}).click();
  await expect(details.first()).toHaveAttribute("stroke-dasharray","1.00000 1");
  const final=digest(await svg.screenshot({animations:"disabled"}));
  await page.getByRole("button",{name:/3\. Light value map/}).click();
  await page.getByRole("button",{name:/6\. Burnish and visual audit/}).click();
  expect(digest(await svg.screenshot({animations:"disabled"}))).toEqual(final);
});
