import {readFile} from "node:fs/promises";
import {test,expect} from "@playwright/test";

test("RISO68 actual distinct K-only master downloads and geometry 16:9/9:16",
async({page},info)=>{
  const errors:string[]=[];
  page.on("pageerror",err=>errors.push(err.message));
  await page.setViewportSize({width:1460,height:1370});
  await page.goto("/iframe.html?id=video-riso-print-lab--risograph-master-separation&viewMode=story");
  const root=page.locator("[data-km-riso68-studio]");
  await expect(root).toBeVisible();
  await expect(root).toHaveAttribute("data-km-riso68-ready","true");
  const values=async(name:string,value:number)=>{
    await page.getByRole("slider",{name}).evaluate((node,next)=>{
      const setter=Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,"value")?.set;
      if(!setter)throw Error("Native range setter missing");
      setter.call(node,String(next));
      node.dispatchEvent(new Event("input",{bubbles:true}));
      node.dispatchEvent(new Event("change",{bubbles:true}));
    },value);
  };
  for(const ratio of ["landscape","portrait"] as const){
    await page.getByRole("combobox",{name:"RISO68 output orientation"})
      .selectOption(ratio);
    await expect(root).toHaveAttribute("data-km-riso68-aspect",ratio);
    await expect(root.locator("[data-km-riso68-svg]")).toHaveCount(2);
    for(const mag of [false,true]){
      const cb=page.getByRole("checkbox",{name:"RISO68 2x source macro"});
      if(mag)await cb.check();else await cb.uncheck();
      for(const plate of ["blue","red"]){
        const panel=root.locator("[data-km-riso68-svg='"+plate+"']");
        await expect(panel.locator("svg[data-km-riso68-master]")).toHaveCount(1);
        await expect(panel.locator("[data-km-riso68-source]")).toHaveCount(4);
        await expect(panel.locator("image, text, filter, foreignObject")).toHaveCount(0);
      }
      await root.screenshot({path:info.outputPath(
        "riso68-"+ratio+"-"+(mag?"2x":"1x")+"-original-masters.png"),
        animations:"disabled"});
    }
  }
  await page.getByRole("combobox",{name:"RISO68 print marks"})
    .selectOption("crop-and-register");
  await expect(root).toHaveAttribute("data-km-riso68-marks","crop-and-register");
  await expect(root.locator('[data-km-riso68-svg="blue"] [data-km-riso68-mark]'))
    .toHaveCount(16);
  await expect(root.locator('[data-km-riso68-svg="red"] [data-km-riso68-mark]'))
    .toHaveCount(16);
  await page.getByRole("combobox",{name:"RISO68 output orientation"})
    .selectOption("landscape");
  await values("RISO68 absolute source frame",48);
  const hero=root.locator('[data-km-riso68-svg="blue"] [data-km-riso68-source="main-pressure-ribbon"]');
  const first=await hero.getAttribute("d");
  await values("RISO68 absolute source frame",193);
  expect(await hero.getAttribute("d")).not.toBe(first);
  await values("RISO68 absolute source frame",48);
  await expect(hero).toHaveAttribute("d",first!);
  const blueEvent=page.waitForEvent("download");
  await page.getByRole("button",{name:"RISO68 export blue grayscale SVG"}).click();
  const blue=await blueEvent, bluePath=await blue.path();
  expect(blue.suggestedFilename()).toMatch(/blue-2362a0-K.svg$/);
  expect(bluePath).not.toBeNull();
  const blueSvg=await readFile(bluePath!,"utf8");
  expect(blueSvg).toContain('data-km-riso68-master="blue"');
  expect(blueSvg.match(/data-km-riso68-mark=/g)).toHaveLength(16);
  expect(blueSvg).not.toContain('data-km-riso68-master="red"');
  expect(blueSvg).not.toMatch(/<image|<text|<foreignObject|feGaussianBlur/);
  const redEvent=page.waitForEvent("download");
  await page.getByRole("button",{name:"RISO68 export red grayscale SVG"}).click();
  const red=await redEvent,redPath=await red.path();
  expect(red.suggestedFilename()).toMatch(/red-dd593d-K.svg$/);
  const redSvg=await readFile(redPath!,"utf8");
  expect(redSvg).not.toBe(blueSvg);
  expect(redSvg.match(/data-km-riso68-mark=/g)).toHaveLength(16);
  const markSection=(s:string)=>s.slice(s.indexOf('<g data-km-riso68-marks'));
  expect(markSection(redSvg)).toBe(markSection(blueSvg));
  await values("RISO68 safe margin",40);
  await expect(root).toHaveAttribute("data-km-riso68-ready","false");
  await expect(page.getByRole("button",{name:"RISO68 export blue grayscale SVG"}))
    .toBeDisabled();
  await values("RISO68 safe margin",8);
  await expect(root).toHaveAttribute("data-km-riso68-ready","true");
  await page.getByRole("checkbox",{name:"RISO68 color reference proof"}).check();
  await expect(root.locator("[data-km-riso66-panel]")).toHaveCount(1);
  expect(errors).toEqual([]);
});
