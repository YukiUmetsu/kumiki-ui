import {test,expect} from "@playwright/test";

/** Read the actual source curves painted in two native RisoPrint drums.
 * A green test is not a photographic anatomy approval. */
test("RISO60 accessible negative-space inspection follows both real hands and opt-in RISO59 source",async({page},info)=>{
  const errors:string[]=[];
  page.on("pageerror",e=>errors.push(e.message));
  await page.setViewportSize({width:1600,height:1250});
  await page.goto("/iframe.html?id=video-riso-artcraft-studies--human-hand-anatomy-print&viewMode=story");
  const root=page.locator("[data-km-riso30-hands-story]");
  await expect(root).toBeVisible();
  const frame=page.getByRole("combobox",{name:"RISO30 gesture frame"});
  const plate=page.getByRole("combobox",{name:"RISO30 ink plate"});
  const preview=page.getByRole("checkbox",{name:"RISO59 preview original joined skin"});
  const courier=root.locator('[data-km-riso30-hand="courier-right"]');
  const artist=root.locator('[data-km-riso30-hand="paper-artist-left"]');
  for(const panel of [courier,artist]){
    await expect(panel).toHaveAttribute("data-km-riso60-web-count","2");
    const report=panel.locator("[data-km-riso60-report]");
    await report.locator("summary").click();
    await expect(report).toHaveAttribute("open","");
    await expect(report.locator("[data-km-riso60-web]")).toHaveCount(2);
    await expect(report).toContainText("Artist review required");
  }
  await frame.selectOption("0");
  for(const panel of [courier,artist])
    await expect(panel).toHaveAttribute("data-km-riso60-web-states","unprinted-rest,unprinted-rest");
  await frame.selectOption("160");
  const before=await courier.getAttribute("data-km-riso60-positive-area");
  expect(Number(before)).toBeGreaterThan(50);
  for(const panel of [courier,artist])
    await expect(panel).not.toHaveAttribute("data-km-riso60-web-states","unprinted-rest,unprinted-rest");
  await courier.screenshot({path:info.outputPath("riso60-original-native-qa-courier-f160.png"),animations:"disabled"});
  await preview.check();
  await expect(root).toHaveAttribute("data-km-riso59-preview","true");
  await expect(courier).toHaveAttribute("data-km-riso60-web-count","2");
  await courier.screenshot({path:info.outputPath("riso60-candidate-native-qa-courier-f160.png"),animations:"disabled"});
  await artist.screenshot({path:info.outputPath("riso60-candidate-native-qa-artist-f160.png"),animations:"disabled"});
  for(const mode of ["red","blue","both"] as const){
    await plate.selectOption(mode);
    await expect(root).toHaveAttribute("data-km-riso30-ink",mode);
    await expect(courier).toHaveAttribute("data-km-riso60-web-count","2");
  }
  await preview.uncheck();
  await expect(courier).toHaveAttribute("data-km-riso60-positive-area",before!);
  await expect(errors).toEqual([]);
});
