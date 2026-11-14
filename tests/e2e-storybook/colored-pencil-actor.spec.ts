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

test("original two-character pencil performance is inspectable in 16:9 and 9:16", async ({ page }, info) => {
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
    await expect(svg.locator("[data-km-pencil-region='fox-head'] [data-km-pencil-underpaint]"))
      .toHaveAttribute("opacity", "0.9");
    await expect(svg.locator("[data-km-pencil-region='bird-front-wing']")).toHaveCount(1);
    const pose = await svg.evaluate(el => el.outerHTML);
    expect(pose).not.toBe(first);
    await svg.screenshot({ animations: "disabled",
      path: info.outputPath("pencil-ensemble-" + aspect + "-240.png") });
    await setFrame(page, 320);
    await svg.screenshot({ animations: "disabled",
      path: info.outputPath("pencil-ensemble-" + aspect + "-320.png") });
    await setFrame(page, 240);
    expect(await svg.evaluate(el => el.outerHTML)).toBe(pose);
  }
});
