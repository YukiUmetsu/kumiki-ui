import {test,expect} from "@playwright/test";

test("RISO63 real FilmStage captures all ink masters at native 16:9 and 9:16",async({page},info)=>{
  const errors:string[]=[];
  page.on("pageerror",e=>errors.push(e.message));
  await page.setViewportSize({width:1480,height:1250});
  await page.goto("/iframe.html?id=video-riso-print-lab--risograph-dry-brush-film&viewMode=story");
  const root=page.locator("[data-km-riso63-film-studio]");
  await expect(root).toBeVisible();
  const aspect=page.getByRole("combobox",{name:"RISO63 output aspect"});
  const master=page.getByRole("combobox",{name:"RISO63 preview plate"});
  const frame=page.getByRole("slider",{name:"RISO63 absolute film frame"});
  const preview=root.locator("[data-km-riso63-film-preview]");
  const source=preview.locator('[data-km-riso62-source-ink="blue"] [data-km-riso62-source-path]');
  const setRange=async(value:number)=>{
    await frame.evaluate((element,next)=>{
      const input=element as HTMLInputElement;
      const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")?.set;
      if(!setter)throw Error("missing native input setter");
      setter.call(input,String(next));
      input.dispatchEvent(new Event("input",{bubbles:true}));
      input.dispatchEvent(new Event("change",{bubbles:true}));
    },value);
  };
  for(const shape of ["landscape","portrait"] as const){
    await aspect.selectOption(shape);
    await expect(root).toHaveAttribute("data-km-riso63-aspect",shape);
    const size=shape==="landscape"?[960,540]:[540,960];
    await expect(preview).toHaveCSS("width",size[0]+"px");
    await expect(preview).toHaveCSS("height",size[1]+"px");
    for(const plate of ["both","blue","red"] as const){
      await master.selectOption(plate);
      await expect(root).toHaveAttribute("data-km-riso63-plate",plate);
      await expect(preview.locator('[data-km-riso-plate]'))
        .toHaveCount(plate==="both"?2:1);
      await preview.screenshot({
        path:info.outputPath("riso63-film-"+shape+"-"+plate+".png"),
        animations:"disabled",
      });
    }
  }
  await aspect.selectOption("landscape");
  await master.selectOption("both");
  await expect(source).toHaveCount(11);
  await setRange(10);
  const early=await source.first().getAttribute("d");
  await setRange(130);
  const late=await source.first().getAttribute("d");
  expect(early).not.toBe(late);
  await setRange(10);
  expect(await source.first().getAttribute("d")).toBe(early);
  const reduced=page.getByRole("checkbox",{name:"RISO63 reduce motion"});
  await reduced.check();
  const hold=await source.first().getAttribute("d");
  await setRange(219);
  expect(await source.first().getAttribute("d")).toBe(hold);
  await reduced.uncheck();
  expect(await source.first().getAttribute("d")).not.toBe(hold);
  expect(errors).toEqual([]);
});
