import {expect,test} from "@playwright/test";

test("ArtCraft human #01 native 16:9 and 9:16 head-only optical value A/B",async({page},info)=>{
  await page.goto("/iframe.html?id=video-colored-pencil-science--drawing-foundation&viewMode=story");
  const studio=page.locator("[data-km-foundation-studio]");
  const svg=page.locator("svg[data-km-colored-pencil]");
  const subject=page.getByRole("combobox",{name:"Foundation subject"});
  const aspect=page.getByRole("combobox",{name:"Foundation aspect"});
  const weave=page.getByRole("checkbox",{name:"Foundation head cranial optical volume"});
  await subject.selectOption("portrait");
  await expect(studio).toHaveAttribute("data-km-head-cranial-volume","on");
  await expect(page.locator("[data-km-head-source-proof]"))
    .toHaveAttribute("data-km-head-source-fidelity","blocked");
  await expect(svg).toHaveAttribute("data-km-pencil-foundation","CP-F1");
  await expect(svg.locator("[data-km-pencil-craft-base]")).toHaveCount(0);
  const volume=svg.locator('[data-km-pencil-trace^="newhead-cranium-"]');
  const outline=svg.locator('[data-km-pencil-region="head-silhouette-01"]');
  await expect(outline).toHaveCount(1);
  for(const format of ["landscape","portrait"] as const){
    await aspect.selectOption(format);
    await expect(volume).toHaveCount(15);
    const before=await outline.locator("[data-km-graphite] path").first()
      .getAttribute("d");
    expect(before?.length).toBeGreaterThan(150);
    const full=await svg.screenshot({animations:"disabled",
      path:info.outputPath("pencil-head-"+format+"-cranial-weave.png")});
    // The baseline remains independent evidence of the rejected art.
    await weave.uncheck();
    await expect(studio).toHaveAttribute("data-km-head-cranial-volume","off");
    await expect(volume).toHaveCount(0);
    await expect(outline.locator("[data-km-graphite] path").first())
      .toHaveAttribute("d",before!);
    const bare=await svg.screenshot({animations:"disabled",
      path:info.outputPath("pencil-head-"+format+"-previous-light-mass.png")});
    expect(bare).not.toEqual(full);
    await weave.check();
    await expect(volume).toHaveCount(15);
    expect(await svg.screenshot({animations:"disabled"})).toEqual(full);
    await expect(svg.locator("image,foreignObject,feImage")).toHaveCount(0);
    await expect(page.locator("[data-km-head-source-proof]"))
      .toHaveAttribute("data-km-head-source-photo","none");
  }
  await aspect.selectOption("landscape");
  await page.getByRole("combobox",{name:"Foundation ANAT1 value band"})
    .selectOption("core-shadow");
  const visible=svg.locator('[data-km-pencil-trace^="newhead-anat1-core-shadow-"]');
  await expect(visible).toHaveCount(3);
  // Value isolate hides ALL other families for unbiased original ANAT1 QA;
  // it must not silently swap to another character or source image.
  await expect(volume).toHaveCount(0);
  await expect(outline).toHaveCount(1);
  await expect(studio).toHaveAttribute("data-km-head-cranial-volume","on");
});
