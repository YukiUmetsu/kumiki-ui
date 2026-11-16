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
      expect(redD?.match(/C/g)?.length).toBeGreaterThanOrEqual(10);
      expect(blueD?.match(/M/g)?.length).toBeGreaterThanOrEqual(5);
      expect(blueD?.match(/C/g)?.length).toBeGreaterThanOrEqual(7);
      await expect(panel).toHaveAttribute("data-km-riso32-ip-articulated","true");
      await expect(panel).toHaveAttribute("data-km-riso36-source-contours","12");
      await expect(panel).toHaveAttribute("data-km-riso50-source-mcp-planes","4");
      await expect(panel).toHaveAttribute("data-km-riso50-palm-cubics","16");
      const id=await panel.getAttribute("data-km-riso30-hand");
      const isHandoff=id==="courier-right"||id==="paper-artist-left";
      await expect(panel).toHaveAttribute("data-km-riso51-live-source-morph-parts",isHandoff?"14":"0");
      await expect(panel).toHaveAttribute("data-km-riso52-cobalt-red-terminal-pairs",isHandoff?"3":"0");
      // Counts the genuinely time-conditioned original print RED distal
      // vectors, not a drawn sticker or hard-coded display label.
      await expect(panel).toHaveAttribute(
        "data-km-riso55-folded-source-tip-count",
        isHandoff&&frame>146?"3":"0");
      await expect(panel).toHaveAttribute("data-km-riso53-original-red-support-behind-palm",isHandoff?"9":"0");
      await expect(panel).toHaveAttribute("data-km-riso54-native-web-reserves",isHandoff?"2":"0");
      await expect(panel).toHaveAttribute("data-km-riso54-moving-web-cubics",isHandoff?"8":"0");
      if(isHandoff){
        const side=id==="courier-right"?"right":"left";
        for(const valley of ["middle-ring","ring-pinky"]){
          // This is the original per-plate SVG knockout source, not an RGB
          // paper-colored sticker or a red-on-red painter order assertion.
          await expect(panel.locator('[data-km-riso-paper-clearance="'+side+
            '-glove-web-reserve-'+valley+'"]').first()).toBeAttached();
        }
      }
      await expect(panel).toHaveAttribute("data-km-riso51-palm-projected",
        String(isHandoff&&frame>146));
      const ratio=Number(await panel.getAttribute("data-km-riso49-support-projection-ratio"));
      expect(Number.isFinite(ratio)).toBe(true);
      if(frame===160){
        const hand=await panel.getAttribute("data-km-riso30-hand");
        // Real original actor source projection, verified in Chromium.
        if(hand==="courier-right"||hand==="paper-artist-left"){
          // RISO54: actual 3/4 side ray projects 2D support axes to
          // ~40% of clinical bone length. All 12 original red moving
          // bones/nails and strict 3-unit spacing remain verified.
          expect(ratio).toBeLessThan(.49);
          expect(ratio).toBeGreaterThan(.385);
          const rays=Number(await panel.getAttribute("data-km-riso54-mean-source-camera-ray-deg"));
          expect(rays).toBeGreaterThan(62);
          expect(rays).toBeLessThan(68);
        }
      }
    }
    await root.screenshot({path:info.outputPath("riso46-native-two-actor-web-"+frame+".png"),animations:"disabled"});
  }
  await pose.selectOption("160");
  for(const mode of ["red","blue","both"] as const){
    await ink.selectOption(mode);
    await expect(root).toHaveAttribute("data-km-riso30-ink",mode);
    await root.screenshot({path:info.outputPath("riso46-native-"+mode+"-master-160.png"),animations:"disabled"});
  }
  await page.getByRole("slider",{name:"RISO30 source zoom"}).evaluate(node=>{
    const input=node as HTMLInputElement;
    const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")?.set;
    if(!setter)throw new Error("Missing native range setter");
    setter.call(input,"7.4");
    input.dispatchEvent(new Event("input",{bubbles:true}));
    input.dispatchEvent(new Event("change",{bubbles:true}));
  });
  await root.screenshot({path:info.outputPath("riso46-native-micro-zoom-160.png"),animations:"disabled"});
  await page.getByRole("checkbox",{name:"RISO30 compare opposite hands"}).check();
  await expect(root.locator('[data-km-riso30-hand="courier-left"]')).toHaveCount(1);
  await expect(root.locator('[data-km-riso30-hand="paper-artist-right"]')).toHaveCount(1);
  await root.screenshot({path:info.outputPath("riso46-native-opposite-hands-160.png"),animations:"disabled"});
  expect(errors).toEqual([]);
});
