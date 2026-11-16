import {test,expect} from "@playwright/test";
test("RISO62 two physical dry-brush print masters retain source richness at both 16:9 and 9:16",async({page},info)=>{
  const errors:string[]=[];
  page.on("pageerror",e=>errors.push(e.message));
  await page.setViewportSize({width:1460,height:1170});
  await page.goto("/iframe.html?id=video-riso-print-lab--risograph-dry-brush&viewMode=story");
  const root=page.locator("[data-km-riso62-studio]");
  await expect(root).toBeVisible();
  const aspect=page.getByRole("combobox",{name:"RISO62 output aspect"});
  const plate=page.getByRole("combobox",{name:"RISO62 spot ink"});
  const frame=page.getByRole("slider",{name:"RISO62 absolute frame"});
  const dry=page.getByRole("slider",{name:"RISO62 dryness"});
  const source=root.locator('[data-km-riso62-source-ink="blue"] [data-km-riso62-source-path]');
  const print=root.locator("svg[data-km-riso-print]");
  await expect(source).toHaveCount(11);
  const original=await source.first().getAttribute("d");
  expect(original?.match(/ Q/g)?.length).toBeGreaterThan(100);
  for(const mode of ["landscape","portrait"] as const){
    await aspect.selectOption(mode);
    await expect(root).toHaveAttribute("data-km-riso62-aspect",mode);
    for(const ink of ["both","blue","red"] as const){
      await plate.selectOption(ink);
      await expect(root).toHaveAttribute("data-km-riso62-plate",ink);
      const visible=print.locator("[data-km-riso-plate]");
      await expect(visible).toHaveCount(ink==="both"?2:1);
      await print.screenshot({path:info.outputPath("riso62-"+mode+"-"+ink+"-native.png"),animations:"disabled"});
    }
  }
  await aspect.selectOption("landscape");
  await plate.selectOption("both");
  await frame.fill("11");
  const early=await source.first().getAttribute("d");
  await frame.fill("202");
  const late=await source.first().getAttribute("d");
  expect(early).not.toBe(late);
  await frame.fill("11");
  expect(await source.first().getAttribute("d")).toBe(early);
  await frame.fill("160");
  const at160=await source.first().getAttribute("d");
  await dry.fill("0");
  const wet=await source.first().getAttribute("d");
  expect(wet).not.toBe(at160);
  await dry.fill("0.75");
  await expect(root.locator("[data-km-riso62-brush]").first()).toHaveAttribute("data-km-riso62-ink-seed","62");
  await expect(print).toHaveAttribute("data-km-riso-frame","239");
  expect(errors).toEqual([]);
});
