import {test,expect} from "@playwright/test";
import {createHash} from "node:crypto";
const hash=(bytes:Buffer)=>createHash("sha256").update(bytes).digest("hex");
const story="/iframe.html?id=video-colored-pencil-science--drawing-foundation&viewMode=story";
const sourceIds=["inner-fold","heart","rose-whorl-recess",
  "rose-whorl-left","rose-whorl-right","rose-whorl-scroll"] as const;

test("native 16:9 + 9:16: real six-source central knot with a visible curled backside, reversible A/B and full 45 regions",async({page},info)=>{
  await page.goto(story);
  const svg=page.locator("svg[data-km-colored-pencil]");
  const paper=svg.locator("xpath=..");
  const studio=page.locator("[data-km-foundation-studio]");
  await expect(paper).toHaveCSS("overflow","hidden");
  await page.getByRole("combobox",{name:"Foundation subject"}).selectOption("rose");
  const knot=page.getByRole("checkbox",{name:"Foundation rose center knot anatomy"});
  const whorl=page.getByRole("checkbox",{name:"Foundation rose nested inner whorl"});
  const focus=page.getByRole("combobox",{name:"Foundation inspection focus"});
  const macro=page.getByRole("checkbox",{name:"Foundation inspect macro"});
  await expect(knot).toBeDisabled();
  await whorl.check();
  await expect(knot).toBeEnabled();
  await page.getByRole("button",{name:/6\. Burnish and visual audit/}).click();
  for(const aspect of ["landscape","portrait"] as const){
    await page.getByRole("combobox",{name:"Foundation aspect"}).selectOption(aspect);
    await expect(svg.locator("[data-km-pencil-region]")).toHaveCount(15);
    const before=await svg.screenshot({animations:"disabled",
      path:info.outputPath("rose-knot-"+aspect+"-legacy-whorl.png")});
    const baselineMacros=new Map<string,Buffer>();
    for(const [focusValue,part,name] of [
      ["rose-whorl-center","rose-whorl-scroll","foreground-curl"],
      ["rose-whorl-recess","rose-whorl-recess","recess"],
      ["rose-whorl-left","rose-whorl-left","left-wall"],
      ["rose-whorl-right","rose-whorl-right","right-shoulder"],
    ] as const){
      await focus.selectOption(focusValue);
      await expect(studio).toHaveAttribute("data-km-foundation-inspection-focus",part);
      await macro.check();
      baselineMacros.set(name,await paper.screenshot({animations:"disabled",
        path:info.outputPath("rose-knot-"+aspect+"-old-"+name+"-215pct.png")}));
      await macro.uncheck();
    }
    await focus.selectOption("default");
    const previousPaths=await svg.evaluate((root,ids)=>{
      const result:Record<string,string|null>={};
      for(const id of ids){
        const path=root.querySelector('[data-km-pencil-region="'+id+'"] [data-km-pencil-support]');
        result[id]=path?.getAttribute("d")??null;
      }
      return result;
    },sourceIds);
    await knot.check();
    await expect(studio).toHaveAttribute("data-km-rose-center-knot","opt-in");
    await expect(svg).toHaveAttribute("viewBox",
      aspect==="landscape"?"0 0 960 540":"0 0 540 960");
    await expect(svg.locator("[data-km-pencil-region]")).toHaveCount(16);
    await expect(svg.locator("image,foreignObject,feImage")).toHaveCount(0);
    for(const id of sourceIds){
      const region=svg.locator('[data-km-pencil-region="'+id+'"]');
      const path=region.locator("path[data-km-pencil-support]");
      await expect(path).toHaveCount(1);
      // The whorl study already owns the four independently reprofiled
      // recess/side/scroll silhouettes. The deeper knot pass changes the
      // rear crown and front convex lobe, and adds local contacts to all six.
      if(id==="inner-fold"||id==="heart")
        expect(await path.getAttribute("d")).not.toBe(previousPaths[id]);
      else
        expect(await path.getAttribute("d")).toBe(previousPaths[id]);
      const details=region.locator("[data-km-pencil-details] path");
      expect(await details.count()).toBeGreaterThanOrEqual(5);
      if(id.startsWith("rose-whorl-")){
        const localContacts=await region.evaluate(node=>{
          const support=node.querySelector("path[data-km-pencil-support]") as SVGPathElement|null;
          if(!support)return [];
          const paths=[...node.querySelectorAll(
            'path[data-km-pencil-trace^="rw-"],path[data-km-pencil-trace^="rk-rose-whorl-"]',
          )] as SVGPathElement[];
          return paths.map(path=>{
            const length=path.getTotalLength();let inside=0;
            for(let i=1;i<=9;i++){
              const point=path.getPointAtLength(length*i/10);
              if(support.isPointInFill(new DOMPoint(point.x,point.y)))inside++;
            }
            return {id:path.getAttribute("data-km-pencil-trace"),inside};
          });
        });
        expect(localContacts.length).toBeGreaterThanOrEqual(8);
        for(const contact of localContacts)
          expect(contact.inside,contact.id+" stays on its own filled lamina").toBeGreaterThanOrEqual(5);
      }
      await expect(region.locator("[data-km-pigment-layer]")).toHaveCount(3);
    }
    const physical=svg.locator('[data-km-pencil-region="rose-center-scroll-underturn"]');
    await expect(physical.locator("path[data-km-pencil-support]")).toHaveCount(1);
    await expect(physical.locator("[data-km-pencil-details] path")).toHaveCount(4);
    const stats=await svg.evaluate(root=>{
      const underside=root.querySelector('[data-km-pencil-region="rose-center-scroll-underturn"] path[data-km-pencil-support]') as SVGPathElement|null;
      const front=root.querySelector('[data-km-pencil-region="rose-whorl-scroll"] path[data-km-pencil-support]') as SVGPathElement|null;
      if(!underside||!front)return {filled:0,exposed:0};
      const box=underside.getBBox();let filled=0,exposed=0;
      for(let y=0;y<37;y++)for(let x=0;x<37;x++){
        const at=new DOMPoint(box.x+(x+.5)*box.width/37,box.y+(y+.5)*box.height/37);
        if(underside.isPointInFill(at)){
          filled++;
          if(!front.isPointInFill(at))exposed++;
        }
      }
      return {filled,exposed};
    });
    expect(stats.filled).toBeGreaterThan(30);
    expect(stats.exposed).toBeGreaterThan(10);
    const native=await svg.screenshot({animations:"disabled",
      path:info.outputPath("rose-knot-"+aspect+"-original-central-physical-relief.png")});
    expect(hash(native)).not.toBe(hash(before));
    for(const [focusValue,part,name] of [
      ["rose-whorl-center","rose-whorl-scroll","foreground-curl"],
      ["rose-whorl-recess","rose-whorl-recess","occlusion-pocket"],
      ["rose-whorl-left","rose-whorl-left","left-wall"],
      ["rose-whorl-right","rose-whorl-right","right-shoulder"],
      ["rose-whorl-heart","heart","front-lamina"],
      ["rose-whorl-back-crown","inner-fold","rear-crown"],
      ["rose-whorl-underturn","rose-center-scroll-underturn","physical-backface"],
    ] as const){
      await focus.selectOption(focusValue);
      await expect(studio).toHaveAttribute("data-km-foundation-inspection-focus",part);
      await macro.check();
      const current=await paper.screenshot({animations:"disabled",
        path:info.outputPath("rose-knot-"+aspect+"-"+name+"-215pct.png")});
      const previous=baselineMacros.get(name);
      if(previous)expect(hash(current),name).not.toBe(hash(previous));
      await macro.uncheck();
    }
    await focus.selectOption("default");
    // All prior anatomy studies must remain fully composable, even when
    // 44 regions expand to 45 and the center geometries are reconstructed.
    for(const name of [
      "Foundation rose physical folds",
      "Foundation rose frontal lamina volume",
      "Foundation rose frontal local values",
      "Foundation rose physical rim thickness",
      "Foundation rose rear cup relief",
      "Foundation rose middle cup",
      "Foundation rose calyx anatomy",
      "Foundation rose pinnate leaves",
    ])
      await page.getByRole("checkbox",{name}).check();
    await expect(svg.locator("[data-km-pencil-region]")).toHaveCount(45);
    await svg.screenshot({animations:"disabled",
      path:info.outputPath("rose-knot-"+aspect+"-full45-native.png")});
    for(const name of [
      "Foundation rose pinnate leaves",
      "Foundation rose calyx anatomy",
      "Foundation rose middle cup",
      "Foundation rose rear cup relief",
      "Foundation rose physical rim thickness",
      "Foundation rose frontal local values",
      "Foundation rose frontal lamina volume",
      "Foundation rose physical folds",
    ])
      await page.getByRole("checkbox",{name}).uncheck();
    await knot.uncheck();
    const restored=await svg.screenshot({animations:"disabled",
      path:info.outputPath("rose-knot-"+aspect+"-legacy-whorl-restored.png")});
    expect(hash(restored)).toBe(hash(before));
    await expect(studio).toHaveAttribute("data-km-rose-center-knot","baseline");
  }
  await knot.check();
  await whorl.uncheck();
  await expect(knot).not.toBeChecked();
  await expect(knot).toBeDisabled();
  await expect(svg.locator("[data-km-pencil-region]")).toHaveCount(11);
});

