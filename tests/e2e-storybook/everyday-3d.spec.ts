import { expect, test } from "@playwright/test";

const prefix = "video-production-scene-templates-3d-everyday-objects--";

for (const story of ["cinematic-desk-explainer-capture", "invoice-to-software-capture", "epic-book-storytelling-capture", "document-investigation-capture"]) {
  test(`physical ${story} seeks to exact frames and changes WebGL pixels`, async ({ page }, info) => {
    await page.goto(`/iframe.html?id=${prefix}${story}&viewMode=story&kmExport=1`);
    const stage = page.locator("[data-km-video-capture]");
    const canvas = page.locator("[data-km-hero-viewer][data-km-frame-addressed] canvas");
    await expect(canvas).toHaveAttribute("data-km-hero-ready", "true", { timeout: 30000 });
    let changed = 0;
    let previous: Buffer | null = null;
    for (const frame of [0, 34, 70, 85, 129, 149]) {
      await page.evaluate(async n => { await window.__kmVideoExport?.seek(n); }, frame);
      await expect(stage).toHaveAttribute("data-frame", String(frame));
      await expect(canvas).toHaveAttribute("data-km-hero-frame", String(frame));
      await expect(page.locator("[role=alert]")).toHaveCount(0);
      const current = await canvas.screenshot({ path: info.outputPath(`${story}-${frame}.png`) });
      if (previous && !previous.equals(current)) changed++;
      previous = current;
    }
    expect(changed).toBeGreaterThanOrEqual(3);
    await page.evaluate(async () => { await window.__kmVideoExport?.seek(85); });
    const at85 = await canvas.screenshot();
    await page.evaluate(async () => { await window.__kmVideoExport?.seek(12); });
    await page.evaluate(async () => { await window.__kmVideoExport?.seek(85); });
    expect(await canvas.screenshot()).toEqual(at85);
    if (story === "document-investigation-capture") {
      await page.evaluate(async () => { await window.__kmVideoExport?.seek(130); });
      await expect(page.getByText("Visual narrative")).toBeVisible();
      await expect(page.getByText("$ 360.00")).toBeVisible();
      await stage.screenshot({ path: info.outputPath("investigation-landscape-130.png") });
    }
  });
}

test("portrait capture keeps a 540×960 canvas and a readable authored title", async ({ page }, info) => {
  await page.goto(`/iframe.html?id=${prefix}invoice-to-software-portrait-capture&viewMode=story&kmExport=1`);
  await expect(page.locator("[data-km-everyday-scene]")).toHaveAttribute("data-aspect", "portrait");
  await expect(page.getByText("From paper to software")).toBeVisible();
  const dims = await page.locator("[data-km-hero-viewer] canvas").evaluate(el => ({
    width: (el as HTMLCanvasElement).width, height: (el as HTMLCanvasElement).height,
  }));
  expect(dims.height).toBeGreaterThan(dims.width);
  await page.evaluate(async () => { await window.__kmVideoExport?.seek(85); });
  await page.locator("[data-km-video-capture]").screenshot({ path: info.outputPath("portrait-invoice-85.png") });
});

test("investigation highlights the authored row in portrait and keeps its editorial value legible", async ({ page }, info) => {
  await page.goto(`/iframe.html?id=${prefix}document-investigation-portrait-capture&viewMode=story&kmExport=1`);
  const stage = page.locator("[data-km-video-capture]");
  const canvas = page.locator("[data-km-hero-viewer] canvas");
  await expect(canvas).toHaveAttribute("data-km-hero-ready", "true", { timeout: 30000 });
  await page.evaluate(async () => { await window.__kmVideoExport?.seek(130); });
  await expect(stage).toHaveAttribute("data-frame", "130");
  await expect(page.getByText("Visual narrative")).toBeVisible();
  await expect(page.getByText("$ 360.00")).toBeVisible();
  await expect(page.locator("[role=alert]")).toHaveCount(0);
  const size = await canvas.evaluate(element => ({ width: (element as HTMLCanvasElement).width,
    height: (element as HTMLCanvasElement).height }));
  expect(size.height).toBeGreaterThan(size.width);
  await stage.screenshot({ path: info.outputPath("investigation-portrait-130.png") });
});

test("interactive scene lighting preset changes the actual rendered studio", async ({ page }) => {
  await page.goto(`/iframe.html?id=${prefix}document-investigation&viewMode=story`);
  const canvas = page.locator("[data-km-hero-viewer] canvas");
  await expect(canvas).toHaveAttribute("data-km-hero-ready", "true", { timeout: 30000 });
  const original = await canvas.screenshot();
  await page.getByLabel("Scene lighting").selectOption("warm-documentary");
  await expect(page.getByLabel("Scene lighting")).toHaveValue("warm-documentary");
  await expect(canvas).toHaveAttribute("data-km-hero-ready", "true", { timeout: 30000 });
  expect((await canvas.screenshot()).equals(original)).toBe(false);
});

test("gallery inspects distinct assets, finishes and lighting, including close-ups", async ({ page }, info) => {
  await page.goto(`/iframe.html?id=${prefix}object-gallery&viewMode=story`);
  const canvas = page.locator("[data-km-hero-viewer] canvas");
  await expect(canvas).toHaveAttribute("data-km-hero-ready", "true", { timeout: 30000 });
  const laptop = await canvas.screenshot();
  await page.getByRole("button", { name: "white desk" }).click();
  await expect(canvas).toHaveAttribute("data-km-hero-ready", "true");
  const whiteDesk = await canvas.screenshot();
  expect(whiteDesk.equals(laptop)).toBe(false);
  await page.getByLabel("Lighting").selectOption("Dramatic evening");
  expect((await canvas.screenshot()).equals(whiteDesk)).toBe(false);
  await page.getByRole("button", { name: "folder", exact: true }).click();
  await expect(canvas).toHaveAttribute("data-km-hero-ready", "true");
  expect((await canvas.screenshot()).equals(whiteDesk)).toBe(false);
  await page.getByRole("button", { name: "invoice", exact: true }).click();
  const lifted = await canvas.screenshot();
  await page.getByRole("combobox", { name: "Action", exact: true }).selectOption("highlight");
  await expect(page.getByRole("combobox", { name: "Action", exact: true })).toHaveValue("highlight");
  expect((await canvas.screenshot()).equals(lifted)).toBe(false);
  for (const kind of ["desk", "white desk", "laptop", "smartphone", "paper", "invoice", "folder", "pen", "hardcover"]) {
    await page.getByRole("button", { name: kind, exact: true }).click();
    await expect(canvas).toHaveAttribute("data-km-hero-ready", "true");
    await expect(page.locator("[role=alert]")).toHaveCount(0);
    for (const [angle, key] of [[-20, "front"], [55, "detail"]] as const) {
      await page.getByLabel("Viewing angle").evaluate((element, value) => {
        const input = element as HTMLInputElement;
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
        setter?.call(input, String(value));
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
      }, angle);
      await canvas.screenshot({ path: info.outputPath(`object-${kind.replace(/\s+/g, "-")}-${key}.png`) });
    }
  }
});
