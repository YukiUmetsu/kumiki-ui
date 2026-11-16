import {test,expect} from "@playwright/test";

test("RISO61 non-character film prints continuous two-spot tonal masters in both aspects",async({page},info)=>{
  const errors:string[]=[];
  page.on("pageerror",e=>errors.push(e.message));
  await page.setViewportSize({width:1650,height:1200});
  await page.goto("/iframe.html?id=video-riso-print-lab--risograph-gradient-ink&viewMode=story");
  await page.evaluate(()=>document.fonts.ready);
  const root=page.locator("[data-km-riso61-studio]");
  const print=root.locator("svg[data-km-riso61-print]");
  const aspect=page.getByRole("combobox",{name:"RISO61 output aspect"});
  const ink=page.getByRole("combobox",{name:"RISO61 ink separation"});
  const direction=page.getByRole("combobox",{name:"RISO61 gradient direction"});
  const frame=page.getByRole("slider",{name:"RISO61 absolute film frame"});
  const motion=page.getByRole("checkbox",{name:"RISO61 animate original wave contours"});
  const blue=()=>print.locator('[data-km-riso-plate="blue"]');
  const red=()=>print.locator('[data-km-riso-plate="red"]');
  const allSources=()=>print.locator("[data-km-riso-gradient-source-path]");
  const seek=async(n:number)=>{
    await frame.evaluate((node,v)=>{
      const input=node as HTMLInputElement;
      const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")?.set;
      if(!setter)throw new Error("Native slider setter unavailable");
      setter.call(input,String(v));
      input.dispatchEvent(new Event("input",{bubbles:true}));
      input.dispatchEvent(new Event("change",{bubbles:true}));
    },n);
    await expect(root).toHaveAttribute("data-km-riso61-frame",String(n));
  };

  await expect(root).toBeVisible();
  await expect(print).toHaveAttribute("data-km-riso-frame","239");
  for(const output of ["landscape","portrait"] as const){
    await aspect.selectOption(output);
    await expect(root).toHaveAttribute("data-km-riso61-aspect",output);
    await expect(print).toHaveAttribute("viewBox",
      output==="landscape"?"0 0 960 540":"0 0 540 960");
    await ink.selectOption("both");
    await expect(blue()).toHaveCount(1);
    await expect(red()).toHaveCount(1);
    await expect(allSources()).toHaveCount(3);
    const data=await print.locator("[data-km-riso-gradient-ink]").evaluateAll(nodes=>
      nodes.map(n=>({
        sites:Number(n.getAttribute("data-km-riso-gradient-sites")),
        dots:Number(n.getAttribute("data-km-riso-gradient-dots")),
        direction:n.getAttribute("data-km-riso-gradient-ink"),
        area:Number(n.getAttribute("data-km-riso-gradient-ink-area")),
      })));
    expect(data.map(d=>d.direction)).toEqual(["radial","vertical","radial"]);
    expect(data.every(d=>d.sites>500&&d.dots>500&&d.area>0)).toBe(true);
    const previewPaths=await allSources().evaluateAll(nodes=>nodes.map(n=>n.getAttribute("d")));
    expect(previewPaths.every(Boolean)).toBe(true);

    // Print master ink is fixed to its sheet at every frame, even when
    // the real original source water strokes move through the film.
    await seek(160);
    await expect(allSources()).toHaveCount(3);
    expect(await allSources().evaluateAll(nodes=>nodes.map(n=>n.getAttribute("d"))))
      .toEqual(previewPaths);
    await seek(0);
    await seek(239);
    expect(await allSources().evaluateAll(nodes=>nodes.map(n=>n.getAttribute("d"))))
      .toEqual(previewPaths);

    await direction.selectOption("horizontal");
    await expect(print.locator('[data-km-riso-gradient-ink="horizontal"]')).toHaveCount(1);
    await direction.selectOption("radial");
    await print.screenshot({path:info.outputPath("riso61-"+output+"-both-native-spot-masters.png"),animations:"disabled"});

    await ink.selectOption("blue");
    await expect(blue()).toHaveCount(1);
    await expect(red()).toHaveCount(0);
    await print.screenshot({path:info.outputPath("riso61-"+output+"-cobalt-stencil.png"),animations:"disabled"});
    await ink.selectOption("red");
    await expect(blue()).toHaveCount(0);
    await expect(red()).toHaveCount(1);
    await print.screenshot({path:info.outputPath("riso61-"+output+"-vermilion-stencil.png"),animations:"disabled"});
    await ink.selectOption("both");
    await expect(blue()).toHaveCount(1);
    await expect(red()).toHaveCount(1);
  }

  // Actual editable material controls must change source dot radii, not add
  // an image filter; restoring values must restore the exact deterministic
  // source path bytes.
  const baseline=await allSources().first().getAttribute("d");
  await page.getByRole("slider",{name:"RISO61 dot gain"}).evaluate((node,value)=>{
    const input=node as HTMLInputElement;
    const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")?.set;
    if(!setter)throw new Error("Native RISO61 dot-gain slider setter unavailable");
    setter.call(input,String(value));
    input.dispatchEvent(new Event("input",{bubbles:true}));
    input.dispatchEvent(new Event("change",{bubbles:true}));
  },"0.45");
  expect(await allSources().first().getAttribute("d")).not.toBe(baseline);
  await page.getByRole("slider",{name:"RISO61 dot gain"}).evaluate((node,value)=>{
    const input=node as HTMLInputElement;
    const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")?.set;
    if(!setter)throw new Error("Native RISO61 dot-gain slider setter unavailable");
    setter.call(input,String(value));
    input.dispatchEvent(new Event("input",{bubbles:true}));
    input.dispatchEvent(new Event("change",{bubbles:true}));
  },"0.1");
  expect(await allSources().first().getAttribute("d")).toBe(baseline);

  await motion.uncheck();
  await expect(root).toHaveAttribute("data-km-riso61-motion","false");
  const fixed=await print.locator("[data-km-riso61-contour='1']").first().getAttribute("d");
  await seek(220);
  expect(await print.locator("[data-km-riso61-contour='1']").first().getAttribute("d")).toBe(fixed);
  await motion.check();
  await seek(239);
  expect(await print.locator("[data-km-riso61-contour='1']").first().getAttribute("d")).not.toBe(fixed);

  expect(errors).toEqual([]);
});
