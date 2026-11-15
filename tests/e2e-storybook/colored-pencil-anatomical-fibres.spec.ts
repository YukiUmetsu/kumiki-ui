import { test, expect } from "@playwright/test";

async function scrub(page: import("@playwright/test").Page, at:number){
  const slider=page.getByRole("slider",{name:"World frame"});
  await slider.evaluate((node,n)=>{
    const input=node as HTMLInputElement;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")?.set?.call(input,String(n));
    input.dispatchEvent(new Event("input",{bubbles:true}));
    input.dispatchEvent(new Event("change",{bubbles:true}));
  },at);
  await expect(slider).toHaveValue(String(at));
}

test("fine pencil fibres are separately editable, opaque-part anchored, deterministic and poseable",async({page},info)=>{
  await page.goto("/iframe.html?id=video-colored-pencil-science--character-performance&viewMode=story");
  const svg=page.locator("svg[data-km-pencil-scene]");
  const mode=page.getByRole("combobox",{name:"Character fine fibres"});
  await expect(svg).toBeVisible();
  for(const aspect of ["landscape","portrait"] as const){
    await page.getByRole("combobox",{name:"World aspect"}).selectOption(aspect);
    await page.getByRole("combobox",{name:"Character inspection"}).selectOption("composition");
    await scrub(page,216);
    const ids=[
      "tail-guard-body","ruff-undercoat-light","brow-fur-shadow",
      "folded-primaries-body","shoulder-coverts-light",
      "crown-barbs-body","breast-filaments-shadow",
    ];
    const parts=svg.locator("[data-km-pencil-region]");
    await expect(parts).toHaveCount(24);
    for(const id of ids){
      const target=svg.locator('[data-km-pencil-trace="'+id+'"]');
      await expect(target).toHaveCount(1);
      await expect(target).toHaveAttribute("transform",/rotate\(/);
      const path=await target.getAttribute("d");
      expect(path).toMatch(/^M/);
      expect((path?.match(/\bQ/g)??[]).length).toBeGreaterThan(16);
    }
    const target=svg.locator('[data-km-pencil-trace="folded-primaries-body"]');
    await scrub(page,187);
    const a=await target.getAttribute("transform");
    await scrub(page,216);
    const b=await target.getAttribute("transform");
    expect(a).not.toBe(b);
    await scrub(page,187);
    expect(await target.getAttribute("transform")).toBe(a);
    await scrub(page,216);
    const output=info.outputPath("artcraft-fibre-"+aspect+"-animated.png");
    await svg.screenshot({animations:"disabled",path:output});

    await mode.selectOption("fixed");
    await expect(target).toHaveCount(1);
    await expect(target).not.toHaveAttribute("transform",/rotate\(/);
    await svg.screenshot({animations:"disabled",
      path:info.outputPath("artcraft-fibre-"+aspect+"-fixed.png")});
    await mode.selectOption("hidden");
    await expect(target).toHaveCount(0);
    await expect(svg.locator("[data-km-pencil-region='fox-ruff']")).toHaveCount(1);
    await svg.screenshot({animations:"disabled",
      path:info.outputPath("artcraft-fibre-"+aspect+"-hidden.png")});
    await mode.selectOption("animated");
    await expect(target).toHaveAttribute("transform",/rotate\(/);
    for(const crop of ["fox-ruff","kingfisher-coverts"] as const){
      await page.getByRole("combobox",{name:"Character inspection"}).selectOption(crop);
      await svg.locator("xpath=..").screenshot({animations:"disabled",
        path:info.outputPath("artcraft-fibre-"+aspect+"-"+crop+"-macro.png")});
    }
  }
});
