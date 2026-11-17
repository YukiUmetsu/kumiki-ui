import {test,expect} from "@playwright/test";

test("RISO75 two-drum native ink contact retains the authored moving brush contours and paper-latched pore geometry",
async({page},info)=>{
  test.setTimeout(130000);
  const errors:string[]=[];
  page.on("pageerror",error=>errors.push(error.message));
  await page.setViewportSize({width:1500,height:1230});
  await page.goto("/iframe.html?id=video-riso-print-lab--risograph-drum-contact&viewMode=story");
  const root=page.locator("[data-km-riso75-atelier]");
  await expect(root).toBeVisible();
  await expect(root).toHaveAttribute("data-km-riso75-frame","160");
  const before=root.locator('[data-km-riso75-pressure-panel="source"]');
  const after=root.locator('[data-km-riso75-pressure-panel="contact"]');
  await expect(before.locator("[data-km-riso-print]")).toHaveCount(1);
  await expect(after.locator("[data-km-riso-print]")).toHaveCount(1);
  await expect(before.locator("[data-km-riso75-streak]")).toHaveCount(0);
  await expect(after.locator("[data-km-riso75-streak]")).toHaveCount(224);
  await expect(after.locator("[data-km-riso75-fibre-master]")).toHaveCount(2);
  await expect(after.locator("[data-km-riso75-pore-master]")).toHaveCount(2);
  const sourceBrush=before.locator("[data-km-riso62-original-curve]");
  const contactBrush=after.locator("[data-km-riso62-original-curve]");
  await expect(sourceBrush).toHaveCount(20);
  await expect(contactBrush).toHaveCount(20);
  const original=await sourceBrush.evaluateAll(items=>items.map(el=>el.outerHTML));
  expect(await contactBrush.evaluateAll(items=>items.map(el=>el.outerHTML)))
    .toEqual(original);
  const firstStreak=after.locator('[data-km-riso75-fibre-master="blue"] [data-km-riso75-streak="l0-f0"]');
  const originalStreak=await firstStreak.getAttribute("d");
  await root.screenshot({
    path:info.outputPath("riso75-full-two-ink-contact-baseline-vs-pressure-1x.png"),
    animations:"disabled",
  });
  await root.getByRole("combobox",{name:"RISO75 microscope zoom"}).selectOption("3");
  await expect(root).toHaveAttribute("data-km-riso75-zoom","3");
  await root.screenshot({
    path:info.outputPath("riso75-3x-original-dry-fibre-contact-pressure-detail.png"),
    animations:"disabled",
  });
  await root.getByRole("slider",{name:"RISO75 original source film frame"}).focus();
  await root.getByRole("slider",{name:"RISO75 original source film frame"}).press("Home");
  await expect(root).toHaveAttribute("data-km-riso75-frame","0");
  await expect(firstStreak).toHaveAttribute("d",originalStreak!);
  const frame0=await sourceBrush.first().evaluate(el=>el.outerHTML);
  // Source gestures are intentionally periodic: frame 239 closes the loop
  // and matches frame 0. Verify motion at an INTERMEDIATE time, not the seam.
  await root.getByRole("slider",{name:"RISO75 original source film frame"}).press("ArrowRight");
  await expect(root).toHaveAttribute("data-km-riso75-frame","1");
  expect(await sourceBrush.first().evaluate(el=>el.outerHTML)).not.toBe(frame0);
  await expect(firstStreak).toHaveAttribute("d",originalStreak!);
  await root.getByRole("slider",{name:"RISO75 original source film frame"}).press("End");
  await expect(root).toHaveAttribute("data-km-riso75-frame","239");
  expect(await sourceBrush.first().evaluate(el=>el.outerHTML)).toBe(frame0);
  await expect(firstStreak).toHaveAttribute("d",originalStreak!);
  await root.getByRole("combobox",{name:"RISO75 paper feed direction"})
    .selectOption("left-to-right");
  await expect(root).toHaveAttribute("data-km-riso75-feed","left-to-right");
  expect(await firstStreak.getAttribute("d")).not.toBe(originalStreak);
  await root.getByRole("combobox",{name:"RISO75 original ink selection"})
    .selectOption("red");
  await expect(after.locator('[data-km-riso-plate="blue"]')).toHaveCount(0);
  await expect(after.locator('[data-km-riso-plate="red"]')).toHaveCount(1);
  await root.getByRole("combobox",{name:"RISO75 original ink selection"})
    .selectOption("both");
  await root.getByRole("combobox",{name:"RISO75 film aspect"})
    .selectOption("portrait");
  await expect(root).toHaveAttribute("data-km-riso75-aspect","portrait");
  await expect(after.locator("[data-km-riso75-streak]")).toHaveCount(224);
  await root.screenshot({
    path:info.outputPath("riso75-portrait-cross-feed-two-ink-original-fibre-scene.png"),
    animations:"disabled",
  });
  // At zero pressure, both panels must render precisely the same original
  // vector artwork. No paper-open masks or paths are generated.
  await root.getByRole("slider",{name:"RISO75 drum contact dryness"}).focus();
  await root.getByRole("slider",{name:"RISO75 drum contact dryness"}).press("Home");
  await expect(root).toHaveAttribute("data-km-riso75-material","0");
  await expect(after.locator("[data-km-riso75-streak]")).toHaveCount(0);
  await expect(after.locator("[data-km-riso75-contact-drum]")).toHaveCount(0);
  expect(await contactBrush.evaluateAll(items=>items.map(el=>el.outerHTML)))
    .toEqual(await sourceBrush.evaluateAll(items=>items.map(el=>el.outerHTML)));
  await root.getByRole("checkbox",{name:"RISO75 reduced motion"}).check();
  await expect(root).toHaveAttribute("data-km-riso75-frame","239");
  expect(errors).toEqual([]);
});
