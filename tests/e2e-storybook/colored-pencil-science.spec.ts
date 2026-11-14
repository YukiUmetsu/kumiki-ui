import { expect, test } from "@playwright/test";

async function seek(page: import("@playwright/test").Page, frame: number) {
  const slider = page.getByRole("slider", { name: "Drawing frame" });
  await slider.evaluate((node, value) => {
    const input = node as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    if (!setter) throw new Error("Native range value setter unavailable");
    setter.call(input, String(value));
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, frame);
  await expect(slider).toHaveValue(String(frame));
}

test("coloured pencil remains paper-anchored at nonsequential frames in both compositions", async ({ page }, info) => {
  await page.goto("/iframe.html?id=video-colored-pencil-science--studio&viewMode=story");
  const svg = page.locator("svg[data-km-colored-pencil]");
  await expect(svg).toBeVisible();
  for (const aspect of ["landscape", "portrait"] as const) {
    await page.getByRole("combobox", { name: "Aspect ratio" }).selectOption(aspect);
    await expect(svg).toHaveAttribute("viewBox", aspect === "landscape" ? "0 0 960 540" : "0 0 540 960");
    for (const subject of ["leaf", "crystal"] as const) {
      await page.getByRole("combobox", { name: "Specimen" }).selectOption(subject);
      const captures: Buffer[] = [];
      for (const frame of [0, 135, 275]) {
        await seek(page, frame);
        await expect(svg).toHaveAttribute("data-km-pencil-frame", String(frame));
        captures.push(await svg.screenshot({
          animations: "disabled", path: info.outputPath("pencil-" + subject + "-" + aspect + "-" + frame + ".png"),
        }));
      }
      expect(captures[0]).not.toEqual(captures[1]);
      expect(captures[1]).not.toEqual(captures[2]);
      await seek(page, 135);
      const replay = await svg.screenshot({ animations: "disabled" });
      expect(replay).toEqual(captures[1]);
      await seek(page, 275);
      await expect(svg.locator("[data-km-graphite]")).toHaveCount(subject === "leaf" ? 2 : 4);
      await expect(svg.locator("[data-km-pigment-layer]")).toHaveCount(subject === "leaf" ? 6 : 9);
      const textBounds = await svg.locator("text").evaluateAll(nodes => {
        const stage = (nodes[0] as SVGTextElement).ownerSVGElement!.getBoundingClientRect();
        return nodes.map(node => {
          const r = node.getBoundingClientRect();
          return { text: node.textContent, outside:
            r.left < stage.left - 2 || r.right > stage.right + 2 ||
            r.top < stage.top - 2 || r.bottom > stage.bottom + 2 };
        });
      });
      expect(textBounds.filter(x => x.outside), JSON.stringify(textBounds)).toEqual([]);
    }
  }
});

test("portable pencil film uses the existing FilmStage slots and honours reduced motion", async ({ page }, info) => {
  await page.goto("/iframe.html?id=video-colored-pencil-science--film-stage-story&viewMode=story");
  const slider = page.getByRole("slider", { name: "Film frame" });
  const svg = page.locator("svg[data-km-colored-pencil]");
  await expect(svg).toBeVisible();
  for (const frame of [0, 95, 208, 352]) {
    await slider.evaluate((node, value) => {
      const input = node as HTMLInputElement;
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      setter?.call(input, String(value));
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }, frame);
    await expect(slider).toHaveValue(String(frame));
    await svg.screenshot({ animations: "disabled", path: info.outputPath("pencil-film-" + frame + ".png") });
  }
  await page.getByRole("checkbox", { name: "Reduced motion" }).check();
  await expect(svg).toBeVisible();
  await page.getByRole("combobox", { name: "Output" }).selectOption("portrait");
  await expect(svg).toHaveAttribute("viewBox", "0 0 540 960");
  await svg.screenshot({ animations: "disabled", path: info.outputPath("pencil-film-portrait-final.png") });
});
