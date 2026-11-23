import { test,expect } from "@playwright/test";
import type { Locator } from "@playwright/test";

async function seek(slider: Locator, frame: number) {
  await slider.evaluate((node, n) => {
    const input=node as HTMLInputElement;
    const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")?.set;
    if(!setter)throw new Error("Native input setter unavailable");
    setter.call(input,String(n));
    input.dispatchEvent(new Event("input",{bubbles:true}));
    input.dispatchEvent(new Event("change",{bubbles:true}));
  },frame);
}
test("Risograph actors: real Storybook motion and plate isolation in both aspect ratios",async({page},info)=>{
  await page.goto("/iframe.html?id=video-riso-characters--paper-courier-performance&viewMode=story");
  await page.evaluate(()=>document.fonts.ready);
  const slider=page.getByRole("slider",{name:"Risograph character film frame"});
  await expect(slider).toBeVisible();
  for(const aspect of ["landscape","portrait"] as const){
    if(aspect==="portrait")
      await page.getByRole("combobox",{name:"Riso performance output"}).selectOption("portrait");
    const stage=page.locator("svg[data-km-riso-performance]");
    await expect(stage).toHaveAttribute("viewBox",aspect==="landscape"?"0 0 960 540":"0 0 540 960");
    for(const at of [0,32,76,80,128,157,166,198,239]){
      await seek(slider,at);
      await expect(slider).toHaveValue(String(at));
      await expect(stage).toHaveAttribute("data-km-riso-performance-frame",String(at));
      await expect(stage.locator('[data-km-riso-character="courier"]')).toHaveCount(2);
      await expect(stage.locator('[data-km-riso-character="paper-bird"]')).toHaveCount(2);
      await stage.screenshot({
        path:info.outputPath("riso-"+aspect+"-characters-"+at+".png"),
        animations:"disabled",
      });
    }
    await seek(slider,157);
    await expect(stage.locator('[data-km-riso-character="courier"]').first()).toHaveAttribute(
      "data-km-riso-expression","speak");
    const screenshot=await stage.screenshot({animations:"disabled"});
    await seek(slider,239);
    await seek(slider,157);
    const repeated=await stage.screenshot({animations:"disabled",
      path:info.outputPath("riso-"+aspect+"-seek-return.png")});
    expect(repeated.equals(screenshot)).toBe(true);
    await page.getByRole("combobox",{name:"Ink plate isolation"}).selectOption("red");
    await expect(stage.locator("[data-km-riso-plate]")).toHaveCount(1);
    await expect(stage.locator("[data-km-riso-plate]")).toHaveAttribute("data-km-riso-plate","red");
    await stage.screenshot({path:info.outputPath("riso-"+aspect+"-red-only.png"),animations:"disabled"});
    await page.getByRole("combobox",{name:"Ink plate isolation"}).selectOption("blue");
    await expect(stage.locator("[data-km-riso-plate]")).toHaveAttribute("data-km-riso-plate","blue");
    await stage.screenshot({path:info.outputPath("riso-"+aspect+"-blue-only.png"),animations:"disabled"});
    await page.getByRole("combobox",{name:"Ink plate isolation"}).selectOption("both");
    await page.getByRole("checkbox",{name:"Reduced motion"}).check();
    await expect(stage.locator('[data-km-riso-character="courier"]').first()).toHaveAttribute(
      "data-km-riso-expression","smile");
    await page.getByRole("checkbox",{name:"Reduced motion"}).uncheck();
  }
});

test("RISO5 character opacity: paper-backed courier and bird remain solid in every ink pass", async({page},info)=>{
  await page.goto("/iframe.html?id=video-riso-characters--paper-courier-performance&viewMode=story");
  await page.evaluate(()=>document.fonts.ready);
  const stage=page.locator("svg[data-km-riso-performance]");
  const slider=page.getByRole("slider",{name:"Risograph character film frame"});
  for(const aspect of ["landscape","portrait"] as const){
    if(aspect==="portrait")
      await page.getByRole("combobox",{name:"Riso performance output"}).selectOption(aspect);
    for(const frame of [0,46,157,198]){
      await seek(slider,frame);
      await expect(stage).toHaveAttribute("data-km-riso-performance-frame",String(frame));
      const first=stage.locator('[data-km-riso-paper-knockout="courier"]');
      const second=stage.locator('[data-km-riso-paper-knockout="paper-bird"]');
      await expect(first).toHaveCount(1);
      await expect(second).toHaveCount(1);
      await expect(first.locator('[data-km-riso-knockout-part="coat"]')).toHaveCount(1);
      await expect(second.locator('[data-km-riso-knockout-part="body"]')).toHaveCount(1);
      await expect(first.locator('[data-km-riso-character-knockout="courier"]'))
        .toHaveAttribute("data-km-riso-knockout-frame",String(Math.floor(frame/2)*2));
      await stage.screenshot({
        path:info.outputPath(`riso5-opaque-${aspect}-f${String(frame).padStart(3,"0")}.png`),
        animations:"disabled",
      });
    }
    await page.getByRole("combobox",{name:"Ink plate isolation"}).selectOption("blue");
    await expect(stage.locator('[data-km-riso-foreground-plate="red"]')).toHaveCount(0);
    await expect(stage.locator('[data-km-riso-foreground-plate="blue"]')).toHaveCount(2);
    await expect(stage.locator("[data-km-riso-paper-knockout]")).toHaveCount(2);
    await page.getByRole("combobox",{name:"Ink plate isolation"}).selectOption("both");
  }
});

