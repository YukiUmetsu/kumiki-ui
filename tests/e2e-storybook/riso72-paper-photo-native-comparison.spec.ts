import {readFile} from "node:fs/promises";
import {test,expect} from "@playwright/test";

/** A test-only screenshot of RISO68 original native master is used as the
 * uploaded image. This proves the UI and coordinates, NOT physical press
 * or independently photographed Risograph reference fidelity. */
test("RISO72 original-master / paper-rectified image comparison preserves ink fibres and camera parity",
async({page},info)=>{
  test.setTimeout(150000);
  const errors:string[]=[];
  page.on("pageerror",e=>errors.push(e.message));
  await page.setViewportSize({width:1520,height:1310});
  await page.goto("/iframe.html?id=video-riso-print-lab--risograph-shop-scan-proof&viewMode=story");
  const root=page.locator("[data-km-riso70-studio]");
  await expect(root).toHaveAttribute("data-km-riso70-ready","true");
  const unalteredMaster=root.locator(
    '[data-km-riso70-native="blue"] svg[data-km-riso68-master]');
  await expect(unalteredMaster).toHaveCount(1);
  const nativeBefore=await unalteredMaster.locator(
    '[data-km-riso68-source="main-pressure-ribbon"]').getAttribute("d");
  const syntheticOriginalMasterCapture=await unalteredMaster.screenshot({
    animations:"disabled",
  });
  const download=page.waitForEvent("download");
  await page.getByRole("button",{name:"RISO70 download scan measurement template"})
    .click();
  const templateDownload=await download;
  const template=JSON.parse(await readFile((await templateDownload.path())!,"utf8")) as {
    sheetMm:[number,number];
    expectedMarksMm:Record<"top"|"bottom"|"left"|"right",[number,number]>;
  };
  await page.getByRole("combobox",{name:"RISO70 scan evidence source"})
    .selectOption("physical");
  const annotated=page.locator("[data-km-riso71-image-study]");
  await expect(annotated).toBeVisible();
  await page.getByLabel("RISO71 upload source scan image").setInputFiles({
    name:"test-only-riso68-native-master.png",mimeType:"image/png",
    buffer:syntheticOriginalMasterCapture,
  });
  const image=annotated.locator("[data-km-riso71-image]");
  await expect.poll(()=>image.evaluate(el=>(el as HTMLImageElement).naturalWidth))
    .toBeGreaterThan(200);
  const [iw,ih]=await image.evaluate(el=>{
    const img=el as HTMLImageElement;
    return [img.naturalWidth,img.naturalHeight];
  });
  const [sw,sh]=template.sheetMm;
  // Source image is exactly one rectangular RISO68 sheet, not a "press scan".
  const toPx=(x:number,y:number):[number,number]=>[
    1+(iw-2)*x/sw,
    1+(ih-2)*y/sh,
  ];
  const positions:Record<string,[number,number]>={
    "paper:top-left":toPx(0,0),
    "paper:top-right":toPx(sw,0),
    "paper:bottom-right":toPx(sw,sh),
    "paper:bottom-left":toPx(0,sh),
  };
  for(const plate of ["blue","red"])
    for(const id of ["top","bottom","left","right"] as const){
      const [x,y]=template.expectedMarksMm[id];
      positions[plate+":"+id]=toPx(x+(plate==="red"?1.25:0),
        y+(plate==="red"?-.6:0));
    }
  for(const [id,xy] of Object.entries(positions)){
    await annotated.locator('[data-km-riso71-target="'+id+'"]').click();
    await page.getByRole("spinbutton",{name:"RISO71 X image pixel"})
      .fill(String(xy[0]));
    await page.getByRole("spinbutton",{name:"RISO71 Y image pixel"})
      .fill(String(xy[1]));
    await annotated.getByRole("button",{name:"Set selected point"}).click();
  }
  await expect(annotated).toHaveAttribute("data-km-riso71-count","12");
  const comparison=page.locator("[data-km-riso72-photo-comparison]");
  await expect(comparison).toHaveAttribute("data-km-riso72-valid","true");
  await expect(comparison).toHaveAttribute("data-km-riso72-mode","paired");
  await expect(comparison.locator("[data-km-riso72-panel]")).toHaveCount(2);
  await expect(comparison.locator("[data-km-riso72-original-master]")).toHaveCount(1);
  await expect(comparison.locator("[data-km-riso72-rectified-photo] image")).toHaveCount(1);
  await expect(comparison.locator("[data-km-riso72-offset]")).toHaveCount(8);
  await expect(comparison.locator('[data-km-riso72-offset="blue:top"]'))
    .toHaveAttribute("data-km-riso72-dx","0");
  await expect(comparison.locator('[data-km-riso72-offset="red:top"]'))
    .toHaveAttribute("data-km-riso72-dx","1.25");
  await expect(comparison.locator('[data-km-riso72-offset="red:top"]'))
    .toHaveAttribute("data-km-riso72-dy","-0.6");
  const source=comparison.locator(
    '[data-km-riso72-original-master="blue"] [data-km-riso68-source="main-pressure-ribbon"]');
  await expect(source).toHaveAttribute("d",nativeBefore!);
  await comparison.screenshot({
    path:info.outputPath("riso72-native-original-vs-rectified-image-1x.png"),
    animations:"disabled",
  });
  await page.getByRole("combobox",{name:"RISO72 synchronized zoom"})
    .selectOption("3");
  await expect(comparison).toHaveAttribute("data-km-riso72-zoom","3");
  // Source-faithful A/B: the test image is a captured BLUE native master.
  // Compare blue with blue first, before proving red remains independent.
  await comparison.screenshot({
    path:info.outputPath("riso72-blue-source-to-blue-photo-fixture-3x.png"),
    animations:"disabled",
  });
  await page.getByRole("combobox",{name:"RISO72 original spot ink"})
    .selectOption("red");
  await expect(comparison.locator('[data-km-riso72-original-master="red"]'))
    .toHaveCount(1);
  await comparison.screenshot({
    path:info.outputPath("riso72-independent-red-master-vs-blue-test-fixture-3x.png"),
    animations:"disabled",
  });
  await page.getByRole("combobox",{name:"RISO72 original spot ink"})
    .selectOption("blue");
  await page.getByRole("combobox",{name:"RISO72 inspection mode"})
    .selectOption("overlaid");
  await expect(comparison).toHaveAttribute("data-km-riso72-mode","overlaid");
  await expect(comparison.locator("[data-km-riso72-panel]")).toHaveCount(1);
  await expect(comparison.locator("[data-km-riso72-rectified-photo]")).toHaveCount(1);
  await comparison.screenshot({
    path:info.outputPath("riso72-native-source-over-print-photo-3x.png"),
    animations:"disabled",
  });
  await page.getByRole("combobox",{name:"RISO72 original spot ink"})
    .selectOption("blue");
  await expect(source).toHaveAttribute("d",nativeBefore!);
  await page.getByRole("checkbox",{name:"RISO72 observed ink registration guides"})
    .uncheck();
  await expect(comparison.locator("[data-km-riso72-offset]")).toHaveCount(0);
  await page.getByRole("combobox",{name:"RISO72 inspection mode"})
    .selectOption("scan");
  await expect(comparison.locator("[data-km-riso72-original-master]")).toHaveCount(0);
  await expect(comparison.locator("[data-km-riso72-rectified-photo]")).toHaveCount(1);
  await page.getByRole("combobox",{name:"RISO72 inspection mode"})
    .selectOption("original");
  await expect(comparison.locator("[data-km-riso72-original-master]")).toHaveCount(1);
  await expect(comparison.locator("[data-km-riso72-rectified-photo]")).toHaveCount(0);
  expect(await unalteredMaster.locator(
    '[data-km-riso68-source="main-pressure-ribbon"]').getAttribute("d"))
    .toBe(nativeBefore);
  expect(errors).toEqual([]);
});
