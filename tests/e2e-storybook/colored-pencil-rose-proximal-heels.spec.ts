import {test,expect} from "@playwright/test";
import {createHash} from "node:crypto";
const digest=(bytes:Buffer)=>createHash("sha256").update(bytes).digest("hex");
const story="/iframe.html?id=video-colored-pencil-science--drawing-foundation&viewMode=story";

test("two real rounded frontal rose petal heels remain integrated with calyx, front folds and 45 original materials",async({page},info)=>{
  await page.goto(story);
  const studio=page.locator("[data-km-foundation-studio]");
  const svg=page.locator("svg[data-km-colored-pencil]");
  // The SVG itself grows when zoomed; screenshot its clipped parent viewport
  // for a true inspection crop, while full-frame parity remains SVG-native.
  const paper=svg.locator("xpath=..");
  await expect(paper).toHaveCSS("overflow","hidden");
  await page.getByRole("combobox",{name:"Foundation subject"}).selectOption("rose");
  const folds=page.getByRole("checkbox",{name:"Foundation rose physical folds"});
  const calyx=page.getByRole("checkbox",{name:"Foundation rose calyx anatomy"});
  const cup=page.getByRole("checkbox",{name:"Foundation rose hypanthium attachment"});
  const volume=page.getByRole("checkbox",{name:"Foundation rose frontal lamina volume"});
  const heel=page.getByRole("checkbox",{name:"Foundation rose proximal petal heels"});
  await expect(heel).toBeDisabled();
  await folds.check();
  await calyx.check();
  await cup.check();
  await expect(heel).toBeDisabled();
  await volume.check();
  await expect(heel).toBeEnabled();
  await page.getByRole("button",{name:/6\. Burnish and visual audit/}).click();

  const paths=async()=>svg.locator("[data-km-pencil-region]").evaluateAll(nodes=>
    Object.fromEntries(nodes.map(node=>[
      node.getAttribute("data-km-pencil-region"),
      node.querySelector("[data-km-pencil-support]")?.getAttribute("d"),
    ])));
  for(const aspect of ["landscape","portrait"] as const){
    await page.getByRole("combobox",{name:"Foundation aspect"}).selectOption(aspect);
    const beforePaths=await paths();
    const before=await svg.screenshot({animations:"disabled",
      path:info.outputPath("rose-proximal-"+aspect+"-old-front.png")});
    const macro=page.getByRole("checkbox",{name:"Foundation inspect macro"});
    await page.getByRole("combobox",{name:"Foundation inspection focus"}).selectOption("rose-front-left");
    await macro.check();
    await expect(studio).toHaveAttribute("data-km-foundation-inspection-focus","petal-front-left");
    const oldLeft=await paper.screenshot({animations:"disabled",
      path:info.outputPath("rose-proximal-"+aspect+"-old-left-215pct.png")});
    await macro.uncheck();
    await page.getByRole("combobox",{name:"Foundation inspection focus"}).selectOption("rose-front-right");
    await macro.check();
    await expect(studio).toHaveAttribute("data-km-foundation-inspection-focus","petal-front-right");
    const oldRight=await paper.screenshot({animations:"disabled",
      path:info.outputPath("rose-proximal-"+aspect+"-old-right-215pct.png")});
    expect(digest(oldLeft)).not.toBe(digest(oldRight));
    await macro.uncheck();
    await page.getByRole("combobox",{name:"Foundation inspection focus"}).selectOption("default");
    await heel.check();
    await expect(studio).toHaveAttribute("data-km-rose-proximal-heel","opt-in");
    await expect(svg).toHaveAttribute("viewBox",
      aspect==="landscape"?"0 0 960 540":"0 0 540 960");
    await expect(svg.locator("[data-km-pencil-region]")).toHaveCount(21);
    const afterPaths=await paths();
    const changed=Object.keys(afterPaths).filter(id=>
      beforePaths[id]!==afterPaths[id]);
    expect(changed.sort()).toEqual(["petal-front-left","petal-front-right"]);
    expect(afterPaths["calyx-receptacle"]).toBe(beforePaths["calyx-receptacle"]);
    await expect(svg.locator('[data-km-pencil-region="petal-front-left"] [data-km-pencil-details] [data-km-pencil-trace^="rheel-"]')).toHaveCount(3);
    await expect(svg.locator('[data-km-pencil-region="petal-front-right"] [data-km-pencil-details] [data-km-pencil-trace^="rheel-"]')).toHaveCount(3);
    const improved=await svg.screenshot({animations:"disabled",
      path:info.outputPath("rose-proximal-"+aspect+"-rounded-root.png")});
    expect(digest(improved)).not.toBe(digest(before));
    await page.getByRole("combobox",{name:"Foundation inspection focus"}).selectOption("rose-front-left");
    await macro.check();
    await expect(studio).toHaveAttribute("data-km-foundation-inspection-focus","petal-front-left");
    const newLeft=await paper.screenshot({animations:"disabled",
      path:info.outputPath("rose-proximal-"+aspect+"-left-215pct.png")});
    expect(digest(newLeft)).not.toBe(digest(oldLeft));
    await macro.uncheck();
    await page.getByRole("combobox",{name:"Foundation inspection focus"}).selectOption("rose-front-right");
    await macro.check();
    await expect(studio).toHaveAttribute("data-km-foundation-inspection-focus","petal-front-right");
    const newRight=await paper.screenshot({animations:"disabled",
      path:info.outputPath("rose-proximal-"+aspect+"-right-215pct.png")});
    expect(digest(newRight)).not.toBe(digest(oldRight));
    await macro.uncheck();
    await page.getByRole("combobox",{name:"Foundation inspection focus"}).selectOption("default");
    const extras=[
      "Foundation rose outer petal edge relief",
      "Foundation rose outer petal form colour",
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
    await svg.screenshot({animations:"disabled",
      path:info.outputPath("rose-proximal-"+aspect+"-all45-cp-f1.png")});
    for(const label of [...extras].reverse())
      await page.getByRole("checkbox",{name:label}).uncheck();
    await heel.uncheck();
    await expect(studio).toHaveAttribute("data-km-rose-proximal-heel","baseline");
    expect(await paths()).toEqual(beforePaths);
    expect(digest(await svg.screenshot({animations:"disabled",
      path:info.outputPath("rose-proximal-"+aspect+"-restored.png")}))).toBe(digest(before));
  }

  await heel.check();
  await volume.uncheck();
  await expect(heel).not.toBeChecked();
  await expect(heel).toBeDisabled();
  await volume.check();
  await heel.check();
  await cup.uncheck();
  await expect(heel).not.toBeChecked();
  await expect(heel).toBeDisabled();
});

test("independent proximal heel dry fibres are source-local and reversible at all six pencil film stages",async({page})=>{
  await page.goto(story);
  const svg=page.locator("svg[data-km-colored-pencil]");
  await page.getByRole("combobox",{name:"Foundation subject"}).selectOption("rose");
  for(const label of ["Foundation rose physical folds",
    "Foundation rose calyx anatomy","Foundation rose hypanthium attachment",
    "Foundation rose frontal lamina volume","Foundation rose proximal petal heels"])
    await page.getByRole("checkbox",{name:label}).check();
  const traces=svg.locator('[data-km-pencil-region="petal-front-right"] [data-km-pencil-trace^="rheel-"]');
  await expect(traces).toHaveCount(3);
  await page.getByRole("button",{name:/3\. Light value map/}).click();
  await expect(traces.first()).toHaveAttribute("stroke-dasharray","0.00000 1");
  await page.getByRole("button",{name:/6\. Burnish and visual audit/}).click();
  await expect(traces.first()).toHaveAttribute("stroke-dasharray","1.00000 1");
  const final=digest(await svg.screenshot({animations:"disabled"}));
  await page.getByRole("button",{name:/3\. Light value map/}).click();
  await page.getByRole("button",{name:/6\. Burnish and visual audit/}).click();
  expect(digest(await svg.screenshot({animations:"disabled"}))).toEqual(final);
});
