import {test,expect} from "@playwright/test";

test("RISO80 organic contours preserve source topology, clockwise winding and paper microfibrils in Chromium",
async({page},info)=>{
  test.setTimeout(135000);
  const errors:string[]=[];
  page.on("pageerror",error=>errors.push(error.message));
  await page.setViewportSize({width:1490,height:1270});
  await page.goto("/iframe.html?id=video-riso-print-lab--risograph-printed-pull-tab&viewMode=story");
  const studio=page.locator("[data-km-riso79-studio]");
  await expect(studio).toBeVisible();
  const print=studio.locator("[data-km-riso79-theatre]");
  await expect(print).toBeVisible();

  const source=print.locator("[data-km-riso79-insert-plane] [data-km-riso-print]");
  const cover=print.locator("[data-km-riso79-stationary-original-cover] [data-km-riso-print]");
  const signature=(node:typeof source)=>node.evaluate(el=>({
    plates:Array.from(el.querySelectorAll("[data-km-riso-plate]")).map(x=>x.getAttribute("data-km-riso-plate")),
    paths:Array.from(el.querySelectorAll("[data-km-riso-plate] path")).map(x=>x.getAttribute("d")),
    text:Array.from(el.querySelectorAll("[data-km-riso-plate] text")).map(x=>x.textContent),
    pores:Array.from(el.querySelectorAll("mask circle")).map(x=>[x.getAttribute("cx"),x.getAttribute("cy"),x.getAttribute("r")]),
  }));
  const originalInsert=await signature(source);
  const originalCover=await signature(cover);

  await studio.getByRole("combobox",{name:"RISO80 window shape"}).selectOption("organic");
  await expect(studio).toHaveAttribute("data-km-riso80-shape-preset","organic");
  await expect(print).toHaveAttribute("data-km-riso80-organic-window-count","3");
  await expect(print.locator("[data-km-riso80-organic-contour]")).toHaveCount(3);
  await expect(print.locator("[data-km-riso80-source-contour]")).toHaveCount(3);
  await expect(print.locator("[data-km-riso80-source-winding=\"clockwise\"]")).toHaveCount(3);
  await expect(print.locator("[data-km-riso79-cut-fibre]")).toHaveCount(264);
  const contours=await print.locator("[data-km-riso80-source-contour]").evaluateAll(nodes=>
    nodes.map(node=>node.getAttribute("d")));
  const fibres=await print.locator("[data-km-riso79-cut-fibre]").evaluateAll(nodes=>
    nodes.map(node=>node.getAttribute("d")));
  await studio.locator("[data-km-riso79-film]").screenshot({
    path:info.outputPath("riso80-organic-three-contours-1x.png"),animations:"disabled",
  });

  await studio.getByRole("combobox",{name:"RISO79 source microscope zoom"}).selectOption("3");
  await expect(print.locator("[data-km-riso80-organic-contour]")).toHaveCount(3);
  const lensX=studio.getByRole("slider",{name:"RISO79 lens X"});
  const captureContour=async(x:number,name:string)=>{
    // Use real range-keyboard input so React's controlled state and the
    // browser's native value tracker stay synchronized in Chromium.
    const current=Number(await lensX.inputValue());
    await lensX.focus();
    const key=x<current?"ArrowLeft":"ArrowRight";
    for(let step=0;step<Math.abs(x-current);step++)await lensX.press(key);
    await expect(studio).toHaveAttribute("data-km-riso80-lens-x",String(x));
    await studio.locator("[data-km-riso79-film]").screenshot({
      path:info.outputPath(name),animations:"disabled",
    });
  };
  await captureContour(55,"riso80-organic-leaf-cut-edge-3x.png");
  await captureContour(68,"riso80-organic-s-curve-cut-edge-3x.png");
  await captureContour(82,"riso80-organic-flame-cut-edge-3x.png");
  await studio.getByRole("slider",{name:"RISO79 absolute film frame"}).focus();
  await studio.getByRole("slider",{name:"RISO79 absolute film frame"}).press("Home");
  await studio.getByRole("slider",{name:"RISO79 absolute film frame"}).press("End");
  expect(await print.locator("[data-km-riso80-source-contour]").evaluateAll(nodes=>
    nodes.map(node=>node.getAttribute("d")))).toEqual(contours);
  expect(await print.locator("[data-km-riso79-cut-fibre]").evaluateAll(nodes=>
    nodes.map(node=>node.getAttribute("d")))).toEqual(fibres);
  expect(await signature(source)).toEqual(originalInsert);
  expect(await signature(cover)).toEqual(originalCover);
  await studio.getByRole("combobox",{name:"RISO79 source microscope zoom"}).selectOption("1");
  await studio.locator("[data-km-riso79-film]").screenshot({
    path:info.outputPath("riso80-organic-three-contours-endstop-1x.png"),animations:"disabled",
  });

  await studio.getByRole("combobox",{name:"RISO79 aspect"}).selectOption("portrait");
  await expect(studio).toHaveAttribute("data-km-riso79-aspect","portrait");
  await expect(print).toHaveAttribute("data-km-riso80-organic-window-count","3");
  await expect(print.locator("[data-km-riso80-organic-contour]")).toHaveCount(3);
  await expect(print.locator("[data-km-riso80-source-winding=\"clockwise\"]")).toHaveCount(3);
  await studio.getByRole("combobox",{name:"RISO79 source microscope zoom"}).selectOption("1");
  await studio.locator("[data-km-riso79-film]").screenshot({
    path:info.outputPath("riso80-organic-portrait-9x16.png"),animations:"disabled",
  });

  await studio.getByRole("combobox",{name:"RISO80 window shape"}).selectOption("rounded");
  await expect(print).toHaveAttribute("data-km-riso80-organic-window-count","0");
  await expect(print.locator("[data-km-riso80-organic-contour]")).toHaveCount(0);
  await expect(print.locator("[data-km-riso79-cut-rim]")).toHaveCount(3);
  expect(errors).toEqual([]);
});
