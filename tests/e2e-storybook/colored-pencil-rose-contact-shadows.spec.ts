import {test,expect} from "@playwright/test";
import {createHash} from "node:crypto";
import {ROSE_CONTACT_SHADOWS}
  from "../../src/video/colored-pencil-rose-contact-shadows";
const hash=(bytes:Buffer)=>createHash("sha256").update(bytes).digest("hex");
const story="/iframe.html?id=video-colored-pencil-science--drawing-foundation&viewMode=story";

test("physical lower/upper rose contact valleys: 16:9 / 9:16 fill/occlusion A/B and full 45-region native art",async({page},info)=>{
  await page.goto(story);
  const svg=page.locator("svg[data-km-colored-pencil]");
  const paper=svg.locator("xpath=..");
  const studio=page.locator("[data-km-foundation-studio]");
  await expect(paper).toHaveCSS("overflow","hidden");
  await page.getByRole("combobox",{name:"Foundation subject"}).selectOption("rose");
  const parent=page.getByRole("checkbox",{name:"Foundation rose nested inner whorl"});
  const knot=page.getByRole("checkbox",{name:"Foundation rose center knot anatomy"});
  const shadows=page.getByRole("checkbox",{name:"Foundation rose interpetal contact shadows"});
  const value=page.getByRole("checkbox",{name:"Foundation rose central diffuse values"});
  const focus=page.getByRole("combobox",{name:"Foundation inspection focus"});
  const zoom=page.getByRole("checkbox",{name:"Foundation inspect macro"});
  await expect(shadows).toBeDisabled();
  await parent.check();
  await expect(shadows).toBeDisabled();
  await knot.check();
  await expect(shadows).toBeEnabled();
  await page.getByRole("button",{name:/6\. Burnish and visual audit/}).click();

  for(const aspect of ["landscape","portrait"] as const){
    await page.getByRole("combobox",{name:"Foundation aspect"}).selectOption(aspect);
    await expect(svg.locator("[data-km-pencil-region]")).toHaveCount(16);
    // Compare *document* coordinates rather than viewport scroll offsets:
    // Playwright may scroll to whichever checkbox is currently clicked.
    const canvasDocumentBounds=()=>svg.evaluate(element=>{
      const b=element.getBoundingClientRect();
      return {x:b.x+window.scrollX,y:b.y+window.scrollY,
        width:b.width,height:b.height};
    });
    const preLayout=await canvasDocumentBounds();
    const before=await svg.screenshot({animations:"disabled",
      path:info.outputPath("rose-occlusion-"+aspect+"-original.png")});
    await shadows.check();
    await expect(studio).toHaveAttribute("data-km-rose-contact-shadow","opt-in");
    // Reference attribution must remain visible in both states: changing
    // its presence moves the SVG by fractional CSS pixels and causes false
    // global pigment/edge antialias differences in this native A/B proof.
    const postLayout=await canvasDocumentBounds();
    for(const dimension of ["x","y","width","height"] as const)
      expect(postLayout[dimension]).toBeCloseTo(preLayout[dimension],6);
    await expect(svg).toHaveAttribute("viewBox",
      aspect==="landscape"?"0 0 960 540":"0 0 540 960");
    await expect(svg.locator("[data-km-pencil-region]")).toHaveCount(16);
    await expect(svg.locator("image,foreignObject,feImage")).toHaveCount(0);
    await expect(page.getByRole("link",{name:/CC0 botanical photo reference/}))
      .toHaveAttribute("href","https://commons.wikimedia.org/wiki/File:Rose_Blossom_Closeup.jpg");
    const fieldCounts=new Map<string,number>();
    for(const field of ROSE_CONTACT_SHADOWS)
      fieldCounts.set(field.lower,(fieldCounts.get(field.lower)??0)+3);
    for(const [lower,count] of fieldCounts){
      const region=svg.locator('[data-km-pencil-region="'+lower+'"]');
      await expect(region.locator("[data-km-pencil-interior-details] path")).toHaveCount(count);
      await expect(region.locator("[data-km-pigment-layer]")).toHaveCount(3);
      const clip=await region.locator("[data-km-pencil-interior-details]").getAttribute("clip-path");
      expect(clip).toMatch(/^url\(#.+-region-\d+\)$/);
    }
    // Real path fill on the actual mounted SVG—not a screenshot heuristic:
    // a source valley MUST have both a visible lower-petal fringe and a
    // physically overlaid upper support, or it is just a false shadow stamp.
    const occupancy=await svg.evaluate((root,fields)=>{
      const results:{id:string,exposed:number,covered:number}[]=[];
      for(const f of fields){
        const lower=root.querySelector(
          '[data-km-pencil-region="'+f.lower+'"] [data-km-pencil-support]') as SVGPathElement|null;
        const upper=root.querySelector(
          '[data-km-pencil-region="'+f.upper+'"] [data-km-pencil-support]') as SVGPathElement|null;
        if(!lower||!upper){
          results.push({id:f.id,exposed:0,covered:0});continue;
        }
        let exposed=0,covered=0;
        for(let step=0;step<=40;step++){
          const t=step/40,u=1-t;
          const points=f.axis;
          const x=u*u*u*points[0][0]+3*u*u*t*points[1][0]+
            3*u*t*t*points[2][0]+t*t*t*points[3][0];
          const y=u*u*u*points[0][1]+3*u*u*t*points[1][1]+
            3*u*t*t*points[2][1]+t*t*t*points[3][1];
          const dx=3*u*u*(points[1][0]-points[0][0])+
            6*u*t*(points[2][0]-points[1][0])+
            3*t*t*(points[3][0]-points[2][0]);
          const dy=3*u*u*(points[1][1]-points[0][1])+
            6*u*t*(points[2][1]-points[1][1])+
            3*t*t*(points[3][1]-points[2][1]);
          const len=Math.hypot(dx,dy);
          for(const normalized of [-.75,-.25,0,.25,.75]){
            const spread=normalized*f.halfWidth;
            const point=new DOMPoint(x-dy/len*spread,y+dx/len*spread);
            if(lower.isPointInFill(point)){
              if(upper.isPointInFill(point))covered++;
              else exposed++;
            }
          }
        }
        results.push({id:f.id,exposed,covered});
      }
      return results;
    },ROSE_CONTACT_SHADOWS);
    console.info("[rose-contact-occupancy]",aspect,JSON.stringify(occupancy));
    for(const measured of occupancy){
      expect(measured.exposed,measured.id+" exposes painted lower petal").toBeGreaterThan(8);
      expect(measured.covered,measured.id+" has real upper occluding petal").toBeGreaterThan(5);
    }
    const after=await svg.screenshot({animations:"disabled",
      path:info.outputPath("rose-occlusion-"+aspect+"-five-source-valleys-native.png")});
    expect(hash(after)).not.toBe(hash(before));
    for(const [focusName,part] of [
      ["rose-whorl-recess","rose-whorl-recess"],
      ["rose-whorl-center","rose-whorl-scroll"],
    ] as const){
      await focus.selectOption(focusName);
      await expect(studio).toHaveAttribute("data-km-foundation-inspection-focus",part);
      await zoom.check();
      await paper.screenshot({animations:"disabled",
        path:info.outputPath("rose-occlusion-"+aspect+"-"+part+"-215pct-parent-crop.png")});
      await zoom.uncheck();
    }
    await focus.selectOption("default");
    await value.check();
    for(const label of [
      "Foundation rose physical folds",
      "Foundation rose outer petal edge relief",
      "Foundation rose outer petal form colour",
      "Foundation rose frontal lamina volume",
      "Foundation rose frontal local values",
      "Foundation rose physical rim thickness",
      "Foundation rose rear cup relief",
      "Foundation rose middle cup",
      "Foundation rose calyx anatomy",
      "Foundation rose pinnate leaves",
    ])await page.getByRole("checkbox",{name:label}).check();
    await expect(svg.locator("[data-km-pencil-region]")).toHaveCount(45);
    await expect(svg.locator("[data-km-pencil-interior-details]")).toHaveCount(10);
    await svg.screenshot({animations:"disabled",
      path:info.outputPath("rose-occlusion-"+aspect+"-complete45-and-diffuse-native.png")});
    for(const label of [
      "Foundation rose pinnate leaves",
      "Foundation rose calyx anatomy",
      "Foundation rose middle cup",
      "Foundation rose rear cup relief",
      "Foundation rose physical rim thickness",
      "Foundation rose frontal local values",
      "Foundation rose frontal lamina volume",
      "Foundation rose outer petal edge relief",
      "Foundation rose outer petal form colour",
      "Foundation rose physical folds",
    ])await page.getByRole("checkbox",{name:label}).uncheck();
    await value.uncheck();
    expect(hash(await svg.screenshot({animations:"disabled"}))).toBe(hash(after));
    await shadows.uncheck();
    await expect(studio).toHaveAttribute("data-km-rose-contact-shadow","baseline");
    const restored=await svg.screenshot({animations:"disabled",
      path:info.outputPath("rose-occlusion-"+aspect+"-original-restored.png")});
    expect(hash(restored)).toBe(hash(before));
  }
  await shadows.check();
  await knot.uncheck();
  await expect(shadows).not.toBeChecked();
  await expect(shadows).toBeDisabled();
  await knot.check();
  await shadows.check();
  await parent.uncheck();
  await expect(shadows).not.toBeChecked();
  await expect(svg.locator("[data-km-pencil-region]")).toHaveCount(11);
});

test("paper-locked petal contact shadows seek from structural f3 to f6 and back without temporal drift",async({page})=>{
  await page.goto(story);
  const svg=page.locator("svg[data-km-colored-pencil]");
  await page.getByRole("combobox",{name:"Foundation subject"}).selectOption("rose");
  await page.getByRole("checkbox",{name:"Foundation rose nested inner whorl"}).check();
  await page.getByRole("checkbox",{name:"Foundation rose center knot anatomy"}).check();
  await page.getByRole("checkbox",{name:"Foundation rose interpetal contact shadows"}).check();
  const details=svg.locator(
    '[data-km-pencil-region="rose-whorl-recess"] [data-km-pencil-interior-details] path');
  await expect(details).toHaveCount(6);
  await page.getByRole("button",{name:/3\. Light value map/}).click();
  await expect(details.first()).toHaveAttribute("stroke-dasharray","0.00000 1");
  await page.getByRole("button",{name:/6\. Burnish and visual audit/}).click();
  await expect(details.first()).toHaveAttribute("stroke-dasharray","1.00000 1");
  const frame6=hash(await svg.screenshot({animations:"disabled"}));
  await page.getByRole("button",{name:/3\. Light value map/}).click();
  await page.getByRole("button",{name:/6\. Burnish and visual audit/}).click();
  expect(hash(await svg.screenshot({animations:"disabled"}))).toBe(frame6);
});
