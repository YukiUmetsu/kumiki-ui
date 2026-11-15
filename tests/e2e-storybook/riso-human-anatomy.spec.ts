import {test,expect} from "@playwright/test";

/** Inspect actual FK/IK anatomy in all four expression poses, not mockup PNGs. */
test("RISO13 four-pose human anatomy sheet and calibrated preview controls",async({page},info)=>{
  const pageErrors:string[]=[],consoleErrors:string[]=[];
  page.on("pageerror",e=>pageErrors.push(e.message));
  page.on("console",m=>{if(m.type()==="error")consoleErrors.push(m.text());});
  await page.setViewportSize({width:1700,height:1400});
  await page.goto("/iframe.html?id=video-riso-artcraft-studies--courier-human-anatomy&viewMode=story");
  await page.evaluate(()=>document.fonts.ready);
  const root=page.locator("#storybook-root");
  await expect(root.locator("[data-km-riso-anatomy-pose]")).toHaveCount(4);
  for(const frame of [46,78,160,198]){
    const pose=root.locator(`[data-km-riso-anatomy-pose="${frame}"]`);
    await expect(pose.locator("[data-km-riso-anatomy-crop]")).toHaveCount(2);
    for(const digit of ["index","middle","ring","thumb"]){
      await expect(pose.locator(`[data-km-riso-part="right-glove-${digit}"]`)).toHaveCount(1);
    }
    await expect(pose.locator('[data-km-riso-part="eye-upper-lid-folds"]')).toHaveCount(1);
    await expect(pose.locator('[data-km-riso-part="nose-bridge-plane"]')).toHaveCount(1);
    await pose.screenshot({path:info.outputPath("human-anatomy-pose-"+frame+".png"),
      animations:"disabled"});
  }
  const ink=page.getByRole("combobox",{name:"RISO anatomy ink plate"});
  await ink.selectOption("blue");
  await expect(root.locator("[data-km-riso-anatomy-plate=red]")).toHaveCount(0);
  await expect(root.locator("[data-km-riso-anatomy-plate=blue]")).toHaveCount(8);
  await ink.selectOption("red");
  await expect(root.locator("[data-km-riso-anatomy-plate=blue]")).toHaveCount(0);
  await expect(root.locator("[data-km-riso-anatomy-plate=red]")).toHaveCount(8);
  await ink.selectOption("both");
  await page.getByRole("checkbox",{name:"RISO anatomy show region outlines"}).check();
  await expect(root.locator("[data-km-riso-anatomy-outline]").first()).toBeVisible();
  await root.screenshot({path:info.outputPath("human-anatomy-construction-mesh.png"),
    animations:"disabled"});
  await page.getByRole("checkbox",{name:"RISO anatomy show region outlines"}).uncheck();
  const density=page.getByRole("slider",{name:"RISO anatomy dot density"});
  await density.evaluate(node=>{
    const input=node as HTMLInputElement;
    const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")?.set;
    if(!setter)throw new Error("Native range setter unavailable");
    setter.call(input,"1.4");
    input.dispatchEvent(new Event("input",{bubbles:true}));
    input.dispatchEvent(new Event("change",{bubbles:true}));
  });
  await expect(page.getByText("Dot density · 1.40×")).toBeVisible();
  await root.screenshot({path:info.outputPath("human-anatomy-ink-density.png"),
    animations:"disabled"});
  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
