import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

import { PHASE2_EXAMPLES } from "../../src/infographic/fixtures";

/**
 * Browser-level acceptance for the infographic gallery served at `#/infographic`
 * (rendered by `src/pages/infographic-gallery.tsx`). The page is a single
 * scrolling document with one `PatternSection` per capability, so the checks
 * below mirror `media-compositions.spec.ts`: a shared `settle`, an injected
 * axe-core audit, appearance switching through `data-km-appearance`, screenshot
 * baselines and the same horizontal-overflow probe.
 *
 * The spec runs against the production build (`vite preview`), so it must only
 * rely on shipped behaviour.
 */
const AXE_PATH = path.join(process.cwd(), "node_modules", "axe-core", "axe.min.js");

const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

/** Section ids rendered by the page's local `PatternSection`. */
const SECTION_IDS = ["overview", "examples", "art-directions", "output-profiles", "export"] as const;

type AxeViolation = { id: string; impact: string | null; help: string; nodes: { target: string[] }[] };

/**
 * Colour transitions (buttons and switches animate for `--km-duration-short`)
 * briefly blend foreground and background colours, so anything that samples
 * computed colours — including axe's contrast pass — must wait until finite
 * animations have finished. Infinite animations never finish and are ignored.
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
 * The export section embeds the static SVG as a `data:` image; a scroll pass
 * forces it (and any other deferred image) to start decoding so the baseline is
 * fully painted and identical across runs.
 */
async function loadContent(page: Page) {
  await page.evaluate(async () => {
    const step = Math.max(200, window.innerHeight);
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((resolve) => window.setTimeout(resolve, 40));
    }
    window.scrollTo(0, 0);
  });

  await page.waitForFunction(() => Array.from(document.images).every((image) => image.complete));
  await page.evaluate(() => document.fonts.ready.then(() => null));
  await settle(page);
}

/** Navigate to the infographic hash route and wait for it to settle. */
async function openGallery(page: Page) {
  await page.goto("/#/infographic");
  await expect(page.getByRole("heading", { level: 1, name: "Infographic gallery" })).toBeVisible();
  for (const id of SECTION_IDS) {
    await expect(page.locator(`[data-pattern-section="${id}"]`)).toHaveCount(1);
  }
  await loadContent(page);
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

test.describe("Infographic gallery", () => {
  test("route renders the shell, every section and a valid heading outline", async ({ page }) => {
    const errors = trackErrors(page);
    await openGallery(page);

    // Exactly one page-level heading carries the page name.
    await expect(page.getByRole("heading", { level: 1, name: "Infographic gallery" })).toBeVisible();

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

    // The whole page exposes a single `h1`.
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);

    expect(errors).toEqual([]);
  });

  test("renders one labelled specimen per phase-two example", async ({ page }) => {
    const errors = trackErrors(page);
    await openGallery(page);

    const examples = page.locator('[data-pattern-section="examples"]');
    // NOTE: the brief referred to these by example id ("LinkedIn carousel",
    // "Pinterest infographic", "educational cheat sheet", "technical diagram").
    // Those are ids, not the visible copy: the page renders each example's
    // authored `label`, so the visible headings are asserted from the fixture.
    expect(PHASE2_EXAMPLES).toHaveLength(4);
    for (const example of PHASE2_EXAMPLES) {
      await expect(
        examples.getByRole("heading", { level: 3, name: example.label, exact: true }),
        `${example.id} label visible`
      ).toBeVisible();
    }

    // Each specimen paints at least one infographic and publishes its template.
    const views = examples.locator('[data-km-infographic="view"]');
    expect(await views.count()).toBeGreaterThanOrEqual(PHASE2_EXAMPLES.length);

    expect(errors).toEqual([]);
  });

  test("visual baselines: light, dark and narrow", async ({ page }) => {
    await openGallery(page);

    await setAppearance(page, "light");
    await expect(page).toHaveScreenshot("infographic-gallery-light-1440.png", { fullPage: true });

    await setAppearance(page, "dark");
    await expect(page).toHaveScreenshot("infographic-gallery-dark-1440.png", { fullPage: true });

    await setAppearance(page, "light");
    await page.setViewportSize({ width: 375, height: 900 });
    await settle(page);
    await expect(page).toHaveScreenshot("infographic-gallery-light-375.png", { fullPage: true });

    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test("has no axe violations in light and dark appearance", async ({ page }) => {
    const errors = trackErrors(page);
    await openGallery(page);

    await setAppearance(page, "light");
    expect(describeViolations(await runAxe(page)), "axe (light)").toEqual([]);

    await setAppearance(page, "dark");
    expect(describeViolations(await runAxe(page)), "axe (dark)").toEqual([]);

    expect(errors).toEqual([]);
  });

  test("never scrolls horizontally, from 320px up", async ({ page }) => {
    await openGallery(page);
    for (const width of [320, 375, 768, 1440]) {
      await expectNoHorizontalOverflow(page, width);
    }
  });
});
