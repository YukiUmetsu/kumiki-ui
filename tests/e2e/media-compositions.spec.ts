import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

/**
 * Browser-level acceptance for the media compositions showcase served at
 * `#/media` (rendered by `src/pages/media-compositions.tsx`). The page is a
 * single scrolling document with one `PatternSection` per capability, so the
 * checks below mirror `patterns.spec.ts`: a shared `settle`, an injected
 * axe-core audit, appearance switching through `data-km-appearance` and the
 * same horizontal-overflow probe.
 *
 * The spec runs against the production build (`vite preview`), so it must only
 * rely on shipped behaviour.
 */
const AXE_PATH = path.join(process.cwd(), "node_modules", "axe-core", "axe.min.js");

const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

/** Section ids rendered by the page's local `PatternSection`. */
const SECTION_IDS = ["artboard", "text", "media", "layers", "guides", "export", "golden"] as const;

type AxeViolation = { id: string; impact: string | null; help: string; nodes: { target: string[] }[] };

/**
 * Colour transitions (buttons and switches animate for `--km-duration-short`)
 * briefly blend foreground and background colours, so anything that samples
 * computed colours — including axe's contrast pass — must wait until finite
 * animations have finished. Infinite animations (the media skeleton's
 * `animate-pulse`) never finish and are ignored.
 */
async function settle(page: Page) {
  await page.waitForFunction(() =>
    document.getAnimations().every((animation) => {
      if (animation.playState !== "running") return true;
      return animation.effect?.getComputedTiming().iterations === Infinity;
    })
  );
}

async function runAxe(page: Page, rootSelector?: string): Promise<AxeViolation[]> {
  await page.addScriptTag({ path: AXE_PATH });
  return page.evaluate(
    async ({ tags, selector }) => {
      const axe = (
        window as unknown as {
          axe: { run: (ctx: Element | Document, opts: unknown) => Promise<{ violations: unknown[] }> };
        }
      ).axe;
      const root = selector ? document.querySelector(selector) ?? document : document;
      const results = await axe.run(root, { runOnly: { type: "tag", values: tags } });
      return results.violations as never;
    },
    { tags: AXE_TAGS, selector: rootSelector ?? null }
  ) as Promise<AxeViolation[]>;
}

function describeViolations(violations: AxeViolation[]) {
  return violations.map(
    (violation) =>
      `${violation.id} (${violation.impact}): ${violation.nodes.map((node) => node.target.join(" ")).join(", ")}`
  );
}

/**
 * The page has no appearance toggle of its own, so the theme is set the same way
 * every other spec does: the `data-km-appearance` attribute on `<html>`, where
 * the semantic-token blocks for both appearances live.
 */
async function setAppearance(page: Page, appearance: "light" | "dark") {
  await page.evaluate((value) => {
    document.documentElement.setAttribute("data-km-appearance", value);
  }, appearance);
  await expect(page.locator("html")).toHaveAttribute("data-km-appearance", appearance);
  await settle(page);
}

/** Registers console/page-error listeners and returns the (live) error list. */
function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(String(error)));
  return errors;
}

/**
 * The document renders many sibling artboards and lazy media frames, each of
 * which loads its own `data:` asset only once it enters the viewport. A scroll
 * pass forces every lazy image to start decoding, after which the baseline is
 * fully painted and identical across runs.
 */
async function loadLazyContent(page: Page) {
  await page.evaluate(async () => {
    const step = Math.max(200, window.innerHeight);
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((resolve) => window.setTimeout(resolve, 40));
    }
    window.scrollTo(0, 0);
  });

  await page.waitForFunction(() =>
    Array.from(document.images).every((image) => image.complete)
  );
  await page.waitForFunction(() =>
    Array.from(document.querySelectorAll("[data-km-media-frame]")).every((frame) => {
      const state = frame.getAttribute("data-km-media-state");
      return state === "loaded" || state === "error";
    })
  );
  await page.evaluate(() => document.fonts.ready.then(() => null));
  await settle(page);
}

/** Navigate to the media compositions hash route and wait for it to settle. */
async function openMedia(page: Page) {
  await page.goto("/#/media");
  await expect(
    page.getByRole("heading", { level: 1, name: "Media compositions" })
  ).toBeVisible();
  await loadLazyContent(page);
}

