import {readFile} from "node:fs/promises";
import {test,expect} from "@playwright/test";

/** Two copies of the SAME test-only screenshot of a native RISO68 source are
 * uploaded to exercise two independent paper-coordinate image workflows.
 * This is a UI/geometry test, NOT a scan of any physical print. */
test("RISO73 two independently annotated uploaded print images retain exact paper-only registration and controls",
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
  await page.getByRole("button",{name:"RISO73 add or remove second physical print scan"})
    .click();
  const secondAnnotator=page.locator("[data-km-riso71-image-study]").nth(1);
  await expect(secondAnnotator).toBeVisible();
  await secondAnnotator.getByLabel("RISO71 upload source scan image")
    .setInputFiles({
      name:"test-only-copy-two-original-vector.png",mimeType:"image/png",
      buffer:syntheticOriginalMasterCapture,
    });
  await expect.poll(()=>secondAnnotator.locator(
    "[data-km-riso71-image]").evaluate(el=>
      (el as HTMLImageElement).naturalWidth)).toBeGreaterThan(200);
  // These are purely numeric test offsets, not fabricated press observations.
  const secondPositions:Record<string,[number,number]>={
    "paper:top-left":toPx(0,0),
    "paper:top-right":toPx(sw,0),
    "paper:bottom-right":toPx(sw,sh),
    "paper:bottom-left":toPx(0,sh),
  };
  for(const plate of ["blue","red"])
    for(const id of ["top","bottom","left","right"] as const){
      const [x,y]=template.expectedMarksMm[id];
      secondPositions[plate+":"+id]=toPx(
        x+(plate==="blue"?.5:2.2),
        y+(plate==="blue"?-.15:.3),
      );
    }
  for(const [id,xy] of Object.entries(secondPositions)){
    await secondAnnotator.locator('[data-km-riso71-target="'+id+'"]').click();
    await secondAnnotator.getByRole("spinbutton",{name:"RISO71 X image pixel"})
      .fill(String(xy[0]));
    await secondAnnotator.getByRole("spinbutton",{name:"RISO71 Y image pixel"})
      .fill(String(xy[1]));
    await secondAnnotator.getByRole("button",{name:"Set selected point"})
      .click();
  }
  await expect(secondAnnotator).toHaveAttribute("data-km-riso71-count","12");
  const study=page.locator("[data-km-riso73-two-copy-audit]");
  await expect(study).toHaveAttribute("data-km-riso73-valid","true");
  await expect(study).toHaveAttribute("data-km-riso73-within","true");
  await expect(study.locator("[data-km-riso73-paper-image]")).toHaveCount(2);
  await expect(study.locator("[data-km-riso73-mark]")).toHaveCount(16);
  const blue=study.locator('[data-km-riso73-row="blue"]');
  const red=study.locator('[data-km-riso73-row="red"]');
  await expect(blue).toContainText("0.5");
  await expect(blue).toContainText("-0.15");
  await expect(red).toContainText("0.95");
  await expect(red).toContainText("0.9");
  await expect(study.locator('[data-km-riso73-inter-ink]'))
    .toContainText("1.05");
  await study.screenshot({
    path:info.outputPath("riso73-two-independent-paper-images-1x.png"),
    animations:"disabled",
  });
  await study.getByRole("combobox",{name:"RISO73 synchronized zoom"})
    .selectOption("3");
  await expect(study).toHaveAttribute("data-km-riso73-zoom","3");
  await study.getByRole("combobox",{name:"RISO73 inspection mode"})
    .selectOption("overlay");
  await expect(study).toHaveAttribute("data-km-riso73-mode","overlay");
  await expect(study.locator("[data-km-riso73-panel]")).toHaveCount(1);
  await expect(study.locator("[data-km-riso73-paper-image]")).toHaveCount(2);
  await expect(study.locator("[data-km-riso73-ink-arrows]")).toHaveCount(1);
  await study.screenshot({
    path:info.outputPath("riso73-two-synthetic-source-fixtures-3x-copy-overlay.png"),
    animations:"disabled",
  });
  await study.getByRole("checkbox",{
    name:"RISO73 show independent print mark vectors"}).uncheck();
  await expect(study.locator("[data-km-riso73-mark]")).toHaveCount(0);
  // A native range input is keyboard-operated (fill() is not valid for range).
  await study.getByRole("slider",{name:"RISO73 copy-to-copy mm budget"}).focus();
  await study.getByRole("slider",{name:"RISO73 copy-to-copy mm budget"}).press("Home");
  await expect(study).toHaveAttribute("data-km-riso73-within","false");
  await study.getByRole("combobox",{name:"RISO73 inspection mode"})
    .selectOption("second");
  await expect(study.locator("[data-km-riso73-paper-image]")).toHaveCount(1);
  await expect(study.locator('[data-km-riso73-paper-image="second"]'))
    .toHaveCount(1);
  await page.getByRole("button",{name:"RISO73 add or remove second physical print scan"})
    .click();
  await expect(page.locator("[data-km-riso73-two-copy-audit]")).toHaveCount(0);
  await expect(page.locator("[data-km-riso72-photo-comparison]"))
    .toHaveAttribute("data-km-riso72-valid","true");
  expect(await unalteredMaster.locator(
    '[data-km-riso68-source="main-pressure-ribbon"]').getAttribute("d"))
    .toBe(nativeBefore);
  expect(errors).toEqual([]);
});
