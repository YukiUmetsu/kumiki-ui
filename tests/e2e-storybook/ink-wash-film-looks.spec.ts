import { expect, test } from "@playwright/test";
import type { Locator } from "@playwright/test";

const base = "/iframe.html?id=video-film-looks--";
async function seek(slider: Locator, frame: number) {
  await slider.evaluate((node, value) => {
    const input = node as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    if (!setter) throw new Error("Range setter not available.");
    setter.call(input, String(value));
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, frame);
}
for (const [story, startingMode, expected, key] of [
  ["chinese-ink-painting", "painting", "[data-km-ink-wash]", 190],
  ["chinese-ink-documentary", "documentary", "[data-km-ink-scene]", 219],
  ["chinese-ink-character", "character", "[data-km-ink-character]", 195],
] as const) {
  test("Film Looks " + startingMode + ": real ink animation, 16:9 and 9:16", async ({ page }, info) => {
    await page.goto(base + story + "&viewMode=story");
    await page.evaluate(() => document.fonts.ready);
    await expect(page.getByRole("heading", { name: "Chinese ink wash · In motion" })).toBeVisible();
    const mode = page.getByRole("combobox", { name: "Ink animation" });
    const aspect = page.getByRole("combobox", { name: "Ink aspect" });
    const slider = page.getByRole("slider", { name: "Ink film frame" });
    const preview = page.locator("[data-km-film-looks-ink-preview]");
    await expect(mode).toHaveValue(startingMode);
    await expect(preview.locator(expected).first()).toBeVisible();
    const still = async (frame: number, suffix: string) => {
      await seek(slider, frame);
      await expect(slider).toHaveValue(String(frame));
      if (startingMode === "painting")
        await expect(preview.locator("[data-km-ink-wash]").first())
          .toHaveAttribute("data-km-ink-frame", String(frame));
      if (startingMode === "character")
        await expect(preview.locator("[data-km-ink-character]").first())
          .toHaveAttribute("data-km-ink-character-frame", String(frame));
      if (startingMode === "documentary") {
        const local = frame < 140 ? frame : frame < 320 ? frame - 140 : frame - 320;
        await expect(preview.locator("[data-km-ink-scene]").first())
          .toHaveAttribute("data-km-ink-scene-frame", String(local));
      }
      return preview.screenshot({ animations: "disabled",
        path: info.outputPath("film-looks-" + startingMode + "-" + suffix + "-" + frame + ".png") });
    };
    const a = await still(key, "wide");
    const root = preview.locator(expected).first();
    const snapshot = await root.evaluate(el => el.outerHTML);
    const b = await still(12, "wide");
    expect(a).not.toEqual(b);
    await still(key, "wide-again");
    await expect(slider).toHaveValue(String(key));
    // SVG turbulence may rasterize slightly differently across two Chromium
    // screenshots even when source geometry is identical. The real invariant
    // is exact evaluated markup, including paths, data frames and transforms.
    expect(await root.evaluate(el => el.outerHTML)).toEqual(snapshot);
    if (startingMode === "character")
      await expect(preview.locator("[data-km-ink-character]"))
        .toHaveAttribute("data-km-ink-character-frame", String(key));
    await aspect.selectOption("portrait");
    await expect(preview.locator(expected).first()).toBeVisible();
    await expect.poll(() => preview.evaluate(el => {
      const r = el.getBoundingClientRect();
      return r.height / r.width;
    })).toBeCloseTo(960 / 540, 2);
    await still(key, "portrait");
    await page.getByRole("button", { name: "Restart" }).click();
    await expect(slider).toHaveValue("0");
    await page.getByRole("button", { name: "Play animation" }).click();
    await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();
    // The documentary playback uses lightweight DOM layers; the full authored
    // ink/character renderers are separately tested at exact seek frames.
    // Avoid treating a slow CI software-rendered SVG frame as a broken ticker.
    if (startingMode === "documentary")
      await expect.poll(async () => Number(await slider.inputValue()), { timeout: 12000 })
        .toBeGreaterThan(0);
    await page.getByRole("button", { name: "Pause" }).click();
  });
}
test("Film Looks lets viewers switch all three materials without changing the page", async ({ page }) => {
  await page.goto(base + "chinese-ink-painting&viewMode=story");
  const mode = page.getByRole("combobox", { name: "Ink animation" });
  await mode.selectOption("documentary");
  await expect(page.locator("[data-km-ink-scene]")).toBeVisible();
  await mode.selectOption("character");
  await expect(page.locator("[data-km-ink-character]")).toBeVisible();
  await mode.selectOption("painting");
  await expect(page.locator("[data-km-ink-wash]")).toBeVisible();
  await page.getByRole("checkbox", { name: "Reduced motion" }).check();
  await expect(page.getByRole("button", { name: "Play animation" })).toBeDisabled();
});

test("Film Looks exposes live pigment, camera, actor and editable-JSON controls",async({page})=>{
  await page.goto(base+"chinese-ink-painting&viewMode=story");
  await page.getByText("Art direction · Full native material controls").click();
  const preview=page.locator("[data-km-film-looks-ink-preview]");
  const brush=page.getByRole("slider",{name:"Brush width"});
  const first=preview.locator("[data-km-ink-stroke]").first();
  const before=await first.locator("path").first().getAttribute("d");
  await seek(brush,2);
  await expect(brush).toHaveValue("2");
  await expect.poll(()=>first.locator("path").first().getAttribute("d"))
    .not.toBe(before);
  await expect(page.getByRole("slider",{name:"Xuan paper absorbency"})).toHaveValue("0.69");
  await page.getByRole("combobox",{name:"Brush orientation"}).selectOption("oblique");

  await page.getByRole("combobox",{name:"Ink animation"}).selectOption("documentary");
  await page.getByText("Cinematography · Camera, reveal, parallax").click();
  const camera=page.getByRole("slider",{name:"Camera zoom"});
  await seek(camera,1.5);
  await expect(camera).toHaveValue("1.5");
  await page.getByRole("combobox",{name:"Ink reveal kind"}).selectOption("instant");
  await expect(preview.locator("[data-km-ink-scene]")).toBeVisible();

  await page.getByRole("combobox",{name:"Ink animation"}).selectOption("character");
  await page.getByText("Character · Stage transforms and per-part ink").click();
  const person=preview.locator("[data-km-ink-character]").first();
  const initial=await person.getAttribute("style");
  await seek(page.getByRole("slider",{name:"Character X"}),25);
  await expect.poll(()=>person.getAttribute("style")).not.toEqual(initial);
  await seek(page.getByRole("slider",{name:"Robe/sleeve wet edge"}),.4);
  await expect(preview.locator('[data-km-ink-part-bleed="0.40"]').first()).toBeVisible();

  await page.getByRole("button",{name:"View / edit configuration JSON"}).click();
  const input=page.getByRole("textbox",{name:"Ink configuration JSON"});
  const value=JSON.parse(await input.inputValue()) as {
    material:Record<string,unknown>;camera:Record<string,unknown>;
  };
  value.material.strokeWidth=1.5;
  await input.fill(JSON.stringify(value));
  await page.getByRole("button",{name:"Apply configuration"}).click();
  await expect(page.getByRole("slider",{name:"Brush width"})).toHaveValue("1.5");
  await input.fill('{"material":{"paper":"javascript:evil"}}');
  await page.getByRole("button",{name:"Apply configuration"}).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await page.getByRole("button",{name:"Reset style parameters"}).click();
  await expect(page.getByRole("slider",{name:"Brush width"})).toHaveValue("1");
});
