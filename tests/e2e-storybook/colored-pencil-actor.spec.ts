import { test, expect } from "@playwright/test";

async function setFrame(page: import("@playwright/test").Page, frame: number) {
  const slider = page.getByRole("slider", { name: "World frame" });
  await slider.evaluate((node, value) => {
    const input = node as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    setter?.call(input, String(value));
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, frame);
  await expect(slider).toHaveValue(String(frame));
}

test("ArtCraft rebuilt fox and kingfisher remain opaque and anatomically composed in both formats", async ({ page }, info) => {
  await page.goto("/iframe.html?id=video-colored-pencil-science--character-performance&viewMode=story");
  const svg = page.locator("svg[data-km-pencil-scene]");
  await expect(svg).toBeVisible();
  for (const aspect of ["landscape", "portrait"] as const) {
    await page.getByRole("combobox", { name: "World aspect" }).selectOption(aspect);
    await expect(svg).toHaveAttribute("viewBox", aspect === "landscape" ? "0 0 960 540" : "0 0 540 960");
    await setFrame(page, 0);
    const first = await svg.evaluate(el => el.outerHTML);
    await setFrame(page, 240);
    await expect(svg.locator("[data-km-pencil-region='fox-head']")).toHaveCount(1);
    await expect(svg.locator("[data-km-pencil-support='fox-head']")).toHaveCount(1);
    await expect(svg.locator("[data-km-pencil-support='fox-eye']")).toHaveCount(1);
    await expect(svg.locator("[data-km-pencil-region='kingfisher-near-wing']")).toHaveCount(1);
    await expect(svg.locator("[data-km-pencil-support='kingfisher-head']")).toHaveCount(1);
    await expect(svg.locator("[data-km-pencil-region='kingfisher-perch']")).toHaveCount(1);
    await expect(svg.locator("[data-km-pencil-region='bird-front-wing']")).toHaveCount(0);
    const pose = await svg.evaluate(el => el.outerHTML);
    expect(pose).not.toBe(first);
    await svg.screenshot({ animations: "disabled",
      path: info.outputPath("pencil-ensemble-artcraft-" + aspect + "-240.png") });
    // Two subject-specific macro inspections reveal density defects missed by composition snapshots.
    const close=svg.locator("[data-km-pencil-region='fox-eye']");
    await close.screenshot({animations:"disabled",
      path:info.outputPath("pencil-fox-eye-"+aspect+".png")});
    await svg.locator("[data-km-pencil-region='kingfisher-near-wing']").screenshot({
      animations:"disabled",path:info.outputPath("pencil-kingfisher-wing-"+aspect+".png"),
    });
    await setFrame(page, 320);
    await svg.screenshot({ animations: "disabled",
      path: info.outputPath("pencil-ensemble-artcraft-" + aspect + "-320.png") });
    await setFrame(page, 240);
    expect(await svg.evaluate(el => el.outerHTML)).toBe(pose);
  }
});


test("ArtCraft fox and kingfisher share original actor geometry at macro crops",async({page},info)=>{
  await page.goto("/iframe.html?id=video-colored-pencil-science--character-performance&viewMode=story");
  const scene=page.locator("svg[data-km-pencil-scene]");
  const inspect=page.getByRole("combobox",{name:"Character inspection"});
  await expect(scene).toBeVisible();
  for(const aspect of ["landscape","portrait"] as const){
    await page.getByRole("combobox",{name:"World aspect"}).selectOption(aspect);
    await setFrame(page,310);
    for(const focus of ["fox-eye","fox-paw","kingfisher-bill","kingfisher-wing"] as const){
      await inspect.selectOption(focus);
      await expect(scene).toHaveAttribute("style",/scale\(/);
      await scene.locator("xpath=..").screenshot({
        animations:"disabled",
        path:info.outputPath("artcraft-character-"+aspect+"-"+focus+".png"),
      });
      await expect(scene.locator('[data-km-pencil-support="fox-head"]')).toHaveCount(1);
      await expect(scene.locator('[data-km-pencil-support="kingfisher-feet"]')).toHaveCount(1);
    }
    await inspect.selectOption("composition");
    await expect(scene).not.toHaveAttribute("style",/scale\(/);
  }
});
