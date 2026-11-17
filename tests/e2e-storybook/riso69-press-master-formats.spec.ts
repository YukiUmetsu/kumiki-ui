import {readFile,writeFile} from "node:fs/promises";
import {test,expect} from "@playwright/test";

test("RISO69 real native vector PDF, TIFF and complete master views",async({page},info)=>{
  test.setTimeout(120000);
  const errors:string[]=[];
  page.on("pageerror",e=>errors.push(e.message));
  await page.setViewportSize({width:1460,height:1340});
  await page.goto("/iframe.html?id=video-riso-print-lab--risograph-press-delivery&viewMode=story");
  const root=page.locator("[data-km-riso69-studio]");
  await expect(root).toBeVisible();
  await expect(root).toHaveAttribute("data-km-riso69-ready","true");
  const range=async(name:string,value:number)=>{
    await page.getByRole("slider",{name}).evaluate((node,n)=>{
      const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")?.set;
      if(!setter)throw Error("Missing native range setter");
      setter.call(node,String(n));
      node.dispatchEvent(new Event("input",{bubbles:true}));
      node.dispatchEvent(new Event("change",{bubbles:true}));
    },value);
  };
  for(const aspect of ["landscape","portrait"] as const){
    await page.getByRole("combobox",{name:"RISO69 output orientation"}).selectOption(aspect);
    await expect(root).toHaveAttribute("data-km-riso69-aspect",aspect);
    for(const macro of [false,true]){
      const cb=page.getByRole("checkbox",{name:"RISO69 2x source macro"});
      if(macro)await cb.check();else await cb.uncheck();
      for(const ink of ["blue","red"]){
        const panel=root.locator('[data-km-riso69-preview="'+ink+'"]');
        await expect(panel.locator("svg")).toHaveCount(1);
        await expect(panel.locator("[data-km-riso68-source]")).toHaveCount(4);
      }
      await root.screenshot({path:info.outputPath("riso69-"+aspect+"-"+
        (macro?"2x":"1x")+"-original-native.png"),animations:"disabled"});
    }
  }
  await page.getByRole("combobox",{name:"RISO69 output orientation"}).selectOption("landscape");
  await page.getByRole("combobox",{name:"RISO69 mark policy"}).selectOption("crop-and-register");
  await expect(root.locator('[data-km-riso69-preview="blue"] [data-km-riso68-mark]'))
    .toHaveCount(16);
  await range("RISO69 absolute source frame",44);
  const stroke=root.locator('[data-km-riso69-preview="blue"] [data-km-riso68-source="main-pressure-ribbon"]');
  const source=await stroke.getAttribute("d");
  await range("RISO69 absolute source frame",190);
  expect(await stroke.getAttribute("d")).not.toBe(source);
  await range("RISO69 absolute source frame",44);
  await expect(stroke).toHaveAttribute("d",source!);
  const save=async(ink:"blue"|"red",extension:"PDF"|"TIFF")=>{
    const result=page.waitForEvent("download");
    await page.getByRole("button",{name:"RISO69 export "+ink+" "+extension}).click();
    const file=await result;
    const filename=await file.path();
    expect(filename).not.toBeNull();
    const bytes=await readFile(filename!);
    expect(bytes.byteLength).toBeGreaterThan(20000);
    await writeFile(info.outputPath("riso69-"+ink+"-physical-master."+
      (extension==="PDF"?"pdf":"tif")),bytes);
    return {bytes,name:file.suggestedFilename()};
  };
  const blue=await save("blue","PDF"),red=await save("red","PDF");
  const a=blue.bytes.toString("utf8"),b=red.bytes.toString("utf8");
  expect(blue.name).toMatch(/blue-2362a0-K\.pdf$/);
  expect(red.name).toMatch(/red-dd593d-K\.pdf$/);
  expect(a).not.toBe(b);
  expect(a).toMatch(/^%PDF-1\.4/);
  expect(a.match(/f\*/g)).toHaveLength(4);
  expect(b.match(/f\*/g)).toHaveLength(4);
  expect(a).not.toMatch(/\/DeviceRGB|\/Image\b|\/Font\b/);
  const xref=Number(a.match(/startxref\n(\d+)\n%%EOF/)?.[1]);
  expect(a.slice(xref,xref+4)).toBe("xref");
  expect(a.slice(a.lastIndexOf("\n0 G\n"))).toBe(b.slice(b.lastIndexOf("\n0 G\n")));
  await page.getByRole("combobox",{name:"RISO69 output format"}).selectOption("tiff");
  await expect(root).toHaveAttribute("data-km-riso69-format","tiff");
  const tBlue=await save("blue","TIFF"),tRed=await save("red","TIFF");
  expect(tBlue.name).toMatch(/blue-2362a0-K-300ppi\.tif$/);
  expect(tRed.name).toMatch(/red-dd593d-K-300ppi\.tif$/);
  const inspect=(bytes:Uint8Array)=>{
    const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
    expect(bytes[0]).toBe(73);expect(bytes[1]).toBe(73);
    expect(view.getUint16(2,true)).toBe(42);
    const start=view.getUint32(4,true),tags=new Map<number,number>();
    const count=view.getUint16(start,true);
    expect(count).toBe(14);
    for(let i=0;i<count;i++){
      const at=start+2+i*12,type=view.getUint16(at+2,true);
      tags.set(view.getUint16(at,true),type===3?
        view.getUint16(at+8,true):view.getUint32(at+8,true));
    }
    expect(tags.get(256)).toBe(3508);
    expect(tags.get(257)).toBe(2480);
    expect(tags.get(258)).toBe(8);
    expect(tags.get(259)).toBe(1);
    expect(tags.get(262)).toBe(1);
    expect(tags.get(277)).toBe(1);
    expect(view.getUint32(tags.get(282)!,true)).toBe(300);
    expect(view.getUint32(tags.get(283)!,true)).toBe(300);
    const pixels=bytes.subarray(tags.get(273)!);
    expect(pixels.length).toBe(3508*2480);
    expect(pixels.includes(0)).toBe(true);
    expect(pixels.includes(255)).toBe(true);
    expect(pixels.includes(56)).toBe(true);
    return pixels;
  };
  expect(inspect(tBlue.bytes)).not.toEqual(inspect(tRed.bytes));
  await range("RISO69 critical safe inset",40);
  await expect(root).toHaveAttribute("data-km-riso69-ready","false");
  await expect(page.getByRole("button",{name:"RISO69 export blue TIFF"})).toBeDisabled();
  await range("RISO69 critical safe inset",8);
  await expect(root).toHaveAttribute("data-km-riso69-ready","true");
  expect(errors).toEqual([]);
});
