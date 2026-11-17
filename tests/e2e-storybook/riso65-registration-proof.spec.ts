import {test,expect} from "@playwright/test";

test("RISO65 real Chromium native spot masters stay identical while registration shifts",
  async({page},info)=>{
  const errors:string[]=[];
  page.on("pageerror",e=>errors.push(e.message));
  await page.setViewportSize({width:1470,height:1350});
  await page.goto("/iframe.html?id=video-riso-print-lab--risograph-registration-preflight&viewMode=story");
  const root=page.locator("[data-km-riso65-studio]");
  await expect(root).toBeVisible();
  const nominal=root.locator('[data-km-riso65-panel="nominal"]');
  const drift=root.locator('[data-km-riso65-panel="drift"]');
  await expect(nominal.locator("[data-km-riso62-source-path]")).toHaveCount(20);
  await expect(drift.locator("[data-km-riso62-source-path]")).toHaveCount(20);
  const pathData=async()=>await drift.locator("[data-km-riso62-source-path]")
    .evaluateAll(nodes=>nodes.map(node=>node.getAttribute("d")));
  const initial=await pathData();
  const change=page.getByRole("slider",{name:"RISO65 register x"});
  await change.fill("6");
  await expect(root).toHaveAttribute("data-km-riso65-register-x","6");
  await expect(drift.locator('g[transform="translate(6.000 -3.000)"]')).toHaveCount(1);
  expect(await pathData()).toEqual(initial);
  await expect(root.locator("[data-km-riso65-preflight]"))
    .toHaveAttribute("data-km-riso65-preflight","review");
  await page.getByRole("slider",{name:"RISO65 trap allowance"}).fill("8");
  await expect(root.locator("[data-km-riso65-preflight]"))
    .toHaveAttribute("data-km-riso65-preflight","within");
  for(const aspect of ["landscape","portrait"] as const){
    await page.getByRole("combobox",{name:"RISO65 aspect"}).selectOption(aspect);
    await expect(root).toHaveAttribute("data-km-riso65-aspect",aspect);
    await page.getByRole("checkbox",{name:"RISO65 3x macro"}).check();
    await expect(root).toHaveAttribute("data-km-riso65-zoom","3");
    await root.screenshot({path:info.outputPath("riso65-"+aspect+"-3x-native.png"),
      animations:"disabled"});
    await page.getByRole("checkbox",{name:"RISO65 3x macro"}).uncheck();
    await expect(root).toHaveAttribute("data-km-riso65-zoom","1");
    await root.screenshot({path:info.outputPath("riso65-"+aspect+"-1x-native.png"),
      animations:"disabled"});
    for(const id of ["nominal","drift"]){
      await expect(root.locator('[data-km-riso65-panel="'+id+'"] [data-km-riso-plate]'))
        .toHaveCount(2);
    }
    await page.getByRole("combobox",{name:"RISO65 master"}).selectOption("blue");
    await expect(drift.locator("[data-km-riso-plate]")).toHaveCount(1);
    await page.getByRole("combobox",{name:"RISO65 master"}).selectOption("both");
  }
  await page.getByRole("combobox",{name:"RISO65 aspect"}).selectOption("landscape");
  const frame=page.getByRole("slider",{name:"RISO65 absolute source frame"});
  await frame.fill("40");
  const first=await pathData();
  await frame.fill("200");
  expect(await pathData()).not.toEqual(first);
  await frame.fill("40");
  expect(await pathData()).toEqual(first);
  expect(errors).toEqual([]);
});
