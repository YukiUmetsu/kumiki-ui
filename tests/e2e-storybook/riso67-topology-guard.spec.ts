import {test,expect} from "@playwright/test";

test("RISO67 real native stencil safety under source seek, 1x/3x and rejected crossing",
async({page},info)=>{
  const errors:string[]=[];
  page.on("pageerror",e=>errors.push(e.message));
  await page.setViewportSize({width:1440,height:1390});
  await page.goto("/iframe.html?id=video-riso-print-lab--risograph-topology-safety&viewMode=story");
  const root=page.locator("[data-km-riso67-studio]");
  const before=root.locator('[data-km-riso66-panel="before"]');
  const after=root.locator('[data-km-riso66-panel="after"]');
  await expect(root).toBeVisible();
  await expect(after.locator("[data-km-riso66-primary-source]")).toHaveCount(1);
  await expect(after.locator("[data-km-riso62-brush]")).toHaveCount(7);
  const range=async(name:string,value:number)=>{
    await page.getByRole("slider",{name}).evaluate((node,next)=>{
      const setter=Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,"value")?.set;
      if(!setter)throw Error("Native range setter unavailable");
      setter.call(node,String(next));
      node.dispatchEvent(new Event("input",{bubbles:true}));
      node.dispatchEvent(new Event("change",{bubbles:true}));
    },value);
  };
  for(const ratio of ["landscape","portrait"] as const){
    await page.getByRole("combobox",{name:"RISO67 sheet ratio"}).selectOption(ratio);
    await expect(root).toHaveAttribute("data-km-riso67-aspect",ratio);
    for(const magnification of [3,1] as const){
      const cb=page.getByRole("checkbox",{name:"RISO67 3x source macro"});
      if(magnification===3)await cb.check();else await cb.uncheck();
      await expect(root).toHaveAttribute("data-km-riso67-zoom",String(magnification));
      await expect(before.locator("[data-km-riso-plate]")).toHaveCount(2);
      await expect(after.locator("[data-km-riso-plate]")).toHaveCount(2);
      await root.screenshot({path:info.outputPath(
        "riso67-"+ratio+"-"+magnification+"x-native.png"),animations:"disabled"});
    }
    await page.getByRole("combobox",{name:"RISO67 visible ink master"})
      .selectOption("blue");
    await expect(after.locator("[data-km-riso-plate]")).toHaveCount(1);
    await page.getByRole("combobox",{name:"RISO67 visible ink master"})
      .selectOption("both");
  }
  await page.getByRole("combobox",{name:"RISO67 sheet ratio"})
    .selectOption("landscape");
  await range("RISO67 absolute source frame",24);
  const first=await after.locator("[data-km-riso66-primary-source]").getAttribute("d");
  await range("RISO67 absolute source frame",202);
  expect(await after.locator("[data-km-riso66-primary-source]").getAttribute("d"))
    .not.toBe(first);
  await range("RISO67 absolute source frame",24);
  expect(await after.locator("[data-km-riso66-primary-source]").getAttribute("d"))
    .toBe(first);
  await page.getByRole("checkbox",{name:"RISO67 trap enabled"}).uncheck();
  await expect(after.locator("[data-km-riso66-primary-source]")).toHaveAttribute("d",
    await before.locator("[data-km-riso66-primary-source]").getAttribute("d")??"");
  await page.getByRole("checkbox",{name:"RISO67 trap enabled"}).check();
  await page.getByRole("checkbox",{name:"RISO67 deliberate defect challenge"}).check();
  await expect(root).toHaveAttribute("data-km-riso67-stress","true");
  await expect(root).toHaveAttribute("data-km-riso67-audit","blocked");
  expect(Number(await root.locator("[data-km-riso67-new-self]").getAttribute(
    "data-km-riso67-new-self"))).toBeGreaterThan(0);
  // Dangerous distorted path is only an inspector candidate — never printed.
  await expect(after.locator("[data-km-riso66-primary-source]")).toHaveCount(1);
  await expect(root.locator("svg")).toHaveCount(2);
  await page.getByRole("checkbox",{name:"RISO67 deliberate defect challenge"}).uncheck();
  await expect(root).toHaveAttribute("data-km-riso67-stress","false");
  expect(errors).toEqual([]);
});
