import { expect, test } from "@playwright/test";

const prefix = "video-production-scene-templates-3d-everyday-objects--";

for (const story of ["cinematic-desk-explainer-capture", "invoice-to-software-capture", "epic-book-storytelling-capture", "document-investigation-capture", "travel-study-capture"]) {
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

test("travel study has a rendered atlas and deterministic spinning globe at different frames", async ({ page }, info) => {
  await page.goto(`/iframe.html?id=${prefix}travel-study-capture&viewMode=story&kmExport=1`);
  const canvas = page.locator("[data-km-hero-viewer] canvas");
  await expect(canvas).toHaveAttribute("data-km-hero-ready", "true", { timeout: 30000 });
  const before = await canvas.screenshot({ path: info.outputPath("travel-study-start.png") });
  await page.evaluate(async () => { await window.__kmVideoExport?.seek(90); });
  await expect(canvas).toHaveAttribute("data-km-hero-frame", "90");
  const after = await canvas.screenshot({ path: info.outputPath("travel-study-mid.png") });
  expect(after.equals(before)).toBe(false);
  await page.evaluate(async () => { await window.__kmVideoExport?.seek(9); });
  await page.evaluate(async () => { await window.__kmVideoExport?.seek(90); });
  expect(await canvas.screenshot()).toEqual(after);
  await expect(page.locator("[role=alert]")).toHaveCount(0);
});

test("travel map and photographic prints do not flash between adjacent film frames", async ({ page }) => {
  await page.goto(`/iframe.html?id=${prefix}travel-study-capture&viewMode=story&kmExport=1`);
  const canvas = page.locator("[data-km-hero-viewer] canvas");
  await expect(canvas).toHaveAttribute("data-km-hero-ready", "true", { timeout: 30000 });
  // Measure the actual WebGL drawing buffer, not a mocked CSS/image layer.
  // Wide interiors move only a fraction of a pixel per frame here; a sudden
  // large jump means the near-coplanar atlas/photographic paper lost depth.
  const samples: number[][][] = [];
  for (let frame = 60; frame <= 72; frame++) {
    await page.evaluate(async f => { await window.__kmVideoExport?.seek(f); }, frame);
    await expect(canvas).toHaveAttribute("data-km-hero-frame", String(frame));
    samples.push(await canvas.evaluate(element => {
      const node = element as HTMLCanvasElement;
      const gl = node.getContext("webgl2");
      if (!gl) throw new Error("Travel print stability test requires WebGL2.");
      const regions = [
        { x: 415, y: 137, w: 180, h: 85 }, // interior of the large atlas
        { x: 318, y: 237, w: 23, h: 39 },  // left pinned travel picture
        { x: 721, y: 236, w: 30, h: 40 },  // right pinned travel picture
      ];
      const sx = node.width / 960, sy = node.height / 540;
      return regions.map(rect => {
        const x = Math.floor(rect.x * sx), w = Math.floor(rect.w * sx);
        const h = Math.floor(rect.h * sy);
        const y = node.height - Math.floor(rect.y * sy) - h;
        const pixels = new Uint8Array(w * h * 4);
        gl.readPixels(x, y, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
        const rgb = [0, 0, 0];
        for (let i = 0; i < pixels.length; i += 4) {
          rgb[0] += pixels[i]; rgb[1] += pixels[i + 1]; rgb[2] += pixels[i + 2];
        }
        return rgb.map(v => v / (w * h));
      });
    }));
  }
  for (let frame = 1; frame < samples.length; frame++) for (let region = 0; region < 3; region++) {
    const jump = Math.max(...samples[frame][region].map((channel, i) =>
      Math.abs(channel - samples[frame - 1][region][i])));
    expect(jump, `printed region ${region} flashed between frames ${59 + frame} and ${60 + frame}`)
      .toBeLessThan(16);
  }
});

test("bookbinding shows worked spines and page edges in real closeups", async ({ page }, info) => {
  await page.goto(`/iframe.html?id=${prefix}object-gallery&viewMode=story`);
  const canvas = page.locator("[data-km-hero-viewer] canvas");
  await expect(canvas).toHaveAttribute("data-km-hero-ready", "true", { timeout: 30000 });
  await page.getByRole("button", { name: "book-stack", exact: true }).click();
  await expect(canvas).toHaveAttribute("aria-label", "book-stack physical 3D inspection");
  await page.getByLabel("Camera zoom").evaluate(element => {
    const input = element as HTMLInputElement;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(input, "1.4");
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await canvas.screenshot({ path: info.outputPath("worked-bookbinding-front.png") });
  await page.getByLabel("Viewing angle").evaluate(element => {
    const input = element as HTMLInputElement;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(input, "-65");
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await canvas.screenshot({ path: info.outputPath("worked-bookbinding-boards-and-edges.png") });
  await expect(page.locator("[role=alert]")).toHaveCount(0);
});

test("gallery inspects existing assets, finishes and lighting", async ({ page }, info) => {
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
  for (const kind of ["desk", "white desk", "travel desk", "laptop", "smartphone", "paper", "invoice", "folder", "pen", "hardcover"]) {
    await page.getByRole("button", { name: kind, exact: true }).click();
    await expect(canvas).toHaveAttribute("aria-label", `${kind} physical 3D inspection`);
    await expect(canvas).toHaveAttribute("data-km-hero-ready", "true");
    await expect(page.locator("[role=alert]")).toHaveCount(0);
    await canvas.screenshot({ path: info.outputPath(`object-${kind.replace(/\s+/g, "-")}-front.png`) });
  }
});

test("travel-object gallery renders each crafted asset from two views with controls", async ({ page }, info) => {
  await page.goto(`/iframe.html?id=${prefix}object-gallery&viewMode=story`);
  const canvas = page.locator("[data-km-hero-viewer] canvas");
  await expect(canvas).toHaveAttribute("data-km-hero-ready", "true", { timeout: 30000 });
  for (const kind of ["chair", "world-map", "globe", "photograph", "travel-poster", "book-stack", "clock", "desk-lamp"]) {
    await page.getByRole("button", { name: kind, exact: true }).click();
    await expect(canvas).toHaveAttribute("aria-label", `${kind} physical 3D inspection`);
    await expect(canvas).toHaveAttribute("data-km-hero-ready", "true");
    await expect(page.locator("[role=alert]")).toHaveCount(0);
    for (const [angle, key] of [[-20, "front"], [55, "detail"]] as const) {
      await page.getByLabel("Viewing angle").evaluate((element, value) => {
        const input = element as HTMLInputElement;
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(input, String(value));
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
      }, angle);
      await canvas.screenshot({ path: info.outputPath(`travel-object-${kind}-${key}.png`) });
    }
  }
  await page.getByRole("button", { name: "globe", exact: true }).click();
  await expect(page.getByRole("combobox", { name: "Action", exact: true })).toHaveValue("spin");
  for (const [name, value] of [["Camera elevation", "5"], ["Camera zoom", "1.6"]] as const)
    await page.getByLabel(name).evaluate((element, next) => {
      const input = element as HTMLInputElement;
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(input, next);
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }, value);
  await expect(page.getByLabel("Camera zoom")).toHaveValue("1.6");
});