test("Courier internal face paper clearance remains intact over body and props",async({page},info)=>{
  await page.goto("/iframe.html?id=video-riso-characters--paper-courier-performance&viewMode=story");
  await page.evaluate(()=>document.fonts.ready);
  const stage=page.locator("svg[data-km-riso-performance]");
  const slider=page.getByRole("slider",{name:"Risograph character film frame"});
  for(const aspect of ["landscape","portrait"] as const){
    await page.getByRole("combobox",{name:"Riso performance output"}).selectOption(aspect);
    for(const frame of [46,157,198]){
      await seek(slider,frame);
      await expect(stage).toHaveAttribute("data-km-riso-performance-frame",String(frame));
      // Each independent ink plate subtracts earlier body ink from the
      // paper-backed face before drawing facial ink. No alpha blending.
      // RISO24-RISO58 (e013d050, 24fa578e, 179bef6e, 532cdf14) added clearances
      // for neck, wrists, cap and glove, so each plate now has one mask for every
      // run of ink between two clearances instead of a single one.
      const plates=await stage.locator('[data-km-riso-character="courier"]').evaluateAll(nodes=>
        nodes.map(actor=>{
          const runs=[...actor.querySelectorAll(":scope > [data-km-riso-ink-segment]")].map(run=>{
            const id=/^url\(#(.+)\)$/.exec(run.getAttribute("mask")??"")?.[1];
            const mask=id?actor.querySelector("mask#"+CSS.escape(id)):null;
            if(id&&!mask)throw new Error("Ink run points to a missing mask");
            const face=mask?.querySelector('[data-km-riso-paper-clearance="face"]');
            return {clearsFace:!!face,solid:!face||face.getAttribute("fill")==="black"&&
                !face.hasAttribute("opacity")&&mask!.querySelector("rect")?.getAttribute("fill")==="white",
              parts:[...run.querySelectorAll("[data-km-riso-part]")]
                .map(part=>part.getAttribute("data-km-riso-part")!)};
          });
          const faceMasks=actor.querySelectorAll('mask:has([data-km-riso-paper-clearance="face"])').length;
          return {plate:actor.closest("[data-km-riso-foreground-plate]")
            ?.getAttribute("data-km-riso-foreground-plate"),runs,faceMasks};
        }));
      expect(plates.map(p=>p.plate).sort()).toEqual(["blue","red"]);
      for(const {plate,runs,faceMasks} of plates){
        const first=runs.findIndex(run=>!run.clearsFace);
        // The masked runs come first and are contiguous; facial ink follows them.
        expect(first,plate+" has body ink under the face").toBeGreaterThan(0);
        expect(runs.slice(first).every(run=>!run.clearsFace)).toBe(true);
        expect(runs.every(run=>run.solid),plate+" clearance is solid paper").toBe(true);
        expect(faceMasks).toBe(first);
        const under=new Set(runs.slice(0,first).flatMap(run=>run.parts));
        const over=new Set(runs.slice(first).flatMap(run=>run.parts));
        const [body,ink]=plate==="blue"?
          [["right-thigh","coat","left-forearm","satchel-buckle"],["face-outline","eye-line","nose"]]:
          [["right-boot-detail","coat-buttons","satchel-ink"],["cheek","mouth"]];
        for(const part of body)expect(under.has(part),plate+" "+part+" is cleared").toBe(true);
        for(const part of ink)expect(over.has(part),plate+" "+part+" prints on the face").toBe(true);
      }
      await expect(stage.locator('[data-km-riso-character="courier"] [data-km-riso-part="mouth"]')).toHaveCount(1);
      await stage.screenshot({path:info.outputPath(
        "riso-face-clearance-"+aspect+"-f"+String(frame).padStart(3,"0")+".png"
      ),animations:"disabled"});
    }
  }
});
