import {expect,test} from "@playwright/test";

/** UI-only synthetic geometry control. No source photograph, human likeness,
 * visual art certification, or source-to-render fidelity evidence.
 */
test("new head ArtCraft contour vectors use independently placed source/native pixels",async({page},info)=>{
  await page.goto("/iframe.html?id=video-colored-pencil-science--source-annotation-atlas&viewMode=story");
  const review=page.locator("[data-km-head-contour-review]");
  await expect(review).toBeVisible();
  await expect(review).toHaveAttribute("data-km-artcraft-approval","unapproved");
  await expect(review).toHaveAttribute("data-km-contour-review-state","incomplete");
  // Two actual local test-only PNG byte streams, not a source image
  // downloaded or copied into the film. Content differs deliberately.
  const imageData=await page.evaluate(()=>{
    const canvas=document.createElement("canvas");
    canvas.width=480;canvas.height=480;
    const ctx=canvas.getContext("2d")!;
    ctx.fillStyle="#D8B9A4";ctx.fillRect(0,0,480,480);
    const a=canvas.toDataURL("image/png").split(",")[1];
    ctx.fillStyle="#A4AFBD";ctx.fillRect(0,0,480,480);
    return [a,canvas.toDataURL("image/png").split(",")[1]];
  });
  const coords=[
    [.52,.09],
    [.23,.16],[.77,.15],
    [.17,.27],[.84,.27],
    [.16,.34],[.85,.34],
    [.15,.45],[.84,.44],
    [.13,.57],[.86,.56],
    [.17,.67],[.81,.66],
    [.26,.82],[.75,.83],
    [.36,.90],[.69,.90],
    [.53,.94],
  ] as const;
  const sideLabels=["source","output"] as const;
  for(const side of sideLabels){
    await page.getByLabel(side+" local image").setInputFiles({
      name:side+"-synthetic-native.png",mimeType:"image/png",
      buffer:Buffer.from(imageData[side==="source"?0:1],"base64"),
    });
    const section=page.locator('[data-km-head-photo-side="'+side+'"]');
    const overlay=section.locator("[data-km-head-photo-overlay]");
    await expect(overlay).toBeVisible();
    const bound=await overlay.boundingBox();
    expect(bound).not.toBeNull();
    for(let i=0;i<coords.length;i++){
      const [sx,sy]=coords[i];
      // Independent output annotations intentionally differ from source:
      // this is a negative geometry control, not photo-derived art.
      const x=(side==="output"?.50+1.07*(sx-.50):sx);
      await overlay.click({position:{
        x:bound!.width*x,y:bound!.height*sy,
      }});
    }
    await expect(section.locator("[data-km-annotated-contour]")).toHaveCount(18);
  }
  await expect(review).toHaveAttribute("data-km-contour-review-state","review-needed");
  await expect(review.locator("[data-km-head-contour-numeric-audit]"))
    .toContainText("18-point RMS");
  const measured=review.locator("[data-km-head-contour-difference]");
  await expect(measured).toHaveCount(5);
  const selected=page.getByLabel("Source/render contour vector scope");
  await selected.selectOption("all");
  await expect(measured).toHaveCount(18);
  await expect(review.locator("[data-km-head-contour-vectors] image"))
    .toHaveCount(0);
  const native=review.locator("img");
  expect(await native.getAttribute("src")).toMatch(/^blob:/);
  await expect(review.locator("[data-km-head-contour-ranked] li")).toHaveCount(5);
  await selected.selectOption("none");
  await expect(measured).toHaveCount(0);
  await selected.selectOption("worst-five");
  await expect(measured).toHaveCount(5);
  await expect(review).toContainText("ART HOLD");
  await page.screenshot({
    path:info.outputPath("pencil-stage1-two-sided-contour-difference.png"),
    fullPage:true,animations:"disabled",
  });
  // Image replacement can never show stale mismatches or retain false
  // evidence. Only the replaced source annotations are cleared.
  await page.getByLabel("source local image").setInputFiles({
    name:"replaced-source-synthetic.png",mimeType:"image/png",
    buffer:Buffer.from(imageData[0],"base64"),
  });
  await expect(review).toHaveAttribute("data-km-contour-review-state","incomplete");
  await expect(measured).toHaveCount(0);
  await expect(page.locator('[data-km-head-photo-side="output"] '+
    '[data-km-annotated-contour]')).toHaveCount(18);
});
