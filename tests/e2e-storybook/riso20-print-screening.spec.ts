import { test, expect } from "@playwright/test";

/** RISO20: physical, two-plate DOM proof in the existing Film Looks → Risograph group.
 * This supplements pure geometry tests; screenshots still require human aesthetic review.
 */
test("RISO20 screened print remains usable in both output aspects and spot separations", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  await page.setViewportSize({ width: 1450, height: 1100 });
  await page.goto("/iframe.html?id=video-riso-print-lab--risograph-two-ink&viewMode=story");
  await page.evaluate(() => document.fonts.ready);

  const print = page.locator("svg[data-km-riso-print]");
  await expect(print).toBeVisible();
  await expect(print).toHaveAttribute("data-km-riso-screen-mode", "am");
  await expect(print.locator('[data-km-riso-plate="blue"]')).toHaveCount(1);
  await expect(print.locator('[data-km-riso-plate="red"]')).toHaveCount(1);

  for (const aspect of ["landscape", "portrait"] as const) {
    await page.getByRole("combobox", { name: "Aspect ratio" }).selectOption(aspect);
    await expect(print).toHaveAttribute("viewBox", aspect === "portrait" ? "0 0 540 960" : "0 0 960 540");
    const box = await print.boundingBox();
    expect(box, aspect).not.toBeNull();
    expect(box!.width).toBeGreaterThan(aspect === "portrait" ? 350 : 750);
    expect(box!.height).toBeGreaterThan(aspect === "portrait" ? 650 : 410);

    await page.getByRole("combobox", { name: "Screening method" }).selectOption("fm");
    await expect(print).toHaveAttribute("data-km-riso-screen-mode", "fm");
    // RISO26 (095ffc44, #412) cuts three co-registered masters per ink: full tone, mid and light.
    await expect(print.locator("pattern")).toHaveCount(6);
    const masters = async () => {
      const read = await print.locator("pattern").evaluateAll(nodes => nodes.map(node => ({
        id: node.id, width: Number(node.getAttribute("width")), angle: node.getAttribute("patternTransform"),
        ink: node.querySelector("circle")?.getAttribute("fill"),
        radius: Number(node.querySelector("circle")?.getAttribute("r")),
        count: node.querySelectorAll("circle").length })));
      return [0, 1].map(plate => {
        const of = (tone: string) => read.find(pattern => pattern.id.endsWith(`-dots-${tone}${plate}`))!;
        return { full: of(""), mid: of("mid-"), light: of("light-") };
      });
    };
    // Every ink's screen tile is larger than its AM cell; all droplets are source-/seed-anchored.
    const patterns = await masters();
    expect(patterns[0].full.width).toBe(72);
    expect(patterns[1].full.width).toBe(64);
    expect(patterns[0].full.count).toBeGreaterThan(10);
    expect(patterns[1].full.count).toBeGreaterThan(10);
    for (const { full, mid, light } of patterns) {
      // Lighter tones print fewer droplets of the same ink on the same registered tile.
      for (const tone of [mid, light])
        expect([tone.width, tone.angle, tone.ink]).toEqual([full.width, full.angle, full.ink]);
      expect(mid.count).toBeLessThan(full.count);
      expect(light.count).toBeLessThan(mid.count);
      expect(light.count).toBeGreaterThan(0);
    }
    expect(patterns[0].full.ink).not.toBe(patterns[1].full.ink);

    const setRange = async (name: string, value: string) => page.getByRole("slider", { name })
      .evaluate((node, next) => {
        const range = node as HTMLInputElement;
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
        if (!setter) throw new Error("Range setter unavailable");
        setter.call(range, next);
        range.dispatchEvent(new Event("input", { bubbles: true }));
        range.dispatchEvent(new Event("change", { bubbles: true }));
      }, value);

    await setRange("Screen tone", "0");
    await expect(print).toHaveAttribute("data-km-riso-screen-density", "0");
    await expect(print.locator("pattern circle")).toHaveCount(0);
    await setRange("Screen tone", "0.8");
    await expect(print).toHaveAttribute("data-km-riso-screen-density", "0.8");
    await setRange("Dot gain", "0.5");
    await expect(print).toHaveAttribute("data-km-riso-dot-gain", "0.5");
    await print.screenshot({ path: info.outputPath(`riso20-${aspect}-fm.png`), animations: "disabled" });

    await page.getByRole("button", { name: "Cobalt only" }).click();
    await expect(print.locator('[data-km-riso-plate="blue"]')).toHaveCount(1);
    await expect(print.locator('[data-km-riso-plate="red"]')).toHaveCount(1);
    // The disabled pass stays in the DOM as a correctly transparent, independently authored plate.
    await expect(print.locator('[data-km-riso-plate="red"]')).toHaveAttribute("opacity", "0");
    await page.getByRole("button", { name: "Both inks" }).click();

    await setRange("Screen tone", "0.32");
    await setRange("Dot gain", "0");
    await page.getByRole("combobox", { name: "Screening method" }).selectOption("am");
    await expect(print).toHaveAttribute("data-km-riso-screen-mode", "am");
    // AM: one dot per cell on each of the six masters, and tone is dot size.
    await expect(print.locator("pattern circle")).toHaveCount(6);
    for (const { full, mid, light } of await masters()) {
      expect(mid.radius).toBeLessThan(full.radius);
      expect(light.radius).toBeLessThan(mid.radius);
      expect(light.radius).toBeGreaterThan(0);
    }
    await print.screenshot({ path: info.outputPath(`riso20-${aspect}-am.png`), animations: "disabled" });
  }
  expect(errors).toEqual([]);
});
