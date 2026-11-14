import { expect, test } from "@playwright/test";
import type { Locator } from "@playwright/test";

const story = "/iframe.html?id=film-art-watercolour-worlds--any-subject-painted-film&viewMode=story";
async function seek(slider: Locator, frame: number) {
  await slider.evaluate((node, next) => {
    const input = node as HTMLInputElement;
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    if (!set) throw new Error("Browser slider value setter unavailable.");
    set.call(input, String(next));
    input.dispatchEvent(new Event("input", { bubbles:true }));
    input.dispatchEvent(new Event("change", { bubbles:true }));
  }, frame);
}

for (const output of ["landscape","portrait"] as const) {
  test("WM2 " + output + " four semantic subjects, dry ink hold and camera-anchored paper", async ({ page }, info) => {
    await page.goto(story);
    if (output === "portrait") await page.getByRole("combobox", { name:"Output format" }).selectOption("portrait");
    await page.evaluate(() => document.fonts.ready);
    const slider = page.getByRole("slider", { name:"Painted film frame" });
    const art = page.locator('svg[data-km-painted-composition]');
    await expect(art).toBeVisible();
    await expect(art).toHaveAttribute("viewBox", output === "portrait" ? "0 0 540 960" : "0 0 960 540");
    const chapters = ["nature","architecture","science","product"] as const;
    for (let i=0; i<4; i++) {
      const base = i*400;
      const genre = chapters[i];
      for (const local of [110,365]) {
        const frame = base+local;
        await seek(slider, frame);
        await expect(art).toHaveAttribute("data-km-paint-frame", String(local));
        await expect(art.locator("[data-km-paint-wash]").first()).toBeAttached();
        await art.screenshot({ animations:"disabled",
          path:info.outputPath("wm2-" + output + "-" + genre + "-" + local + ".png") });
      }
      await seek(slider, base+365);
      const fullyDry = await art.screenshot({ animations:"disabled" });
      await seek(slider, base+45);
      await seek(slider, base+399);
      await expect(art).toHaveAttribute("data-km-paint-frame","399");
      const dryLater = await art.screenshot({ animations:"disabled" });
      // Last brush detail in each genre is dry before frame 365.
      // With camera stationary after f319, the actual rendered pixels must be unchanged.
      expect(dryLater).toEqual(fullyDry);
      await expect(art).toContainText("WATERCOLOUR STUDIES");
    }
    await page.getByRole("checkbox", { name:"Reduced motion" }).check();
    await seek(slider, 0);
    await expect(art.locator('[data-km-wash-phase="dry"]').first()).toBeAttached();
    await art.screenshot({ animations:"disabled", path: info.outputPath("wm2-" + output + "-reduced.png") });
    const type = await art.evaluate(svg => [...svg.querySelectorAll("text")].map(node => {
      const bounds = node.getBoundingClientRect(), root=svg.getBoundingClientRect();
      return { inside: bounds.left >= root.left-2 && bounds.right <= root.right+2 &&
        bounds.top >= root.top-2 && bounds.bottom <= root.bottom+2,
        label:node.textContent, width: bounds.width };
    }));
    expect(type.filter(x => x.width > 0).every(x => x.inside), "Actual text must remain inside film safe canvas").toBe(true);
    expect(await art.locator("[data-km-paint-wash]").count()).toBeGreaterThan(0);
  });
}
