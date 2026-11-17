import {test,expect} from "@playwright/test";

test("RISO66 original facing-edge geometry, native paper holes and A/B print film remain complete",
async({page},info)=>{
  const errors:string[]=[];
  page.on("pageerror",err=>errors.push(err.message));
  await page.setViewportSize({width:1450,height:1320});
  await page.goto("/iframe.html?id=video-riso-print-lab--risograph-contact-edge-trap&viewMode=story");
  const root=page.locator("[data-km-riso66-studio]");
  const before=root.locator('[data-km-riso66-panel="before"]');
  const after=root.locator('[data-km-riso66-panel="after"]');
  await expect(root).toBeVisible();
  await expect(before.locator("[data-km-riso66-primary-source]")).toHaveCount(1);
  await expect(after.locator("[data-km-riso66-primary-source]")).toHaveCount(1);
  const pBefore=before.locator("[data-km-riso66-primary-source]");
  const pAfter=after.locator("[data-km-riso66-primary-source]");
  const original=await pBefore.getAttribute("d");
  const modified=await pAfter.getAttribute("d");
  expect(modified).not.toBe(original);
  expect(Number(await after.getAttribute("data-km-riso66-runs"))).toBeGreaterThan(0);
  const setRange=async(name:string,value:number)=>{
    const range=page.getByRole("slider",{name});
    await range.evaluate((node,next)=>{
      const setter=Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,"value")?.set;
      if(!setter)throw new Error("Native range setter missing");
      setter.call(node,String(next));
      node.dispatchEvent(new Event("input",{bubbles:true}));
      node.dispatchEvent(new Event("change",{bubbles:true}));
    },value);
  };
  const trap=page.getByRole("checkbox",{name:"RISO66 trap enabled"});
  await trap.uncheck();
  await expect(root).toHaveAttribute("data-km-riso66-enabled","false");
  await expect(pAfter).toHaveAttribute("d",original!);
  await trap.check();
  await expect(pAfter).toHaveAttribute("d",modified!);
  for(const aspect of ["landscape","portrait"] as const){
    await page.getByRole("combobox",{name:"RISO66 output aspect"}).selectOption(aspect);
    await expect(root).toHaveAttribute("data-km-riso66-aspect",aspect);
    await page.getByRole("checkbox",{name:"RISO66 3x macro"}).check();
    await expect(root).toHaveAttribute("data-km-riso66-zoom","3");
    await root.screenshot({path:info.outputPath("riso66-"+aspect+"-3x-native.png"),
      animations:"disabled"});
    await page.getByRole("checkbox",{name:"RISO66 3x macro"}).uncheck();
    await expect(root).toHaveAttribute("data-km-riso66-zoom","1");
    await root.screenshot({path:info.outputPath("riso66-"+aspect+"-1x-native.png"),
      animations:"disabled"});
    for(const id of ["before","after"]){
      const panel=root.locator('[data-km-riso66-panel="'+id+'"]');
      await expect(panel.locator("[data-km-riso-plate]")).toHaveCount(2);
      await expect(panel.locator("[data-km-riso62-brush]")).toHaveCount(7);
      await expect(panel.locator("svg")).toHaveAttribute("aria-label",
        /two independent authored risograph stencils/i);
    }
    await page.getByRole("combobox",{name:"RISO66 spot master"}).selectOption("blue");
    await expect(after.locator("[data-km-riso-plate]")).toHaveCount(1);
    await page.getByRole("combobox",{name:"RISO66 spot master"}).selectOption("both");
  }
  await page.getByRole("combobox",{name:"RISO66 output aspect"}).selectOption("landscape");
  await setRange("RISO66 red register x",4);
  await setRange("RISO66 red register y",2);
  await expect(after.locator('g[transform="translate(4.000 2.000)"]')).toHaveCount(1);
  await setRange("RISO66 absolute source frame",39);
  const first=await pAfter.getAttribute("d");
  await setRange("RISO66 absolute source frame",198);
  expect(await pAfter.getAttribute("d")).not.toBe(first);
  await setRange("RISO66 absolute source frame",39);
  expect(await pAfter.getAttribute("d")).toBe(first);
  await setRange("RISO66 maximum trap",0);
  await expect(pBefore).toHaveAttribute("d",await pAfter.getAttribute("d")??"");
  expect(errors).toEqual([]);
});
