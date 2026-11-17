import {test,expect} from "@playwright/test";

test("RISO77 real printed-paper rostrum on twos: original ink masters, paper lip/shadows, physical lamp and camera, portrait and reduced-motion",
async({page},info)=>{
  test.setTimeout(135000);
  const errors:string[]=[];
  page.on("pageerror",e=>errors.push(e.message));
  await page.setViewportSize({width:1510,height:1260});
  await page.goto("/iframe.html?id=video-riso-print-lab--risograph-kinetic-rostrum&viewMode=story");
  const studio=page.locator("[data-km-riso77-studio]");
  await expect(studio).toBeVisible();
  await expect(studio).toHaveAttribute("data-km-riso77-frame","113");
  await expect(studio).toHaveAttribute("data-km-riso77-scene","mounting");
  await expect(studio).toHaveAttribute("data-km-riso77-exposure","2");
  const rostrum=studio.locator("[data-km-riso77-rostrum]");
  await expect(rostrum).toBeVisible();
  await expect(rostrum).toHaveAttribute("data-km-riso77-paper-planes","3");
  await expect(rostrum.locator("[data-km-riso-print]")).toHaveCount(4);
  await expect(rostrum.locator("[data-km-riso77-original-paper-outline]")).toHaveCount(3);
  await expect(rostrum.locator("[data-km-riso77-cast-shadow]")).toHaveCount(3);
  await expect(rostrum.locator("[data-km-riso77-paper-edge]")).toHaveCount(3);
  await expect(rostrum.locator("[data-km-riso75-fibre-master]")).toHaveCount(8);
  const mount=rostrum.locator('[data-km-riso77-plane="river-ring-window"]');
  const base=rostrum.locator('[data-km-riso77-unchanged-base] [data-km-riso-print]');
  const originalBase=await base.evaluate(el=>el.outerHTML);
  const originalInk=await mount.locator('[data-km-riso77-printed-cutout] [data-km-riso-print]')
    .evaluate(el=>el.outerHTML);
  await studio.screenshot({
    path:info.outputPath("riso77-1x-authored-print-cutout-rostrum-with-paper-lift.png"),
    animations:"disabled",
  });
  await studio.getByRole("combobox",{name:"RISO77 paper microscope zoom"})
    .selectOption("3");
  await expect(studio).toHaveAttribute("data-km-riso77-zoom","3");
  await studio.screenshot({
    path:info.outputPath("riso77-3x-scissor-edge-light-rostrum-shadow-and-original-ink.png"),
    animations:"disabled",
  });
  // Camera magnification never reprints ink dots or paper fibres.
  expect(await base.evaluate(el=>el.outerHTML)).toBe(originalBase);
  expect(await mount.locator('[data-km-riso77-printed-cutout] [data-km-riso-print]')
    .evaluate(el=>el.outerHTML)).toBe(originalInk);
  await studio.getByRole("combobox",{name:"RISO77 paper microscope zoom"})
    .selectOption("1");
  await studio.getByRole("slider",{name:"RISO77 source frame"}).focus();
  await studio.getByRole("slider",{name:"RISO77 source frame"}).press("ArrowLeft");
  await expect(studio).toHaveAttribute("data-km-riso77-frame","112");
  const pose112=await mount.getAttribute("transform");
  const sample112=await mount.getAttribute("data-km-riso77-exposed-frame");
  await studio.getByRole("slider",{name:"RISO77 source frame"}).press("ArrowRight");
  await expect(studio).toHaveAttribute("data-km-riso77-frame","113");
  await expect(mount).toHaveAttribute("transform",pose112!);
  await expect(mount).toHaveAttribute("data-km-riso77-exposed-frame",sample112!);
  await studio.getByRole("slider",{name:"RISO77 source frame"}).press("ArrowRight");
  await expect(studio).toHaveAttribute("data-km-riso77-frame","114");
  expect(await mount.getAttribute("transform")).not.toBe(pose112);
  // Same material across frames: no regenerated spots, paper grain or source SVG.
  expect(await base.evaluate(el=>el.outerHTML)).toBe(originalBase);
  expect(await mount.locator('[data-km-riso77-printed-cutout] [data-km-riso-print]')
    .evaluate(el=>el.outerHTML)).toBe(originalInk);
  const beforeLamp=await mount.getAttribute("transform");
  const beforeShadow=await mount.locator("[data-km-riso77-cast-shadow]")
    .getAttribute("transform");
  await studio.getByRole("slider",{name:"RISO77 lamp X"}).focus();
  await studio.getByRole("slider",{name:"RISO77 lamp X"}).press("Home");
  await expect(mount).toHaveAttribute("transform",beforeLamp!);
  expect(await mount.locator("[data-km-riso77-cast-shadow]")
    .getAttribute("transform")).not.toBe(beforeShadow);
  const beforeCamera=await mount.getAttribute("transform");
  await studio.getByRole("slider",{name:"RISO77 camera track X"}).focus();
  await studio.getByRole("slider",{name:"RISO77 camera track X"}).press("End");
  expect(await mount.getAttribute("transform")).not.toBe(beforeCamera);
  await studio.getByRole("combobox",{name:"RISO77 stop motion exposure"})
    .selectOption("4");
  await expect(studio).toHaveAttribute("data-km-riso77-exposure","4");
  await studio.getByRole("combobox",{name:"RISO77 film aspect"})
    .selectOption("portrait");
  await studio.getByRole("button",{name:"Rostrum midpoint"}).click();
  await expect(studio).toHaveAttribute("data-km-riso77-aspect","portrait");
  await expect(studio.locator("[data-km-riso77-rostrum]")).toBeVisible();
  await expect(studio.locator("[data-km-riso77-plane]")).toHaveCount(3);
  await studio.screenshot({
    path:info.outputPath("riso77-portrait-original-spot-ink-paper-rostrum-full-page.png"),
    animations:"disabled",
  });
  await studio.getByRole("slider",{name:"RISO77 source frame"}).focus();
  await studio.getByRole("slider",{name:"RISO77 source frame"}).press("Home");
  await expect(studio).toHaveAttribute("data-km-riso77-frame","0");
  await expect(studio).toHaveAttribute("data-km-riso77-scene","original");
  await expect(studio.locator("[data-km-riso77-rostrum]")).toHaveCount(0);
  await expect(studio.locator("[data-km-riso-print]")).toHaveCount(1);
  await studio.getByRole("slider",{name:"RISO77 source frame"}).press("End");
  await expect(studio).toHaveAttribute("data-km-riso77-frame","251");
  await expect(studio).toHaveAttribute("data-km-riso77-scene","completed");
  await expect(studio.locator("[data-km-riso77-rostrum]")).toBeVisible();
  for(const layer of await studio.locator("[data-km-riso77-plane]").all())
    await expect(layer).toHaveAttribute("data-km-riso77-layer-progress","1");
  await studio.getByRole("button",{name:"Rostrum midpoint"}).click();
  await studio.getByRole("checkbox",{name:"RISO77 reduced motion"}).check();
  await expect(studio).toHaveAttribute("data-km-riso77-reduced","true");
  for(const layer of await studio.locator("[data-km-riso77-plane]").all())
    await expect(layer).toHaveAttribute("data-km-riso77-layer-progress","1");
  expect(errors).toEqual([]);
});
