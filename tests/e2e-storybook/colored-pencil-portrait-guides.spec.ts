import {test,expect} from "@playwright/test";

/** Controlled browser integration proof, NOT a human-portrait art-fidelity test.
 * The injected image is purpose-built synthetic content, not a real photo.
 * The real source/professional artistic comparison still requires ArtCraft v7.
 */
test("face feature guides are opt-in, stay aligned on aspect changes and never leak into export pixels",
  async({page},info)=>{
    const schematic=`<svg xmlns="http://www.w3.org/2000/svg" width="518" height="346">
      <defs><linearGradient id="v" x1="0" y1="0" x2="1" y2="1">
        <stop stop-color="#8a6a54"/><stop offset="1" stop-color="#524337"/></linearGradient></defs>
      <rect width="518" height="346" fill="#566c53"/>
      <ellipse cx="284" cy="148" rx="94" ry="143" fill="url(#v)"/>
      <ellipse cx="278" cy="152" rx="63" ry="109" fill="#dcb394"/>
      <path d="M210 106 Q245 10 355 60 L350 157 Q320 48 287 76 Q224 86 210 180Z" fill="#3d3029"/>
      <path d="M245 151 Q265 131 289 151 M312 143 Q337 131 350 147"
        stroke="#372f2b" stroke-width="5" fill="none"/>
      <path d="M298 163 Q291 195 312 200" stroke="#a37159" stroke-width="4" fill="none"/>
      <path d="M276 224 Q300 234 326 222" stroke="#9f4e57" stroke-width="6" fill="none"/>
    </svg>`;
    await page.route("**/Brunette_woman_portrait_%28Unsplash%29.jpg",route=>
      route.fulfill({
        status:200,contentType:"image/svg+xml",
        headers:{"access-control-allow-origin":"*"},
        body:schematic,
      }));
    await page.goto("/iframe.html?id=video-colored-pencil-science--reference-guided-faces&viewMode=story");
    const drawing=page.locator('canvas[data-km-pencil-photo]');
    await expect(drawing).toHaveAttribute("data-km-pencil-photo","ready",
      {timeout:25000});
    await expect(drawing).toHaveAttribute("data-km-portrait-features","source-guided");
    const craftToggle=page.getByRole("checkbox",{name:"Apply source-based portrait pencil marks"});
    await expect(craftToggle).toBeChecked();
    await craftToggle.uncheck();
    await expect(drawing).toHaveAttribute("data-km-portrait-features","none");
    await craftToggle.check();
    await expect(drawing).toHaveAttribute("data-km-portrait-features","source-guided");
    await expect(page.locator("[data-km-portrait-craft-evidence]")).toContainText(
      "additional eye, brow, nose, lip and form-following skin pencil marks");
    await expect(page.getByRole("alert")).toHaveCount(0);
    // Macro inspector only samples finished canvas; it never changes export.
    const originalCanvas=await drawing.evaluate(node=>
      (node as HTMLCanvasElement).toDataURL("image/png"));
    await page.getByRole("checkbox",{
      name:"Inspect portrait detail at three times scale",
    }).check();
    const macro=page.locator('canvas[data-km-pencil-face-macro]');
    await expect(macro).toHaveAttribute("data-km-pencil-face-macro","eyes");
    const dry=page.locator('canvas[data-km-pencil-dry-portrait]');
    await expect(dry).toHaveAttribute("data-km-pencil-raster-underpaint","none");
    await expect(dry).toHaveAttribute("data-km-pencil-dry-rendered-region","eyes");
    const pixels=await dry.evaluate(node=>{
      const canvas=node as HTMLCanvasElement;
      const image=canvas.getContext("2d")!.getImageData(0,0,360,240).data;
      let painted=0;
      for(let i=0;i<image.length;i+=4){
        if(Math.abs(image[i]-250)+Math.abs(image[i+1]-245)+
          Math.abs(image[i+2]-237)>15)painted++;
      }
      return painted;
    });
    expect(pixels).toBeGreaterThan(1000);
    await dry.screenshot({animations:"disabled",
      path:info.outputPath("pencil-only-eye-value-study.png")});
    await macro.screenshot({animations:"disabled",
      path:info.outputPath("pencil-eye-macro-schematic-only.png")});
    await page.getByRole("combobox",{name:"Pencil face detail region"})
      .selectOption("lips");
    await expect(macro).toHaveAttribute("data-km-pencil-face-macro","lips");
    await expect(dry).toHaveAttribute("data-km-pencil-dry-rendered-region","lips");
    await dry.screenshot({animations:"disabled",
      path:info.outputPath("pencil-only-lips-value-study.png")});
    await macro.screenshot({animations:"disabled",
      path:info.outputPath("pencil-lips-macro-schematic-only.png")});
    expect(await drawing.evaluate(node=>
      (node as HTMLCanvasElement).toDataURL("image/png"))).toBe(originalCanvas);
    await page.getByRole("checkbox",{name:"Show source-measured face guides"}).check();
    const guides=page.locator("svg[data-km-face-guide-overlay]");
    await expect(guides.locator("circle")).toHaveCount(25);
    await drawing.screenshot({animations:"disabled",
      path:info.outputPath("portrait-guided-landscape-schematic-only.png")});
    await page.getByRole("combobox",{name:"Pencil photo aspect"})
      .selectOption("portrait");
    await expect(drawing).toHaveAttribute("data-km-portrait-features","source-guided");
    await expect(guides.locator("circle")).toHaveCount(25);
    await drawing.screenshot({animations:"disabled",
      path:info.outputPath("portrait-guided-portrait-schematic-only.png")});
    await expect(macro).toHaveAttribute("data-km-pencil-face-macro","lips");
    await macro.screenshot({animations:"disabled",
      path:info.outputPath("pencil-lips-macro-portrait-schematic-only.png")});
    // Debug overlay must not become part of rendered artwork:
    // Canvas screenshot unaffected by toggling feature pin visibility.
    // Compare actual unchanged canvas bitmap, not browser PNG screenshot bytes:
    // element.screenshot() can differ in encoder/compositing by one byte when
    // SVG-overlay visibility changes even when export pixels are identical.
    const before=await drawing.evaluate(node=>(node as HTMLCanvasElement).toDataURL("image/png"));
    await page.getByRole("checkbox",{name:"Show source-measured face guides"}).uncheck();
    expect(await drawing.evaluate(node=>(node as HTMLCanvasElement).toDataURL("image/png")))
      .toBe(before);
    await expect(guides).toHaveCount(0);
  });
