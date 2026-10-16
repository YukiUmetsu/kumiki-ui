import path from "node:path";
import { expect, test, type Locator, type Page } from "@playwright/test";

const AXE_PATH = path.join(process.cwd(), "node_modules", "axe-core", "axe.min.js");

const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

type AxeViolation = { id: string; impact: string | null; help: string; nodes: { target: string[] }[] };

/**
 * Colour transitions (buttons animate for `--km-duration-short`) briefly blend
 * foreground and background colours, so anything that samples computed colours
 * must wait until finite animations have finished.
 */
async function settle(page: Page) {
  await page.waitForFunction(() =>
    document.getAnimations().every((animation) => {
      if (animation.playState !== "running") return true;
      // Infinite animations (the loading spinner) never finish; ignore them.
      return animation.effect?.getComputedTiming().iterations === Infinity;
    })
  );
}

async function runAxe(page: Page): Promise<AxeViolation[]> {
  await page.addScriptTag({ path: AXE_PATH });
  return page.evaluate(async (tags) => {
    const axe = (window as unknown as { axe: { run: (ctx: Document, opts: unknown) => Promise<{ violations: unknown[] }> } }).axe;
    const results = await axe.run(document, { runOnly: { type: "tag", values: tags } });
    return results.violations as never;
  }, AXE_TAGS) as Promise<AxeViolation[]>;
}

function describeViolations(violations: AxeViolation[]) {
  return violations.map(
    (violation) =>
      `${violation.id} (${violation.impact}): ${violation.nodes.map((node) => node.target.join(" ")).join(", ")}`
  );
}

/** Contrast ratio of an element's text (or of `against` when given a colour) versus its effective background. */
async function contrastOf(target: Locator, against: "text" | string): Promise<number> {
  return target.evaluate((element, mode) => {
    const parse = (value: string) => value.match(/[\d.]+/g)?.slice(0, 3).map(Number) ?? [0, 0, 0];
    const luminance = (rgb: number[]) =>
      rgb
        .map((channel) => {
          const c = channel / 255;
          return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
        })
        .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
    const isTransparent = (value: string) =>
      value === "transparent" || /rgba\([^)]*,\s*0\s*\)$/.test(value);

    const styles = getComputedStyle(element);
    const foreground = luminance(parse(mode === "text" ? styles.color : mode));

    // Walk up until an actually painted background is found.
    let node: Element | null = element;
    let backdrop = "";
    while (node) {
      const candidate = getComputedStyle(node).backgroundColor;
      if (!isTransparent(candidate)) {
        backdrop = candidate;
        break;
      }
      node = node.parentElement;
    }
    const background = luminance(parse(backdrop || "rgb(255, 255, 255)"));

    return (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05);
  }, against);
}

async function setAppearance(page: Page, appearance: "light" | "dark") {
  const current = await page.locator("html").getAttribute("data-km-appearance");
  if (current !== appearance) {
    await page.getByRole("button", { name: /^(Dark|Light) appearance$/ }).click();
  }
  await expect(page.locator("html")).toHaveAttribute("data-km-appearance", appearance);
  await settle(page);
}

/** True when keyboard focus has reached the page content that sits behind the dialog. */
async function focusIsBehindDialog(page: Page) {
  return page.evaluate(() => {
    const active = document.activeElement as HTMLElement | null;
    if (!active || active === document.body) return false;
    return Boolean(active.closest("main")) && !active.closest("[data-km-dialog]");
  });
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("loads with no console or page errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(String(error)));

  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(errors).toEqual([]);
});

test("has no axe violations in light and dark appearance", async ({ page }) => {
  await settle(page);
  expect(describeViolations(await runAxe(page))).toEqual([]);

  await setAppearance(page, "dark");
  expect(describeViolations(await runAxe(page))).toEqual([]);
});

