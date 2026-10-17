import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

/**
 * Browser-level acceptance for the motion gallery showcase served at `#/motion`
 * (rendered by `src/pages/motion-gallery.tsx`). The page is a single scrolling
 * document with one `PatternSection` per MG1 capability.
 *
 * The spec runs against the production build (`vite preview`), so it must only
 * rely on shipped behaviour.
 */
const AXE_PATH = path.join(process.cwd(), "node_modules", "axe-core", "axe.min.js");

const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

/** Section ids rendered by the page's local `PatternSection`. */
const SECTION_IDS = [
  "timelines",
  "kinetic",
  "shared-elements",
  "vector-draw",
  "shape-morph",
  "masks",
  "motion-paths",
  "easing-springs",
  "presets",
  "storyboard",
  "golden-fixtures",
] as const;

type AxeViolation = { id: string; impact: string | null; help: string; nodes: { target: string[] }[] };

/**
 * Colour transitions (buttons and switches animate for `--km-duration-short`)
 * briefly blend foreground and background colours, so anything that samples
 * computed colours must wait until finite animations have finished.
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

async function openMotion(page: Page) {
  await page.goto("/#/motion");
  await expect(page.getByRole("heading", { level: 1, name: "Motion gallery" })).toBeVisible();
  await settle(page);
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

test.describe("Motion gallery", () => {
  test("route renders the shell, every section and a valid heading outline", async ({ page }) => {
    const errors = trackErrors(page);
    await openMotion(page);

    await expect(page.getByRole("heading", { level: 1, name: "Motion gallery" })).toBeVisible();

    for (const id of SECTION_IDS) {
      await expect(page.locator(`[data-pattern-section="${id}"]`), `section ${id} present`).toHaveCount(1);
    }

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

    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);

    expect(errors).toEqual([]);
  });

  test("visual baselines: light, dark and narrow", async ({ page }) => {
    await openMotion(page);

    await setAppearance(page, "light");
    await expect(page).toHaveScreenshot("motion-gallery-light-1440.png", { fullPage: true });

    await setAppearance(page, "dark");
    await expect(page).toHaveScreenshot("motion-gallery-dark-1440.png", { fullPage: true });

    await setAppearance(page, "light");
    await page.setViewportSize({ width: 375, height: 900 });
    await settle(page);
    await expect(page).toHaveScreenshot("motion-gallery-light-375.png", { fullPage: true });

    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test("has no axe violations in light and dark appearance", async ({ page }) => {
    const errors = trackErrors(page);
    await openMotion(page);

    await setAppearance(page, "light");
    expect(describeViolations(await runAxe(page)), "axe (light)").toEqual([]);

    await setAppearance(page, "dark");
    expect(describeViolations(await runAxe(page)), "axe (dark)").toEqual([]);

    expect(errors).toEqual([]);
  });

  test("never scrolls horizontally, from 320px up", async ({ page }) => {
    await openMotion(page);
    for (const width of [320, 375, 768, 1440]) {
      await expectNoHorizontalOverflow(page, width);
    }
  });

  test("timelines: deterministic frame evaluation updates the sample table", async ({ page }) => {
    const errors = trackErrors(page);
    await openMotion(page);

    const section = page.locator('[data-pattern-section="timelines"]');
    const table = section.locator("table");

    await expect(table).toBeVisible();
    await expect(section.getByText("Seek order check")).toBeVisible();
    await expect(section.getByText("Matched")).toBeVisible();

    const slider = section.getByRole("slider", { name: "Timeline frame" });
    await slider.focus();
    await slider.press("End");
    await expect(section.locator('[data-km-motion-scrubber]')).toContainText("89");

    expect(errors).toEqual([]);
  });

  test("kinetic typography: granularity and direction controls change the render", async ({ page }) => {
    const errors = trackErrors(page);
    await openMotion(page);

    const section = page.locator('[data-pattern-section="kinetic"]');

    await section.getByRole("combobox", { name: "Granularity" }).click();
    await page.getByRole("option", { name: "Word", exact: true }).click();

    await section.getByRole("combobox", { name: "Direction" }).click();
    await page.getByRole("option", { name: "Reverse", exact: true }).click();

    await section.getByRole("combobox", { name: "Preset" }).click();
    await page.getByRole("option", { name: "Scale pop", exact: true }).click();

    await expect(section.locator('[data-km-kinetic-text]')).toHaveCount(2);

    expect(errors).toEqual([]);
  });

  test("masks: each matte kind renders with its capability and fallback chips", async ({ page }) => {
    const errors = trackErrors(page);
    await openMotion(page);

    const section = page.locator('[data-pattern-section="masks"]');

    await expect(section.getByText("mask-clip")).toBeVisible();
    await expect(section.getByText("mask-alpha")).toBeVisible();
    await expect(section.getByText("mask-luma")).toBeVisible();
    await expect(section.locator('[data-km-mask-reveal]')).toHaveCount(3);

    expect(errors).toEqual([]);
  });

  test("storyboard: positive fixtures validate cleanly and negative fixture shows diagnostics", async ({ page }) => {
    const errors = trackErrors(page);
    await openMotion(page);

    const section = page.locator('[data-pattern-section="storyboard"]');

    await expect(section.getByText("No diagnostics.")).toHaveCount(2);

    const teaching = section.locator("[data-km-surface='root']", {
      hasText: "Teaching example",
    });
    await expect(teaching).toBeVisible();
    await expect(teaching.locator("li").first()).toBeVisible();

    expect(errors).toEqual([]);
  });
});