test("central petal underside and anatomical fibers are paper-locked, animated by the same absolute film clock",async({page})=>{
  await page.goto(story);
  const svg=page.locator("svg[data-km-colored-pencil]");
  await page.getByRole("combobox",{name:"Foundation subject"}).selectOption("rose");
  await page.getByRole("checkbox",{name:"Foundation rose nested inner whorl"}).check();
  await page.getByRole("checkbox",{name:"Foundation rose center knot anatomy"}).check();
  const contacts=svg.locator('[data-km-pencil-region^="rose-center-scroll"] [data-km-pencil-details] path');
  await expect(contacts).toHaveCount(4);
  await page.getByRole("button",{name:/3\. Light value map/}).click();
  await expect(contacts.first()).toHaveAttribute("stroke-dasharray","0.00000 1");
  await page.getByRole("button",{name:/6\. Burnish and visual audit/}).click();
  await expect(contacts.first()).toHaveAttribute("stroke-dasharray","1.00000 1");
  const frame6=hash(await svg.screenshot({animations:"disabled"}));
  await page.getByRole("button",{name:/3\. Light value map/}).click();
  await page.getByRole("button",{name:/6\. Burnish and visual audit/}).click();
  expect(hash(await svg.screenshot({animations:"disabled"}))).toBe(frame6);
});
