import {test,expect} from "@playwright/test";

const story="/iframe.html?id=film-art-watercolour-portrait--naturalist-portrait&viewMode=story";

for(const output of ["portrait","landscape"] as const){
  for(const sitter of ["sitter-a","sitter-b"] as const){
    test("WC13 rebuilt watercolor "+sitter+" "+output+": anatomy, material and blink",async({page},info)=>{
      await page.goto(story);
      await page.evaluate(()=>document.fonts.ready);
      await page.getByRole("combobox",{name:"Portrait output"}).selectOption(output);
      await page.getByRole("combobox",{name:"Watercolour portrait subject"}).selectOption(sitter);
      const svg=page.locator("svg[data-km-watercolour-illustration]");
      await expect(svg).toBeVisible({timeout:20000});
      await expect(page.getByText("Two portraits, rebuilt in watercolor")).toBeVisible();
      await expect(page.getByRole("button",{name:"Play watercolor portrait"})).toBeVisible();
      const seek=(f:number)=>page.getByRole("button",{name:"Frame "+f,exact:true}).click();
      for(const frame of [0,140,185,255,319,359]){
        await seek(frame);
        await expect(svg).toHaveAttribute("data-km-watercolour-illustration-frame",String(frame));
        if(frame===140||frame===255||frame===319)
          await svg.screenshot({animations:"disabled",
            path:info.outputPath("wc13-"+sitter+"-"+output+"-f"+frame+".png")});
      }
      await seek(255);
      for(const id of ["rebuilt-human-"+sitter,"face-foundation","nose-tip-form",
        "upper-lip-broken-wash","near-iris","far-pupil",
        "hair-foundation","clothing-opaque-base"])
        await expect(svg.locator('[data-km-watercolour-part="'+id+'"]')).toHaveCount(1);
      for(const id of ["face-foundation","clothing-opaque-base","hair-foundation","opaque-neck"])
        await expect(svg.locator('[data-km-watercolour-part="'+id+'"] > path[data-km-watercolour-composite="normal"]')).toHaveCount(1);
      await expect(svg.locator('clipPath[id*="-clip-near-eye-inset"]')).toHaveCount(1);
      await expect(svg.locator('clipPath[id*="-clip-far-eye-inset"]')).toHaveCount(1);
      if(sitter==="sitter-b")
        await expect(svg.locator('[data-km-watercolour-part="salt-pepper-beard-with-volume"]')).toHaveCount(1);
      else
        await expect(svg.locator('[data-km-watercolour-part="salt-pepper-beard-with-volume"]')).toHaveCount(0);
      const original=await svg.screenshot({animations:"disabled"});
      await page.getByRole("checkbox",{name:"Optical portrait glazing"}).uncheck();
      await expect(svg.locator('[data-km-watercolour-optical-glaze="face-foundation"]')).toHaveCount(0);
      const withoutGlaze=await svg.screenshot({animations:"disabled"});
      expect(original.equals(withoutGlaze)).toBe(false);
      await page.getByRole("checkbox",{name:"Optical portrait glazing"}).check();
      await expect(svg.locator('[data-km-watercolour-optical-glaze="face-foundation"]')).toHaveCount(1);
      const soft=page.getByRole("checkbox",{name:"Soft wet-on-wet portrait edges"});
      const temple=svg.locator('[data-km-watercolour-part="temple-lost-edge"] > path[data-km-watercolour-edge-softness]');
      await expect(temple).toHaveAttribute("data-km-watercolour-edge-softness","0.97");
      await soft.uncheck();
      await expect(temple).toHaveAttribute("data-km-watercolour-edge-softness","0");
      await soft.check();
      await page.getByRole("checkbox",{name:"Fine facial details"}).uncheck();
      await expect(svg.locator('[data-km-watercolour-part="near-pupil"]')).toHaveCount(0);
      await page.getByRole("checkbox",{name:"Fine facial details"}).check();
      await expect(svg.locator('[data-km-watercolour-part="near-pupil"]')).toHaveCount(1);
      await page.getByRole("checkbox",{name:"Reduced motion"}).check();
      await seek(0);
      await expect(svg.locator('[data-km-watercolour-part="face-foundation"]')).toHaveCount(1);
    });
  }
}
