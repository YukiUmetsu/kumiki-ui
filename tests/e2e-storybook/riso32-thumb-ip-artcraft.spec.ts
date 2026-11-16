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
      // RISO37: four independent truly drawn MCP curves and moving nail
      // outlines on the original real cobalt ink path, not raster highlights.
      const mcp=panel.locator('[data-km-riso-part$="-glove-knuckle-arc"]');
      await expect(mcp).toHaveCount(1);
      const mcpInk=await mcp.getAttribute("d");
      expect((mcpInk?.match(/M/g)??[]).length).toBe(4);
      const nails=panel.locator('[data-km-riso-part$="-nail"]');
      await expect(nails).toHaveCount(5);
      for(const n of await nails.all()){
        const d=await n.getAttribute("d");
        expect((d?.match(/M/g)??[]).length).toBeGreaterThanOrEqual(2);
      }

      // The hand-only print must use the SAME actual paper knockout already
      // authored for the full moving actor: otherwise the blue forearm shows
      // through the red glove as a broad black wrist band.
      const handId=await panel.getAttribute("data-km-riso30-hand");
      const pieces=handId?.split("-")??[];
      const side=pieces[pieces.length-1];
      expect(["left","right"]).toContain(side);
      await expect(panel.locator('[data-km-riso-knockout-part="'+side+'-wrist-underprint-clearance"]')).toHaveCount(1);
      await expect(panel.locator('[data-km-riso-paper-clearance="'+side+'-wrist-underprint-clearance"]').first()).toBeAttached();
      expect(Number(await panel.getAttribute("data-km-riso30-crop-margin"))).toBeGreaterThan(0);
      // Measured physically printable RED SVG silhouettes, not only rig axes.
      await expect(panel).toHaveAttribute("data-km-riso36-source-contours","12");
      const actualInkGap=Number(await panel.getAttribute("data-km-riso36-minimum-distal-ink-gap"));
      const crossInkContacts=Number(await panel.getAttribute("data-km-riso36-ink-contacts"));
      expect(Number.isFinite(actualInkGap)).toBe(true);
      expect(actualInkGap).toBeGreaterThanOrEqual(0);
      expect(crossInkContacts).toBeGreaterThanOrEqual(0);
      expect(crossInkContacts).toBeLessThanOrEqual(27);
      // RISO39 actual source FK/IK thumb-index distance. A visual grip
      // requires the printed tips to approach; source existence alone does
      // not imply paper pressure or three-quarter anatomical contact.
      const opposedGap=Number(await panel.getAttribute("data-km-riso39-thumb-index-tip-gap"));
      const padInkGap=Number(await panel.getAttribute("data-km-riso39-thumb-index-ink-gap"));
      expect(Number.isFinite(opposedGap)).toBe(true);
      expect(Number.isFinite(padInkGap)).toBe(true);
      expect(opposedGap).toBeGreaterThan(0);
      expect(padInkGap).toBeGreaterThanOrEqual(0);
      const panelId=await panel.getAttribute("data-km-riso30-hand");
      if((frame===160&&panelId==="courier-right")||
         (frame===166&&panelId==="paper-artist-left"))expect(opposedGap).toBeLessThan(12);
      // RISO41 source-red pad contact: require a real opposed print gap
      // at its peak without faking proximity by shifting a paper overlay.
      const realGap=Number(await panel.getAttribute("data-km-riso41-actual-red-pad-gap"));
      const paperPressure=Number(await panel.getAttribute("data-km-riso41-press-ink"));
      expect(realGap).toBeCloseTo(padInkGap,3);
      expect(paperPressure).toBeGreaterThanOrEqual(0);
      expect(paperPressure).toBeLessThanOrEqual(1);
      if((frame===160&&panelId==="courier-right")||
        (frame===166&&panelId==="paper-artist-left")){
        expect(realGap).toBeLessThan(1.5);
        expect(paperPressure).toBeGreaterThan(0);
      }
      const measured=Number(await panel.getAttribute("data-km-riso33-minimum-axis-gap"));
      expect(Number.isFinite(measured)).toBe(true);
      if(frame===160||frame===166){
        expect(measured).toBeGreaterThan(3);
        await expect(panel).toHaveAttribute("data-km-riso33-axis-intersections","0");
      }
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
