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
  const setRange=async(locator:typeof frame,value:number)=>{
    await locator.evaluate((element,next)=>{
      const input=element as HTMLInputElement;
      const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")?.set;
      if(!setter)throw new Error("missing browser input setter");
      setter.call(input,String(next));
      input.dispatchEvent(new Event("input",{bubbles:true}));
      input.dispatchEvent(new Event("change",{bubbles:true}));
    },value);
  };
  const source=root.locator('[data-km-riso62-source-ink="blue"] [data-km-riso62-source-path]');
  const print=root.locator("svg[data-km-riso-print]");
  await expect(source).toHaveCount(11);
  await expect(root.locator('[data-km-riso62-gesture-class="hero"]')).not.toHaveCount(0);
  await expect(root.locator('[data-km-riso62-gesture-class="filament"]')).not.toHaveCount(0);
  const fibreCount=await root.locator('[data-km-riso62-brush]').first()
    .getAttribute("data-km-riso62-fibres");
  expect(Number(fibreCount)).toBeGreaterThan(50);
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
  await page.getByRole("button",{name:"RISO62 play preview"}).click();
  await expect(root).toHaveAttribute("data-km-riso62-playing","true");
  await page.getByRole("button",{name:"RISO62 pause preview"}).click();
  await expect(root).toHaveAttribute("data-km-riso62-playing","false");
  await setRange(frame,11);
  const early=await source.first().getAttribute("d");
  await setRange(frame,202);
  const late=await source.first().getAttribute("d");
  expect(early).not.toBe(late);
  await setRange(frame,11);
  expect(await source.first().getAttribute("d")).toBe(early);
  await setRange(frame,160);
  const at160=await source.first().getAttribute("d");
  await setRange(dry,0);
  const wet=await source.first().getAttribute("d");
  await expect(root.locator('[data-km-riso62-brush]').first())
    .toHaveAttribute("data-km-riso62-fibres","0");
  expect(wet).not.toBe(at160);
  await setRange(dry,.75);
  const driedCount=Number(await root.locator('[data-km-riso62-brush]').first()
    .getAttribute("data-km-riso62-fibres"));
  expect(driedCount).toBeGreaterThan(50);
  expect(await source.first().getAttribute("d")).not.toBe(wet);
  await expect(root.locator("[data-km-riso62-brush]").first()).toHaveAttribute("data-km-riso62-ink-seed","62");
  await expect(print).toHaveAttribute("data-km-riso-frame","239");
  expect(errors).toEqual([]);
});
