import {test,expect} from "@playwright/test";

/** Create strictly local, test-only image pixels in Chromium; no network,
 * source model, cross-origin bitmap or artwork substitution. Their colors
 * are for checking native coordinate placement only, not image fidelity.
 */
test("ArtCraft annotation atlas uses separate local source/native files and exports 18+5 coordinates",async({page},info)=>{
  await page.goto("/iframe.html?id=video-colored-pencil-science--source-annotation-atlas&viewMode=story");
  const atlas=page.locator("[data-km-pencils-head-annotation-atlas]");
  await expect(atlas).toBeVisible();
  await expect(atlas).toHaveAttribute("data-km-reference-approval","unapproved");
  await expect(page.locator("[data-km-annotation-export]")).toBeDisabled();
  const b64=await page.evaluate(()=>{
    const canvas=document.createElement("canvas");
    canvas.width=240;canvas.height=240;
    const ctx=canvas.getContext("2d")!;
    ctx.fillStyle="#DFAE96";ctx.fillRect(0,0,240,240);
    return canvas.toDataURL("image/png").split(",")[1];
  });
  const buf=Buffer.from(b64,"base64");
  await page.getByLabel("source local image").setInputFiles({
    name:"independent-source.png",mimeType:"image/png",buffer:buf,
  });
  await page.getByLabel("output local image").setInputFiles({
    name:"independent-native.png",mimeType:"image/png",buffer:buf,
  });
  // Separate pixel files are intentionally equal in this UI-only QA:
  // Exact-byte SHA equality is rejected by the native capture CLI later.
  for(const side of ["source","output"] as const){
    const parent=page.locator('[data-km-head-photo-side="'+side+'"]');
    const overlay=parent.locator('[data-km-head-photo-overlay="'+side+'"]');
    await expect(overlay).toBeVisible();
    const box=await overlay.boundingBox();
    expect(box).not.toBeNull();
    for(let i=0;i<18;i++){
      await overlay.click({position:{
        x:box!.width*(.08+i*.044),
        y:box!.height*(.12+i*.032),
      }});
    }
    await expect(parent.locator("[data-km-annotated-contour]")).toHaveCount(18);
    const labels=parent.locator("[data-km-annotated-contour] text");
    await expect(labels).toHaveCount(18);
    expect(await labels.allTextContents()).toEqual(
      Array.from({length:18},(_,i)=>String(i+1)));
    // Correct a wrong point without deleting the 17 others or data on
    // the other photo; later restore the point to complete the atlas.
    await page.getByLabel(side+" contour point").selectOption("0");
    await page.getByRole("button",{name:"Remove selected "+side+" landmark"}).click();
    await expect(parent.locator("[data-km-annotated-contour]")).toHaveCount(17);
    await overlay.click({position:{x:box!.width*.08,y:box!.height*.12}});
    await expect(parent.locator("[data-km-annotated-contour]")).toHaveCount(18);
    await page.getByLabel(side+" annotation mode").selectOption("tone");
    for(let i=0;i<5;i++){
      const b=await overlay.boundingBox();
      const x=b!.x+b!.width*(.04+i*.19),y=b!.y+b!.height*.68;
      await page.mouse.move(x,y);await page.mouse.down();
      await page.mouse.move(x+b!.width*.09,y+b!.height*.07,{steps:4});
      await page.mouse.up();
      // Fail precisely at the bad drag, rather than hanging for two
      // minutes after all five values when a selection/capture eats input.
      await expect(parent.locator("[data-km-annotated-tone]"),
        "tone "+(i+1)+" of 5 must be committed on native pointer-up")
        .toHaveCount(i+1,{timeout:2500});
    }
    await expect(parent.locator("[data-km-annotated-tone]")).toHaveCount(5);
    await expect(parent.locator("[data-km-annotated-tone-label]")).toHaveCount(5);
    await page.getByLabel(side+" tonal band").selectOption("0");
    await page.getByRole("button",{name:"Remove selected "+side+" tone"}).click();
    await expect(parent.locator("[data-km-annotated-tone]")).toHaveCount(4);
    const bx=await overlay.boundingBox();
    const x=bx!.x+bx!.width*.04,y=bx!.y+bx!.height*.68;
    await page.mouse.move(x,y);await page.mouse.down();
    await page.mouse.move(x+bx!.width*.09,y+bx!.height*.07,{steps:4});
    await page.mouse.up();
    await expect(parent.locator("[data-km-annotated-tone]")).toHaveCount(5);
    await expect(parent.locator("[data-km-annotation-side-ready]"))
      .toHaveAttribute("data-km-annotation-side-ready","yes");
    const src=await parent.locator("img").getAttribute("src");
    expect(src).toMatch(/^blob:/);
    await expect(parent.locator("image,foreignObject")).toHaveCount(0);
  }
  await page.getByLabel("Original source page").fill(
    "https://commons.wikimedia.org/wiki/File:Author-Verified.jpg");
  await page.getByLabel("Photographer credit").fill("Independent original photographer");
  await page.getByLabel("Original license").selectOption("CC-BY-4.0");
  await expect(page.locator("[data-km-annotation-export]")).toBeEnabled();
  await page.getByText("Preview JSON-only annotation manifest").click();
  const raw=await page.getByLabel("Independent annotations JSON").inputValue();
  const data=JSON.parse(raw);
  expect(data.sourceLandmarks).toHaveLength(18);
  expect(data.outputLandmarks).toHaveLength(18);
  expect(data.sourceTones).toHaveLength(5);
  expect(data.outputTones).toHaveLength(5);
  expect(raw).not.toContain("meanRgb");
  expect(raw).not.toContain("sha256");
  expect(raw).not.toContain("data:image");
  await expect(page.locator("[data-km-annotation-progress]"))
    .toContainText("ready for byte capture");
  await page.screenshot({path:info.outputPath(
    "head-local-source-and-native-annotation-atlas.png"),
    fullPage:true,animations:"disabled"});
  // The private draft contains only independently placed coordinates and
  // actual local image fingerprints; its import can resume a long session.
  const [download]=await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button",{name:/Save local checkpoint/}).click(),
  ]);
  expect(download.suggestedFilename()).toBe("pencil-head-private-checkpoint.json");
  const {readFile}=await import("node:fs/promises");
  const saved=await download.path();
  expect(saved).not.toBeNull();
  const privateDraft=await readFile(saved!,"utf8");
  expect(privateDraft).toContain("sha256");
  expect(privateDraft).not.toContain("data:image");
  expect(privateDraft).not.toContain("meanRgb");

  // A replacement must invalidate only that image's coordinates.
  await page.getByLabel("source local image").setInputFiles({
    name:"replacement-source.png",mimeType:"image/png",buffer:buf,
  });
  await expect(page.locator('[data-km-head-photo-side="source"] '+
    '[data-km-annotated-contour]')).toHaveCount(0);
  await expect(page.locator('[data-km-head-photo-side="output"] '+
    '[data-km-annotated-contour]')).toHaveCount(18);
  await expect(page.locator("[data-km-annotation-export]")).toBeDisabled();
  // Only an exact-byte match of both newly loaded local files can restore
  // the original source/output annotation sets. The photo name can differ.
  await page.getByLabel("Restore checkpoint JSON").setInputFiles({
    name:"saved-annotations.json",mimeType:"application/json",
    buffer:Buffer.from(privateDraft),
  });
  for(const side of ["source","output"] as const){
    const parent=page.locator(`[data-km-head-photo-side="${side}"]`);
    await expect(parent.locator("[data-km-annotated-contour]")).toHaveCount(18);
    await expect(parent.locator("[data-km-annotated-tone]")).toHaveCount(5);
  }
  await expect(page.locator("[data-km-annotation-export]")).toBeEnabled();
  await expect(page.locator("svg[data-km-colored-pencil]")).toHaveCount(0);
});
