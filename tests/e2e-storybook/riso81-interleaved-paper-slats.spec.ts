import {test,expect} from "@playwright/test";

test("RISO81 original printed interleaved slats preserve order, overlap, registration and end stops",
async({page},info)=>{
  test.setTimeout(135000);
  const errors:string[]=[];
  page.on("pageerror",error=>errors.push(error.message));
  await page.setViewportSize({width:1500,height:1280});
  await page.goto("/iframe.html?id=video-riso-print-lab--risograph-interleaved-paper-slat-reveal&viewMode=story");
  const studio=page.locator("[data-km-riso81-studio]");
  await expect(studio).toBeVisible();
  await expect(studio).toHaveAttribute("data-km-riso81-frame","108");
  const film=studio.locator("[data-km-riso81-film]");
  const theatre=film.locator("[data-km-riso81-theatre]");
  await expect(theatre).toBeVisible();
  await expect(theatre.locator("[data-km-riso81-slat]")).toHaveCount(12);
  await expect(theatre.locator("[data-km-riso81-slot]")).toHaveCount(11);
  await expect(theatre.locator("[data-km-riso81-fibre]")).toHaveCount(288);
  await expect(theatre.locator("[data-km-riso-print]")).toHaveCount(13);
  await expect(theatre).toHaveAttribute("data-km-riso81-axis","horizontal");
  await expect(theatre).toHaveAttribute("data-km-riso81-direction","down");
  await expect(theatre).toHaveAttribute("data-km-riso81-collision-clearance-mm","0.1");
  const sourceSignature=async()=>theatre.locator("[data-km-riso81-slat]").evaluateAll(slats=>
    slats.map(s=>{
      const print=s.querySelector("[data-km-riso81-original-printed-strip] [data-km-riso-print]");
      return {
        plates:Array.from(print?.querySelectorAll("[data-km-riso-plate]")??[])
          .map(x=>x.getAttribute("data-km-riso-plate")),
        paths:Array.from(print?.querySelectorAll("[data-km-riso-plate] path")??[])
          .map(x=>x.getAttribute("d")),
        text:Array.from(print?.querySelectorAll("[data-km-riso-plate] text")??[])
          .map(x=>x.textContent),
      };
    }));
  const originals=await sourceSignature();
  await film.screenshot({path:info.outputPath("riso81-horizontal-interleaved-slats-1x.png"),animations:"disabled"});
  await studio.getByRole("combobox",{name:"RISO81 source microscope zoom"}).selectOption("3");
  await film.screenshot({path:info.outputPath("riso81-horizontal-paper-lap-and-cellulose-3x.png"),animations:"disabled"});
  const frame=studio.getByRole("slider",{name:"RISO81 absolute film frame"});
  await frame.focus();
  await frame.press("Home");
  await expect(theatre).toHaveAttribute("data-km-riso81-progress","0");
  await expect(theatre).toHaveAttribute("data-km-riso81-pull-translation",/^-/);
  await film.screenshot({path:info.outputPath("riso81-all-slats-retracted-original-cover.png"),animations:"disabled"});
  await frame.press("End");
  await expect(theatre).toHaveAttribute("data-km-riso81-progress","1");
  await expect(theatre).toHaveAttribute("data-km-riso81-pull-translation","0,0");
  await expect(theatre.locator("[data-km-riso81-slat][data-km-riso81-exposure='1']")).toHaveCount(12);
  expect(await sourceSignature()).toEqual(originals);
  await film.screenshot({path:info.outputPath("riso81-reconstructed-original-insert-at-endstop.png"),animations:"disabled"});
  await studio.getByRole("combobox",{name:"RISO81 slat axis"}).selectOption("vertical");
  await expect(theatre).toHaveAttribute("data-km-riso81-axis","vertical");
  await expect(theatre).toHaveAttribute("data-km-riso81-direction","right");
  await studio.getByRole("combobox",{name:"RISO81 slat direction"}).selectOption("up");
  await expect(theatre).toHaveAttribute("data-km-riso81-direction","up");
  await film.screenshot({path:info.outputPath("riso81-vertical-interleaved-columns-portrait-source.png"),animations:"disabled"});
  await studio.getByRole("slider",{name:"RISO81 slat count"}).focus();
  await studio.getByRole("slider",{name:"RISO81 slat count"}).press("End");
  await expect(theatre).toHaveAttribute("data-km-riso81-slat-count","24");
  await expect(theatre.locator("[data-km-riso81-slot]")).toHaveCount(23);
  await studio.getByRole("combobox",{name:"RISO81 aspect"}).selectOption("portrait");
  await expect(studio).toHaveAttribute("data-km-riso81-aspect","portrait");
  await expect(theatre).toHaveAttribute("data-km-riso81-axis","vertical");
  await film.screenshot({path:info.outputPath("riso81-portrait-24-interleaved-slats.png"),animations:"disabled"});
  await studio.getByRole("checkbox",{name:"RISO81 reduced motion"}).check();
  await frame.focus();
  await frame.press("Home");
  await expect(theatre).toHaveAttribute("data-km-riso81-progress","1");
  expect(errors).toEqual([]);
});
