import {test,expect} from "@playwright/test";

/** Native 1× and enlarged *source SVG* proof. The final-frame screenshots
 * are candidates for independent visual critique, not artist approval. */
test("RISO46 real red thenar and cobalt web print through both physical masters",async({page},info)=>{
  const errors:string[]=[];
  page.on("pageerror",e=>errors.push(e.message));
  await page.setViewportSize({width:1600,height:1160});
  await page.goto("/iframe.html?id=video-riso-artcraft-studies--human-hand-anatomy-print&viewMode=story");
  await page.evaluate(()=>document.fonts.ready);
  const root=page.locator("[data-km-riso30-hands-story]");
  await expect(root).toBeVisible();
  const panels=root.locator("[data-km-riso30-hand]");
  await expect(panels).toHaveCount(2);
  const pose=page.getByRole("combobox",{name:"RISO30 gesture frame"});
  const ink=page.getByRole("combobox",{name:"RISO30 ink plate"});
  for(const frame of [144,154,156,160,166]){
    await pose.selectOption(String(frame));
    await expect(root).toHaveAttribute("data-km-riso30-frame",String(frame));
    for(const panel of await panels.all()){
      const red=panel.locator('[data-km-riso-part$="-glove-thenar-plane"]');
      const blue=panel.locator('[data-km-riso-part$="-glove-thenar-fold"]');
      await expect(red).toHaveCount(1);
      await expect(blue).toHaveCount(1);
      const redD=await red.getAttribute("d");
      const blueD=await blue.getAttribute("d");
      expect(redD?.match(/M/g)?.length).toBeGreaterThanOrEqual(3);
      expect(redD?.match(/C/g)?.length).toBeGreaterThanOrEqual(11);
      expect(blueD?.match(/M/g)?.length).toBeGreaterThanOrEqual(5);
      expect(blueD?.match(/C/g)?.length).toBeGreaterThanOrEqual(7);
      await expect(panel).toHaveAttribute("data-km-riso32-ip-articulated","true");
      await expect(panel).toHaveAttribute("data-km-riso36-source-contours","12");
    }
    await root.screenshot({path:info.outputPath("riso46-native-two-actor-web-"+frame+".png"),animations:"disabled"});
  }
  await pose.selectOption("160");
  for(const mode of ["red","blue","both"] as const){
    await ink.selectOption(mode);
    await expect(root).toHaveAttribute("data-km-riso30-ink",mode);
    await root.screenshot({path:info.outputPath("riso46-native-"+mode+"-master-160.png"),animations:"disabled"});
  }
  await page.getByRole("slider",{name:/RISO30 source zoom/}).fill("7.4");
  await root.screenshot({path:info.outputPath("riso46-native-micro-zoom-160.png"),animations:"disabled"});
  await page.getByRole("checkbox",{name:"RISO30 compare opposite hands"}).check();
  await expect(root.locator('[data-km-riso30-hand="courier-left"]')).toHaveCount(1);
  await expect(root.locator('[data-km-riso30-hand="paper-artist-right"]')).toHaveCount(1);
  await root.screenshot({path:info.outputPath("riso46-native-opposite-hands-160.png"),animations:"disabled"});
  expect(errors).toEqual([]);
});