test("never scrolls horizontally, from 320px up", async ({ page }) => {
  for (const width of [320, 375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(overflow.scrollWidth, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(
      overflow.clientWidth + 1
    );
  }
});

test("keeps every control at or above the 24x24 minimum target size", async ({ page }) => {
  const buttons = page.getByRole("button");
  const count = await buttons.count();
  expect(count).toBeGreaterThan(5);

  for (let index = 0; index < count; index += 1) {
    const box = await buttons.nth(index).boundingBox();
    expect(box, `button ${index} has no box`).not.toBeNull();
    expect(box!.width, `button ${index} width`).toBeGreaterThanOrEqual(24);
    expect(box!.height, `button ${index} height`).toBeGreaterThanOrEqual(24);
  }
});

test("input boundary and copy keep their contrast in both appearances", async ({ page }) => {
  const input = page.getByLabel("Bare input");

  for (const appearance of ["light", "dark"] as const) {
    await setAppearance(page, appearance);

    // Non-text contrast (WCAG 1.4.11): the field boundary must stay >= 3:1.
    const border = await input.evaluate((element) => getComputedStyle(element).borderTopColor);
    expect(await contrastOf(input, border), `${appearance} input border contrast`).toBeGreaterThanOrEqual(3);

    // Text contrast (WCAG 1.4.3) for hint and error copy.
    expect(
      await contrastOf(page.getByText("Password is required."), "text"),
      `${appearance} error text contrast`
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      await contrastOf(page.getByText("We never share your address."), "text"),
      `${appearance} hint text contrast`
    ).toBeGreaterThanOrEqual(4.5);
  }
});

test("keyboard focus reaches controls and paints a focus indicator", async ({ page }) => {
  await page.keyboard.press("Tab");
  const focused = page.locator(":focus");
  await expect(focused).toHaveRole("button");
  const shadow = await focused.evaluate((element) => getComputedStyle(element).boxShadow);
  expect(shadow).not.toBe("none");
});

test("dialog traps focus, closes on Escape and restores focus and scroll", async ({ page }) => {
  const trigger = page.getByRole("button", { name: "Open dialog" });
  await trigger.click();

  const dialog = page.getByRole("dialog", { name: "Confirm action" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAccessibleDescription("This action cannot be undone.");

  // Focus must move inside the dialog.
  await expect.poll(() => dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true);

  // Scroll must be locked while the modal is open.
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.body).overflowY)).toBe("hidden");

  // Tabbing must never reach the page behind the dialog. Base UI redirects
  // focus from its (invisible) focus guards on the next animation frame, so a
  // realistic key cadence is required for a meaningful assertion.
  let stayedInside = 0;
  for (let index = 0; index < 12; index += 1) {
    await page.keyboard.press("Tab");
    await page.waitForTimeout(60);
    expect(await focusIsBehindDialog(page), `tab ${index + 1} reached the page behind`).toBe(false);
    if (await dialog.evaluate((el) => el.contains(document.activeElement))) stayedInside += 1;
  }
  expect(stayedInside).toBeGreaterThan(6);

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.body).overflowY)).not.toBe("hidden");
});

test("reduced motion stops the loading spinner", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const spinner = page.locator("svg.animate-spin").first();
  await expect(spinner).toBeAttached();
  const duration = await spinner.evaluate((element) => getComputedStyle(element).animationDuration);
  expect(parseFloat(duration)).toBeLessThan(0.05);
  await page.emulateMedia({ reducedMotion: "no-preference" });
});

test("long CJK input does not break the layout", async ({ page }) => {
  const field = page.getByLabel("Email");
  await field.fill("日本語のとても長いメールアドレスのテスト入力です@example.com".repeat(3));

  const fieldBox = await field.boundingBox();
  const sectionBox = await page.locator("section", { hasText: "Fields" }).boundingBox();
  expect(fieldBox!.x + fieldBox!.width).toBeLessThanOrEqual(sectionBox!.x + sectionBox!.width + 1);
});

test("visual baselines: light, dark, narrow and dialog", async ({ page }) => {
  await settle(page);
  await expect(page).toHaveScreenshot("showcase-light-1440.png", { fullPage: true });

  await setAppearance(page, "dark");
  await expect(page).toHaveScreenshot("showcase-dark-1440.png", { fullPage: true });

  await setAppearance(page, "light");
  await page.setViewportSize({ width: 320, height: 900 });
  await expect(page).toHaveScreenshot("showcase-light-320.png", { fullPage: true });

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole("button", { name: "Open dialog" }).click();
  await expect(page.getByRole("dialog", { name: "Confirm action" })).toBeVisible();
  await expect(page).toHaveScreenshot("dialog-open-1440.png");
});
