import {test,expect} from "@playwright/test";

/** Native Chromium proof on actual production SVG stencil masters in the
 * existing Storybook folder: two independently rigged illustrated humans. */
test("RISO32 moving thumb IP remains attached at contact, release and both ink masters",async({page},info)=>{
  const errors:string[]=[];
  page.on("pageerror",e=>errors.push(e.message));
  await page.setViewportSize({width:1600,height:1100});
  await page.goto("/iframe.html?id=video-riso-artcraft-studies--human-hand-anatomy-print&viewMode=story");
  await page.evaluate(()=>document.fonts.ready);
  const root=page.locator("[data-km-riso30-hands-story]");
  await expect(root).toBeVisible();
  const panels=root.locator("[data-km-riso30-hand]");
  await expect(panels).toHaveCount(2);
  const pose=page.getByRole("combobox",{name:"RISO30 gesture frame"});
  const ink=page.getByRole("combobox",{name:"RISO30 ink plate"});
  const stages=[0,46,126,160,166,178,186,198,239];
  for(const frame of stages){
    await pose.selectOption(String(frame));
    await expect(root).toHaveAttribute("data-km-riso30-frame",String(frame));
    for(const panel of await panels.all()){
      await expect(panel).toHaveAttribute("data-km-riso32-ip-articulated","true");
      const grip=Number(await panel.getAttribute("data-km-riso32-ip-flexion"));
      expect(Number.isFinite(grip)).toBe(true);
      expect(Math.abs(grip)).toBeLessThan(20);
      const svg=panel.locator("svg").first();
      await expect(svg).toBeVisible();
      await expect(panel.locator("[data-km-riso-part$='glove-thumb-distal-phalanx']")).toHaveCount(1);
      expect(Number(await panel.getAttribute("data-km-riso30-crop-margin"))).toBeGreaterThan(0);
    }
    if([0,160,166,186,198].includes(frame))
      await root.screenshot({path:info.outputPath("riso32-two-original-hands-"+frame+".png"),animations:"disabled"});
  }
  await pose.selectOption("160");
  await ink.selectOption("red");
  await expect(root).toHaveAttribute("data-km-riso30-ink","red");
  await root.screenshot({path:info.outputPath("riso32-physical-red-master.png"),animations:"disabled"});
  await ink.selectOption("blue");
  await expect(root).toHaveAttribute("data-km-riso30-ink","blue");
  await root.screenshot({path:info.outputPath("riso32-physical-blue-master.png"),animations:"disabled"});
  await ink.selectOption("both");
  await page.getByRole("checkbox",{name:"RISO30 compare opposite hands"}).check();
  await expect(root.locator("[data-km-riso30-hand='courier-left']")).toHaveCount(1);
  await expect(root.locator("[data-km-riso30-hand='paper-artist-right']")).toHaveCount(1);
  for(const panel of await panels.all())
    await expect(panel).toHaveAttribute("data-km-riso32-ip-articulated","true");
  await root.screenshot({path:info.outputPath("riso32-opposite-thumb-comparison.png"),animations:"disabled"});
  expect(errors).toEqual([]);
});
