import {test,expect} from "@playwright/test";

test("RISO78 one source-printed Risograph accordion: connected mountain/valley creases, original master and microscope, portrait and reduced movie",
async({page},info)=>{
  test.setTimeout(135000);
  const errors:string[]=[];
  page.on("pageerror",e=>errors.push(e.message));
  await page.setViewportSize({width:1480,height:1300});
  await page.goto("/iframe.html?id=video-riso-print-lab--risograph-continuous-accordion&viewMode=story");
  const studio=page.locator("[data-km-riso78-studio]");
  await expect(studio).toBeVisible();
  await expect(studio).toHaveAttribute("data-km-riso78-frame","112");
  await expect(studio).toHaveAttribute("data-km-riso78-scene","unfolding");
  await expect(studio).toHaveAttribute("data-km-riso78-panels","4");
  const book=studio.locator("[data-km-riso78-accordion]");
  await expect(book).toBeVisible();
  await expect(book.locator("[data-km-riso78-original-source]")).toHaveCount(4);
  await expect(book.locator("[data-km-riso78-source-panel]")).toHaveCount(4);
  await expect(book.locator("[data-km-riso78-paper-score]")).toHaveCount(3);
  await expect(book.locator("[data-km-riso78-cellulose-scuff]")).toHaveCount(174);
  await expect(book.locator("[data-km-riso-print]")).toHaveCount(4);
  const onePrint=book.locator('[data-km-riso78-source-panel="0"] [data-km-riso-print]');
  const orig=await onePrint.evaluate(el=>el.outerHTML);
  const face0=await book.locator('[data-km-riso78-panel="0"]').getAttribute("transform");
  const score=await book.locator("[data-km-riso78-cellulose-scuff]").first().getAttribute("d");
  await studio.locator("[data-km-riso78-film]").screenshot({
    path:info.outputPath("riso78-original-riso-accordion-part-fold-1x-full-ink-scored.png"),
    animations:"disabled",
  });
  await studio.getByRole("combobox",{name:"RISO78 camera microscope zoom"})
    .selectOption("3");
  await expect(studio).toHaveAttribute("data-km-riso78-zoom","3");
  await studio.locator("[data-km-riso78-film]").screenshot({
    path:info.outputPath("riso78-3x-original-ink-score-fibre-and-alternating-shade.png"),
    animations:"disabled",
  });
  await expect(book.locator('[data-km-riso78-panel="0"]'))
    .toHaveAttribute("transform",face0!);
  await expect(book.locator("[data-km-riso78-cellulose-scuff]").first())
    .toHaveAttribute("d",score!);
  expect(await onePrint.evaluate(el=>el.outerHTML)).toBe(orig);
  await studio.getByRole("combobox",{name:"RISO78 camera microscope zoom"})
    .selectOption("1");
  await studio.getByRole("slider",{name:"RISO78 original sheet panel count"}).focus();
  await studio.getByRole("slider",{name:"RISO78 original sheet panel count"}).press("ArrowRight");
  await expect(studio).toHaveAttribute("data-km-riso78-panels","5");
  await expect(book.locator("[data-km-riso78-cellulose-scuff]")).toHaveCount(232);
  await studio.getByRole("combobox",{name:"RISO78 fold direction"})
    .selectOption("horizontal");
  await expect(studio).toHaveAttribute("data-km-riso78-axis","horizontal");
  await expect(book).toHaveAttribute("data-km-riso78-axis","horizontal");
  await expect(book.locator("[data-km-riso78-source-panel]")).toHaveCount(5);
  await studio.getByRole("combobox",{name:"RISO78 film aspect"})
    .selectOption("portrait");
  await expect(studio).toHaveAttribute("data-km-riso78-aspect","portrait");
  await expect(book.locator("[data-km-riso78-cellulose-scuff]")).toHaveCount(232);
  await studio.locator("[data-km-riso78-film]").screenshot({
    path:info.outputPath("riso78-portrait-horizontal-5-fold-original-ink-zine.png"),
    animations:"disabled",
  });
  await studio.getByRole("slider",{name:"RISO78 absolute source frame"}).focus();
  await studio.getByRole("slider",{name:"RISO78 absolute source frame"}).press("Home");
  await expect(studio).toHaveAttribute("data-km-riso78-frame","0");
  await expect(studio).toHaveAttribute("data-km-riso78-scene","folded");
  await expect(book).toHaveAttribute("data-km-riso78-openness","0");
  await studio.getByRole("slider",{name:"RISO78 absolute source frame"}).press("End");
  await expect(studio).toHaveAttribute("data-km-riso78-frame","247");
  await expect(studio).toHaveAttribute("data-km-riso78-scene","open");
  await expect(book).toHaveAttribute("data-km-riso78-openness","1");
  await expect(book.locator("[data-km-riso78-exact-original-source]")).toHaveCount(1);
  await expect(book.locator("[data-km-riso-print]")).toHaveCount(1);
  await expect(book.locator("[data-km-riso78-paper-score]")).toHaveCount(0);
  await studio.locator("[data-km-riso78-film]").screenshot({
    path:info.outputPath("riso78-pristine-full-original-portrait-riso-print-unmodified.png"),
    animations:"disabled",
  });
  await studio.getByRole("button",{name:"Alternating faces"}).click();
  await studio.getByRole("checkbox",{name:"RISO78 reduced motion"}).check();
  await expect(studio).toHaveAttribute("data-km-riso78-reduced","true");
  await expect(book).toHaveAttribute("data-km-riso78-openness","1");
  await expect(book.locator("[data-km-riso-print]")).toHaveCount(1);
  expect(errors).toEqual([]);
});
