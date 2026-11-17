import {expect,test} from "@playwright/test";

test("ArtCraft source-led 3/4 skull reprofiling A/B retains all 92 dry-pencil traces in native film",async({page},info)=>{
  await page.goto("/iframe.html?id=video-colored-pencil-science--drawing-foundation&viewMode=story");
  const studio=page.locator("[data-km-foundation-studio]");
  const svg=page.locator("svg[data-km-colored-pencil]");
  await page.getByRole("combobox",{name:"Foundation subject"}).selectOption("portrait");
  const option=page.getByRole("checkbox",{
    name:"Foundation three-quarter skull reconstruction",
  });
  await expect(option).not.toBeChecked();
  await expect(studio).toHaveAttribute("data-km-skull-silhouette-study","baseline");
  await expect(page.locator("[data-km-head-source-proof]"))
    .toHaveAttribute("data-km-head-source-fidelity","blocked");
  await expect(page.getByRole("checkbox",{name:"Foundation head contour contacts"}))
    .toBeChecked();
  await expect(page.getByRole("checkbox",{name:"Foundation head cranial optical volume"}))
    .toBeChecked();
  const head=svg.locator('[data-km-pencil-region="head-silhouette-01"]');
  for(const aspect of ["landscape","portrait"] as const){
    await page.getByRole("combobox",{name:"Foundation aspect"})
      .selectOption(aspect);
    const expected=aspect==="landscape"?"0 0 960 540":"0 0 540 960";
    await expect(svg).toHaveAttribute("viewBox",expected);
    await expect(head).toHaveCount(1);
    const previousPath=await head.locator('[data-km-graphite] path')
      .first().getAttribute("d");
    const baseline=await svg.screenshot({
      animations:"disabled",
      path:info.outputPath("pencil-head-"+aspect+"-original-17deg.png"),
    });
    await option.check();
    await expect(studio).toHaveAttribute("data-km-skull-silhouette-study","oblique");
    const studyPath=await head.locator('[data-km-graphite] path')
      .first().getAttribute("d");
    expect(studyPath).not.toEqual(previousPath);
    await expect(svg.locator('[data-km-pencil-trace^="newhead-cranium-"]'))
      .toHaveCount(15);
    await expect(svg.locator('[data-km-pencil-trace^="newhead-anat1-"]'))
      .toHaveCount(15);
    await expect(svg.locator('[data-km-pencil-trace^="newhead-value-"]'))
      .toHaveCount(3);
    await expect(svg.locator("image,foreignObject,feImage")).toHaveCount(0);
    const revised=await svg.screenshot({
      animations:"disabled",
      path:info.outputPath("pencil-head-"+aspect+"-3quarter-skull.png"),
    });
    expect(revised.equals(baseline)).toBe(false);
    await option.uncheck();
    await expect(studio).toHaveAttribute("data-km-skull-silhouette-study","baseline");
    await expect(head.locator('[data-km-graphite] path').first())
      .toHaveAttribute("d",previousPath!);
    expect((await svg.screenshot({animations:"disabled"})).equals(baseline))
      .toBe(true);
  }
  await page.getByRole("combobox",{name:"Foundation subject"})
    .selectOption("fox");
  await expect(studio).toHaveAttribute("data-km-skull-silhouette-study","not-applicable");
  await expect(option).toHaveCount(0);
});
