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
    // True visual zoom must never alter ORIGINAL pixel coordinates. Both
    // sides are tested independently; no resampled source is exported.
    await page.getByLabel(side+" native annotation magnification")
      .selectOption("2");
    const zoomBox=await overlay.boundingBox();
    expect(zoomBox).not.toBeNull();
    await page.getByLabel(side+" contour point").selectOption("0");
    await overlay.click({position:{
      x:zoomBox!.width*.1,y:zoomBox!.height*.1,
    }});
    const apex=parent.locator(
      '[data-km-annotated-contour="cranial-apex"] circle');
    await expect(apex).toHaveAttribute("cx","24");
    await expect(apex).toHaveAttribute("cy","24");
    // Placing a point auto-selects the next semantic point; explicitly
    // reselect the placed apex before applying native-pixel corrections.
    await page.getByLabel(side+" contour point").selectOption("0");
    await page.getByRole("button",{name:
      "Nudge "+side+" selected annotation right by 1 native pixel"}).click();
    await expect(apex).toHaveAttribute("cx","25");
    await overlay.focus();
    await page.keyboard.press("Shift+ArrowDown");
    await expect(apex).toHaveAttribute("cy","34");
    await page.getByLabel(side+" native annotation magnification")
      .selectOption("1");
    await expect(parent.locator("[data-km-annotated-contour]"))
      .toHaveCount(18);
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
    const firstTone=parent.locator('[data-km-annotated-tone="highlight"]');
    const originalX=Number(await firstTone.getAttribute("x"));
    await page.getByRole("button",{name:
      "Nudge "+side+" selected annotation right by 1 native pixel"}).click();
    await expect(firstTone).toHaveAttribute("x",String(originalX+1));

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
  // Strict negative proof: synthetic equal-colored PNGs MUST be blocked.
  // The two actual local hashes come from the exact browser input bytes.
  const {createHash}=await import("node:crypto");
  const digest=createHash("sha256").update(buf).digest("hex");
  const pixels=[223,174,150]; // synthetic test-only flat PNG
  const measured={
    source:{...data.source,width:240,height:240,sha256:digest},
    output:{width:240,height:240,sha256:digest},
    sourceLandmarks:data.sourceLandmarks,outputLandmarks:data.outputLandmarks,
    sourceTones:data.sourceTones.map((t:{id:string;rect:object})=>({
      ...t,meanRgb:pixels,
    })),
    outputTones:data.outputTones.map((t:{id:string;rect:object})=>({
      ...t,meanRgb:pixels,
    })),
  };
  await page.getByLabel("Import measured head evidence JSON").setInputFiles({
    name:"test-only-fake-paired-source.json",mimeType:"application/json",
    buffer:Buffer.from(JSON.stringify(measured)),
  });
  await expect(page.locator("[data-km-head-evidence-status]"))
    .toHaveAttribute("data-km-head-evidence-status","blocked");
  await expect(page.locator("[data-km-evidence-errors]"))
    .toContainText("SOURCE_RENDER_SAME_HASH");
  await expect(page.getByText("Artist approved: NO.",{exact:false}))
    .toBeVisible();
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

  // Changing a native pixel invalidates the imported measured proof.
  await page.getByLabel("source annotation mode").selectOption("landmark");
  await page.getByLabel("source contour point").selectOption("0");
  await page.getByRole("button",{name:
    "Nudge source selected annotation right by 1 native pixel"}).click();
  await expect(page.locator("[data-km-head-evidence-status]"))
    .toHaveAttribute("data-km-head-evidence-status","stale");
  await expect(page.locator("[data-km-evidence-invalid]"))
    .toContainText("stale");
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