async function expectNoHorizontalOverflow(page: Page, width: number) {
  await page.setViewportSize({ width, height: 900 });
  const overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(overflow.scrollWidth, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(
    overflow.clientWidth + 1
  );
}

test.describe("Media compositions", () => {
  test("route renders the shell, every section and a valid heading outline", async ({ page }) => {
    const errors = trackErrors(page);
    await openMedia(page);

    // Exactly one page-level heading carries the page name.
    await expect(
      page.getByRole("heading", { level: 1, name: "Media compositions" })
    ).toBeVisible();

    // Every documented section is present exactly once.
    for (const id of SECTION_IDS) {
      await expect(
        page.locator(`[data-pattern-section="${id}"]`),
        `section ${id} present`
      ).toHaveCount(1);
    }

    // Each section is introduced by an `h2`, and no section skips a level on the
    // way down (a heading may never jump by more than one relative to the prior
    // heading inside the same section).
    const outline = await page.evaluate(() =>
      Array.from(document.querySelectorAll("[data-pattern-section]")).map((section) => ({
        id: section.getAttribute("data-pattern-section") ?? "",
        levels: Array.from(section.querySelectorAll("h1, h2, h3, h4, h5, h6")).map((heading) =>
          Number(heading.tagName.slice(1))
        ),
      }))
    );

    for (const entry of outline) {
      expect(entry.levels[0], `section ${entry.id} opens with an h2`).toBe(2);
      for (let index = 1; index < entry.levels.length; index += 1) {
        expect(
          entry.levels[index] - entry.levels[index - 1],
          `section ${entry.id} skips a heading level at index ${index}`
        ).toBeLessThanOrEqual(1);
      }
    }

    // The whole page exposes a single `h1`. Authored headings inside the
    // artboard previews must not join the host outline.
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);

    expect(errors).toEqual([]);
  });

  test("visual baselines: light, dark and narrow", async ({ page }) => {
    await openMedia(page);

    await setAppearance(page, "light");
    await expect(page).toHaveScreenshot("media-compositions-light-1440.png", { fullPage: true });

    await setAppearance(page, "dark");
    await expect(page).toHaveScreenshot("media-compositions-dark-1440.png", { fullPage: true });

    await setAppearance(page, "light");
    await page.setViewportSize({ width: 375, height: 900 });
    await settle(page);
    await expect(page).toHaveScreenshot("media-compositions-light-375.png", { fullPage: true });

    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test("has no axe violations in light and dark appearance", async ({ page }) => {
    const errors = trackErrors(page);
    await openMedia(page);

    await setAppearance(page, "light");
    expect(describeViolations(await runAxe(page)), "axe (light)").toEqual([]);

    await setAppearance(page, "dark");
    expect(describeViolations(await runAxe(page)), "axe (dark)").toEqual([]);

    expect(errors).toEqual([]);
  });

  test("never scrolls horizontally, from 320px up", async ({ page }) => {
    await openMedia(page);
    for (const width of [320, 375, 768, 1440]) {
      await expectNoHorizontalOverflow(page, width);
    }
  });

  test("artboard: zoom changes the rendered scale and overlays toggle on and off", async ({
    page,
  }) => {
    const errors = trackErrors(page);
    await openMedia(page);

    const section = page.locator('[data-pattern-section="artboard"]');
    const scaleWrapper = section.locator('[data-km-artboard="viewport"] > div').first();

    // The default fit is "contain"; switch to "none" so the wrapper's transform
    // is driven only by the Zoom control.
    await section.getByRole("combobox", { name: "Fit" }).click();
    await page.getByRole("option", { name: "None", exact: true }).click();

    // The artboard renders at the authoring zoom through the wrapper's inline
    // transform; changing the Zoom control must change that scale.
    const scaleBefore = await scaleWrapper.evaluate(
      (element) => (element as HTMLElement).style.transform
    );
    expect(scaleBefore).toBe("scale(1)");

    await section.getByRole("combobox", { name: "Zoom" }).click();
    await page.getByRole("option", { name: "150%", exact: true }).click();

    const scaleAfter = await scaleWrapper.evaluate(
      (element) => (element as HTMLElement).style.transform
    );
    expect(scaleAfter).toBe("scale(1.5)");
    expect(scaleAfter).not.toBe(scaleBefore);

    // Authoring overlays are added and removed by their switches.
    for (const [label, kind] of [
      ["Safe region", "safe-region"],
      ["Bleed", "bleed"],
      ["Crop", "crop"],
    ] as const) {
      const overlay = section.locator(`[data-km-artboard="${kind}"]`);
      const toggle = section.getByRole("switch", { name: label });

      await expect(overlay, `${kind} overlay hidden initially`).toHaveCount(0);
      await toggle.click();
      await expect(overlay, `${kind} overlay shown`).toHaveCount(1);
      await toggle.click();
      await expect(overlay, `${kind} overlay removed`).toHaveCount(0);
    }

    expect(errors).toEqual([]);
  });

  test("editable text: the fit policy switches the truncation marker and edits render", async ({
    page,
  }) => {
    const errors = trackErrors(page);
    await openMedia(page);

    const section = page.locator('[data-pattern-section="text"]');
    const editor = section.locator('[data-km-text="editor"]');
    const editorRoot = section.locator('[data-km-text="root"]:has([data-km-text="editor"])');
    const readOnlyRoot = section.getByRole("group", { name: "Read-only text specimen" });

    // The default specimen is a genuinely multi-span run. Editing it exercises
    // the flatten path: run boundaries cannot be recovered from `textContent`,
    // so the accepted edit collapses onto the first span. Before the fix this
    // threw `NotFoundError: removeChild`; a regression would surface as a page
    // error captured by `trackErrors`.
    const beforeEdit = (await editor.innerText()).trim();
    expect(beforeEdit, "the edited specimen carries several styled runs").toContain(
      "This run is italic and cool-toned."
    );
    expect(beforeEdit).toContain("And this closing run is underlined and warm.");

    await editor.fill("Edited copy for the showcase.");
    await expect(editor).toHaveText("Edited copy for the showcase.");
    expect((await editor.innerText()).trim()).not.toBe(beforeEdit);

    // A collapsed edit is disclosed as a machine-readable root diagnostic.
    await expect(editorRoot).toHaveAttribute("data-km-text-diagnostic", /spans-collapsed/);

    // The long-copy specimen is the one the truncation markers describe.
    await section.getByRole("button", { name: "Use long string" }).click();
    await expect(editor).toContainText("deliberately long sentence");

    // The read-only specimen honours the fit policy: wrap truncates and overflows.
    await expect(readOnlyRoot).toHaveAttribute("data-km-text-fit", "wrap");
    await expect(readOnlyRoot).toHaveAttribute("data-km-text-truncated", "");
    await expect(readOnlyRoot).toHaveAttribute("data-km-text-overflow", "");

    // While editing, the fit policy is suspended: no truncation, overflow is still
    // reported, and the root carries editing/fit-suspended markers.
    await expect(editorRoot).toHaveAttribute("data-km-text-editing", "true");
    await expect(editorRoot).toHaveAttribute("data-km-text-diagnostic", /fit-suspended/);
    await expect(editorRoot).not.toHaveAttribute("data-km-text-truncated");
    expect(await editorRoot.getAttribute("data-km-text-overflow")).not.toBeNull();

    // "clip" truncates the read-only render but the editor still reports overflow.
    await section.getByRole("combobox", { name: "Fit policy" }).click();
    await page.getByRole("option", { name: "Clip", exact: true }).click();
    await expect(readOnlyRoot).toHaveAttribute("data-km-text-fit", "clip");
    await expect(readOnlyRoot).toHaveAttribute("data-km-text-truncated", "");
    await expect(readOnlyRoot).not.toHaveAttribute("data-km-text-overflow");
    await expect(editorRoot).toHaveAttribute("data-km-text-fit", "clip");
    await expect(editorRoot).not.toHaveAttribute("data-km-text-truncated");
    expect(await editorRoot.getAttribute("data-km-text-overflow")).not.toBeNull();

    // "none" wraps without truncating, so only overflow is reported on either specimen.
    await section.getByRole("combobox", { name: "Fit policy" }).click();
    await page.getByRole("option", { name: "None", exact: true }).click();
    await expect(readOnlyRoot).toHaveAttribute("data-km-text-fit", "none");
    await expect(readOnlyRoot).not.toHaveAttribute("data-km-text-truncated");
    await expect(readOnlyRoot).toHaveAttribute("data-km-text-overflow", "");
    await expect(editorRoot).toHaveAttribute("data-km-text-fit", "none");
    await expect(editorRoot).not.toHaveAttribute("data-km-text-truncated");
    expect(await editorRoot.getAttribute("data-km-text-overflow")).not.toBeNull();

    expect(errors).toEqual([]);
  });

  test("layers: selection is shared and the visibility toggle removes the layer", async ({
    page,
  }) => {
    const errors = trackErrors(page);
    await openMedia(page);

    const section = page.locator('[data-pattern-section="layers"]');
    const tree = section.getByRole("tree", { name: "Layers" });
    const row = tree.locator('[data-km-layer="row"][data-layer-id="editorial-title"]');
    const canvasLayer = section.locator(
      '[data-km-layer="root"][data-layer-id="editorial-title"]'
    );

    await expect(row).toHaveAttribute("aria-selected", "false");

    await row.click();
    await expect(row).toHaveAttribute("aria-selected", "true");
    await expect(canvasLayer).toHaveAttribute("data-layer-selected", "true");

    // Hiding the layer removes it from the painted artboard but keeps the row.
    await row.getByRole("button", { name: /^Hide / }).click();
    await expect(canvasLayer).toHaveCount(0);
    await expect(row).toBeVisible();

    expect(errors).toEqual([]);
  });

  test("golden composition: a preset retarget resizes the artboard and reports diagnostics", async ({
    page,
  }) => {
    const errors = trackErrors(page);
    await openMedia(page);

    const section = page.locator('[data-pattern-section="golden"]');
    // Scope to the first composition through the title it owns: the title
    // block's grandparent is the composition root (header + presets + artboard +
    // diagnostics), so sibling compositions cannot satisfy the assertions.
    const composition = section
      .getByRole("heading", { name: "Wide hero" })
      .locator("..")
      .locator("..")
      .locator("..");

    await expect(composition.locator('[data-km-artboard-dimensions="1280x720"]')).toHaveCount(1);
    await expect(composition.locator('[data-km-artboard-dimensions="1080x1080"]')).toHaveCount(0);

    await composition.getByRole("button", { name: "9:16" }).click();

    await expect(
      composition.locator('[data-km-artboard-dimensions="1080x1920"]')
    ).toHaveCount(1);
    await expect(composition.getByText("1080 × 1920 px")).toBeVisible();

    // The reflow result's diagnostics are surfaced as text, not swallowed.
    await expect(composition.getByText(/media-alt-missing/).first()).toBeVisible();

    expect(errors).toEqual([]);
  });

  test("export: downloads a real SVG and renders broken-document diagnostics", async ({ page }) => {
    const errors = trackErrors(page);
    await openMedia(page);

    const section = page.locator('[data-pattern-section="export"]');

    // A clean document produces a real, named download.
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      section.getByRole("button", { name: "Download SVG" }).click(),
    ]);
    expect(download.suggestedFilename()).toBe("wide-hero-16x9.svg");

    // The deliberately broken fixture renders each diagnostic with its code and
    // the layer it is attributable to.
    const broken = section.locator('[data-km-surface="root"]', {
      hasText: "Dangling asset and font references",
    });
    await expect(broken.getByText("media-asset-missing", { exact: true })).toBeVisible();
    await expect(broken.getByText("layer dangling-media", { exact: true }).first()).toBeVisible();
    await expect(broken.getByText("text-font-missing", { exact: true })).toBeVisible();
    await expect(broken.getByText("layer dangling-text", { exact: true }).first()).toBeVisible();

    expect(errors).toEqual([]);
  });

  test("guides are authoring-only and never reach the export preview", async ({ page }) => {
    const errors = trackErrors(page);
    await openMedia(page);

    // The guides artwork region draws the authoring overlay.
    const guidesSection = page.locator('[data-pattern-section="guides"]');
    await expect(guidesSection.locator('[data-km-guides="root"]')).toHaveCount(1);
    expect(
      await guidesSection.locator('[data-km-guides="guide"]').count(),
      "static guides are drawn"
    ).toBeGreaterThan(0);
    await expect(guidesSection.locator('[data-km-guides="root"]')).toHaveAttribute(
      "data-km-guides-exportable",
      "false"
    );

    // The export preview region contains no authoring overlay at all.
    const preview = page.locator('[data-pattern-section="export"] [data-km-export="preview"]');
    await expect(preview).toHaveCount(1);
    await expect(preview.locator("[data-km-guides]")).toHaveCount(0);

    expect(errors).toEqual([]);
  });
});
