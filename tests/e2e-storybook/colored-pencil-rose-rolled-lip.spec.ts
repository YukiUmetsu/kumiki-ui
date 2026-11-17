import {test,expect} from "@playwright/test";

test("rose folded cuticle A/B survives both native aspect ratios and timeline",async({page},info)=>{
  await page.goto("/iframe.html?id=video-colored-pencil-science--drawing-foundation&viewMode=story");
  const scene=page.locator("[data-km-foundation-studio]");
  const svg=page.locator("svg[data-km-colored-pencil]");
  await page.getByRole("combobox",{name:"Foundation subject"}).selectOption("rose");
  const checkbox=page.getByRole("checkbox",{name:"Foundation rose rolled lip study"});
  await expect(checkbox).not.toBeChecked();
  await expect(scene).toHaveAttribute("data-km-rose-rolled-lip","baseline");
  for(const aspect of ["landscape","portrait"] as const){
    await page.getByRole("combobox",{name:"Foundation aspect"}).selectOption(aspect);
    await page.getByRole("button",{name:/6\. Burnish and visual audit/}).click();
    const sourceBefore=await svg.evaluate(node=>node.outerHTML);
    const baseline=await svg.screenshot({animations:"disabled",
      path:info.outputPath("rose-"+aspect+"-original-source.png")});
    await checkbox.check();
    await expect(scene).toHaveAttribute("data-km-rose-rolled-lip","opt-in");
    await expect(svg.locator('[data-km-pencil-trace^="rose-lip-"]')).toHaveCount(21);
    expect(await svg.locator("image,foreignObject,feImage").count()).toBe(0);
    const studied=await svg.screenshot({animations:"disabled",
      path:info.outputPath("rose-"+aspect+"-rolled-edge.png")});
    expect(studied.equals(baseline)).toBe(false);
    await page.getByRole("checkbox",{name:"Foundation inspect macro"}).check();
    await svg.screenshot({animations:"disabled",
      path:info.outputPath("rose-"+aspect+"-rolled-edge-macro.png")});
    await page.getByRole("checkbox",{name:"Foundation inspect macro"}).uncheck();
    await page.getByRole("button",{name:/3\. Light value map/}).click();
    await expect(svg.locator('[data-km-pencil-trace^="rose-lip-"]')).toHaveCount(21);
    await expect(svg.locator('[data-km-pencil-trace^="rose-lip-"]').first())
      .toHaveAttribute("stroke-dasharray","0.00000 1");
    await checkbox.uncheck();
    await page.getByRole("button",{name:/6\. Burnish and visual audit/}).click();
    await expect(svg.locator('[data-km-pencil-trace^="rose-lip-"]')).toHaveCount(0);
    expect(await svg.evaluate(node=>node.outerHTML)).toBe(sourceBefore);
  }
});


/**
 * Measure the ACTUAL authored native SVG contour and each coloured-pencil
 * fold path in its own local art space. Clip paths can silently discard
 * perfectly valid off-lamina strokes; image-diff alone cannot detect that.
 * A contact may touch its petal edge, but cannot drift into the paper.
 */
test("native rose fold contacts remain on their own source petal",async({page})=>{
  await page.goto("/iframe.html?id=video-colored-pencil-science--drawing-foundation&viewMode=story");
  await page.getByRole("combobox",{name:"Foundation subject"}).selectOption("rose");
  await page.getByRole("checkbox",{name:"Foundation rose rolled lip study"}).check();
  await page.getByRole("button",{name:/6\\. Burnish and visual audit/}).click();
  const evidence=await page.locator("svg[data-km-colored-pencil]").evaluate(svg=>{
    const ids=[
      "outer-left","outer-right","back-cup","petal-front-left",
      "petal-front-right","inner-fold","heart",
    ];
    const failures:string[]=[];
    let samples=0;
    for(const id of ids){
      const region=svg.querySelector('[data-km-pencil-region="'+id+'"]');
      const details=region?.querySelector("[data-km-pencil-details]");
      const clip=details?.getAttribute("clip-path")?.match(/^url\\(#([^)]*)\\)$/)?.[1];
      const shape=clip?svg.querySelector('clipPath[id="'+clip+'"] path') as SVGPathElement|null:null;
      const traces=details?.querySelectorAll('[data-km-pencil-trace^="rose-lip-"]');
      if(!shape||!traces||traces.length!==3){
        failures.push(id+": missing original source clip or three lip contacts");
        continue;
      }
      const length=shape.getTotalLength();
      // Closed contours are sampled at the existing stroke resolution, with
      // extra winding/area proof supplied by SVG's native fill test.
      const boundary=Array.from({length:241},(_,i)=>shape.getPointAtLength(length*i/240));
      for(const item of Array.from(traces)){
        const line=item as SVGPathElement;
        const lineLength=line.getTotalLength();
        for(let i=0;i<=36;i++){
          const point=line.getPointAtLength(lineLength*i/36);
          samples++;
          if(shape.isPointInFill(point))continue;
          const distance=Math.min(...boundary.map(v=>Math.hypot(point.x-v.x,point.y-v.y)));
          if(distance>1.5){
            failures.push(id+" "+line.getAttribute("data-km-pencil-trace")+
              " outside fill by "+distance.toFixed(2)+" art units");
            break;
          }
        }
      }
    }
    return {failures,samples};
  });
  expect(evidence.samples).toBe(7*3*37);
  expect(evidence.failures).toEqual([]);
});
