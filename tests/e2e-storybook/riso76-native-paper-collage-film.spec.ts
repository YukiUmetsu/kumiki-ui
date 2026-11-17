import {test,expect} from "@playwright/test";
test("RISO76 FilmStage tears a real two-drum original edition with 144 cellulose splinters and exact scene endpoints",async({page},info)=>{
  test.setTimeout(130000);
  const errors:string[]=[];
  page.on("pageerror",e=>errors.push(e.message));
  await page.setViewportSize({width:1550,height:1450});
  await page.goto("/iframe.html?id=video-riso-print-lab--risograph-torn-paper-collage&viewMode=story");
  const studio=page.locator("[data-km-riso76-studio]");
  await expect(studio).toBeVisible();
  await expect(studio).toHaveAttribute("data-km-riso76-frame","111");
  await expect(studio).toHaveAttribute("data-km-riso76-scene","torn-collage");
  const cut=studio.locator("[data-km-riso76-torn-collage]");
  await expect(cut).toBeVisible();
  await expect(cut.locator("[data-km-riso76-source-torn-mask]")).toHaveCount(1);
  await expect(cut.locator("[data-km-riso76-cellulose-fibre]")).toHaveCount(144);
  await expect(cut.locator("[data-km-riso76-outgoing-original] [data-km-riso-print]")).toHaveCount(1);
  await expect(cut.locator("[data-km-riso76-incoming-original] [data-km-riso-print]")).toHaveCount(1);
  await expect(cut.locator("[data-km-riso75-fibre-master]")).toHaveCount(4);
  const original=await cut.locator("[data-km-riso76-source-torn-mask]").getAttribute("d");
  const originalFibre=await cut.locator("[data-km-riso76-cellulose-fibre]").first().getAttribute("d");
  await studio.screenshot({
    path:info.outputPath("riso76-real-24fps-torn-risograph-collage-midpoint-1x.png"),
    animations:"disabled",
  });
  await studio.getByRole("combobox",{name:"RISO76 paper edge microscope zoom"})
    .selectOption("3");
  await expect(studio).toHaveAttribute("data-km-riso76-zoom","3");
  await studio.screenshot({
    path:info.outputPath("riso76-original-cellulose-144-splinters-and-cut-lip-3x.png"),
    animations:"disabled",
  });
  // Pure camera magnification must not recalculate material or move the sheet.
  await expect(cut.locator("[data-km-riso76-source-torn-mask]")).toHaveAttribute("d",original!);
  await expect(cut.locator("[data-km-riso76-cellulose-fibre]").first()).toHaveAttribute("d",originalFibre!);
  await studio.getByRole("combobox",{name:"RISO76 tear direction"})
    .selectOption("right-to-left");
  await expect(studio).toHaveAttribute("data-km-riso76-direction","right-to-left");
  expect(await cut.locator("[data-km-riso76-source-torn-mask]").getAttribute("d"))
    .not.toBe(original);
  await studio.getByRole("combobox",{name:"RISO76 tear direction"})
    .selectOption("top-to-bottom");
  await expect(cut).toHaveAttribute("data-km-riso76-direction","top-to-bottom");
  await studio.getByRole("combobox",{name:"RISO76 tear direction"})
    .selectOption("bottom-to-top");
  await expect(cut).toHaveAttribute("data-km-riso76-direction","bottom-to-top");
  await studio.getByRole("slider",{name:"RISO76 paper tear roughness"}).focus();
  await studio.getByRole("slider",{name:"RISO76 paper tear roughness"}).press("Home");
  await expect(studio).toHaveAttribute("data-km-riso76-paper-roughness","0");
  await expect(cut.locator("[data-km-riso76-cellulose-fibre]")).toHaveCount(0);
  // No hidden leftover ink or paper lip at the exact first and final frames.
  await studio.getByRole("slider",{name:"RISO76 absolute film frame"}).focus();
  await studio.getByRole("slider",{name:"RISO76 absolute film frame"}).press("Home");
  await expect(studio).toHaveAttribute("data-km-riso76-frame","0");
  await expect(studio).toHaveAttribute("data-km-riso76-scene","original");
  await expect(studio.locator("[data-km-riso76-torn-collage]")).toHaveCount(0);
  await expect(studio.locator("[data-km-riso-print]")).toHaveCount(1);
  await studio.getByRole("slider",{name:"RISO76 absolute film frame"}).press("End");
  await expect(studio).toHaveAttribute("data-km-riso76-frame","231");
  await expect(studio).toHaveAttribute("data-km-riso76-scene","new");
  await expect(studio.locator("[data-km-riso-print]")).toHaveCount(1);
  await expect(studio.locator("[data-km-riso76-edge-material]")).toHaveCount(0);
  // Restore fibre medium and recomposition at 9:16.
  await studio.getByRole("slider",{name:"RISO76 paper tear roughness"}).focus();
  await studio.getByRole("slider",{name:"RISO76 paper tear roughness"}).press("End");
  await studio.getByRole("combobox",{name:"RISO76 paper sheet aspect"})
    .selectOption("portrait");
  await studio.getByRole("button",{name:"Fibres / middle"}).click();
  await expect(studio).toHaveAttribute("data-km-riso76-aspect","portrait");
  await expect(studio.locator("[data-km-riso76-cellulose-fibre]")).toHaveCount(144);
  await studio.screenshot({
    path:info.outputPath("riso76-portrait-torn-fibre-paper-collage-full-vector-ink.png"),
    animations:"disabled",
  });
  await studio.getByRole("checkbox",{name:"RISO76 reduced motion"}).check();
  await expect(studio).toHaveAttribute("data-km-riso76-reduced","true");
  await expect(studio.locator("[data-km-riso76-torn-collage]"))
    .toHaveAttribute("data-km-riso76-progress","1");
  await expect(studio.locator("[data-km-riso76-cellulose-fibre]")).toHaveCount(0);
  expect(errors).toEqual([]);
});
