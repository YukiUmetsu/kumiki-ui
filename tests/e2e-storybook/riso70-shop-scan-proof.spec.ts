import {readFile,writeFile} from "node:fs/promises";
import {test,expect} from "@playwright/test";

test("RISO70 authentic native ink masters, declared printer margins and scanner marks",
async({page},info)=>{
  test.setTimeout(120000);
  const errors:string[]=[];
  page.on("pageerror",e=>errors.push(e.message));
  await page.setViewportSize({width:1490,height:1390});
  await page.goto("/iframe.html?id=video-riso-print-lab--risograph-shop-scan-proof&viewMode=story");
  const root=page.locator("[data-km-riso70-studio]");
  await expect(root).toBeVisible();
  await expect(root).toHaveAttribute("data-km-riso70-ready","true");
  await expect(root).toHaveAttribute("data-km-riso70-proof","simulation-only");
  const range=async(name:string,value:number)=>{
    await page.getByRole("slider",{name}).evaluate((node,n)=>{
      const setter=Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,"value")?.set;
      if(!setter)throw Error("No native range setter");
      setter.call(node,String(n));
      node.dispatchEvent(new Event("input",{bubbles:true}));
      node.dispatchEvent(new Event("change",{bubbles:true}));
    },value);
  };
  for(const aspect of ["landscape","portrait"] as const){
    await page.getByRole("combobox",{name:"RISO70 output orientation"})
      .selectOption(aspect);
    await expect(root).toHaveAttribute("data-km-riso70-aspect",aspect);
    await expect(root).toHaveAttribute("data-km-riso70-ready","true");
    for(const magnify of [false,true]){
      const zoom=page.getByRole("checkbox",{name:"RISO70 2x source macro"});
      if(magnify)await zoom.check();else await zoom.uncheck();
      for(const id of ["blue","red"]){
        const panel=root.locator('[data-km-riso70-native="'+id+'"]');
        await expect(panel.locator("svg[data-km-riso68-master]")).toHaveCount(1);
        await expect(panel.locator("[data-km-riso68-source]")).toHaveCount(4);
        await expect(panel.locator("image, text, filter, foreignObject"))
          .toHaveCount(0);
      }
      await root.screenshot({path:info.outputPath("riso70-"+aspect+"-"+
        (magnify?"2x":"1x")+"-native-print-and-scan.png"),
        animations:"disabled"});
    }
  }
  await page.getByRole("combobox",{name:"RISO70 output orientation"})
    .selectOption("landscape");
  await range("RISO70 absolute source frame",40);
  const original=root.locator(
    '[data-km-riso70-native="blue"] [data-km-riso68-source="main-pressure-ribbon"]');
  const sourcePath=await original.getAttribute("d");
  await range("RISO70 absolute source frame",192);
  expect(await original.getAttribute("d")).not.toBe(sourcePath);
  await range("RISO70 absolute source frame",40);
  await expect(original).toHaveAttribute("d",sourcePath!);
  await range("RISO70 unavailable top",35);
  await expect(root).toHaveAttribute("data-km-riso70-ready","false");
  await expect(page.getByRole("button",{name:"RISO70 export blue PDF"})).toBeDisabled();
  await expect(root.locator("[data-km-riso70-issues]")).toContainText("mark-outside-press");
  await range("RISO70 unavailable top",12);
  await expect(root).toHaveAttribute("data-km-riso70-ready","true");
  await range("RISO70 synthetic red X",3.2);
  await expect(root).toHaveAttribute("data-km-riso70-within","false");
  await range("RISO70 synthetic red X",.5);
  await expect(root).toHaveAttribute("data-km-riso70-within","true");
  // A real scan template must have null observed coordinates, never fake data.
  const trigger=page.waitForEvent("download");
  await page.getByRole("button",{name:"RISO70 download scan measurement template"})
    .click();
  const template=await trigger;
  const file=await template.path();
  const sample=JSON.parse(await readFile(file!,"utf8")) as {
    sheetMm:[number,number];
    expectedMarksMm:Record<"top"|"bottom"|"left"|"right",[number,number]>;
    kind:string;
    corners:{id:string;scanPx:null|[number,number]}[];
    plates:{plateId:string;marks:{id:"top"|"bottom"|"left"|"right";
      scanPx:null|[number,number]}[]}[];
  };
  expect(sample.corners.every(c=>c.scanPx===null)).toBe(true);
  expect(sample.plates.every(p=>p.marks.every(m=>m.scanPx===null))).toBe(true);
  // Playwright enters an EXPLICIT operator-style sample; it does not certify real paper.
  const observed={
    ...sample,kind:"physical-scan",
    corners:sample.corners.map((c,i)=>({...c,
      scanPx:[
        100+12*([0,sample.sheetMm[0],sample.sheetMm[0],0] as const)[i],
        100+12*([0,0,sample.sheetMm[1],sample.sheetMm[1]] as const)[i],
      ]})),
    plates:sample.plates.map((p,i)=>({...p,marks:p.marks.map(m=>{
      const [x,y]=sample.expectedMarksMm[m.id];
      return {...m,scanPx:[100+12*(x+(i===1?2.4:0)),
        100+12*(y+(i===1?-.6:0))]};
    })})),
  };
  await page.getByRole("combobox",{name:"RISO70 scan evidence source"})
    .selectOption("physical");
  await expect(root.locator("[data-km-riso70-scan-error]")).toBeVisible();
  await page.getByRole("textbox",{name:"RISO70 physical scan measurement JSON"})
    .fill(JSON.stringify(observed));
  await expect(root).toHaveAttribute("data-km-riso70-proof","operator-measured");
  await expect(root).toHaveAttribute("data-km-riso70-within","false");
  await expect(root.locator("[data-km-riso70-scan-plate]")).toHaveCount(2);
  await expect(root.locator("[data-km-riso70-relative-pair]"))
    .toContainText("Worst relative:");
  await page.getByRole("combobox",{name:"RISO70 scan evidence source"})
    .selectOption("synthetic");
  await expect(root).toHaveAttribute("data-km-riso70-proof","simulation-only");
  const downloaded=page.waitForEvent("download");
  await page.getByRole("button",{name:"RISO70 export blue PDF"}).click();
  const physicalPdf=await downloaded;
  const bytes=await readFile((await physicalPdf.path())!);
  expect(physicalPdf.suggestedFilename()).toMatch(/blue-2362a0-K\.pdf$/);
  expect(bytes.toString("utf8")).toMatch(/^%PDF-1\.4/);
  expect(bytes.toString("utf8").match(/f\*/g)).toHaveLength(4);
  await writeFile(info.outputPath("riso70-blue-shop-declared-source.pdf"),bytes);
  await page.getByRole("combobox",{name:"RISO70 mark policy"})
    .selectOption("none");
  await expect(root).toHaveAttribute("data-km-riso70-ready","true");
  await expect(root.locator("[data-km-riso70-scan-error]"))
    .toContainText("requires explicit crop-and-register");
  expect(errors).toEqual([]);
});
