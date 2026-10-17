import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

const AXE_PATH = path.join(process.cwd(), "node_modules", "axe-core", "axe.min.js");

const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

type AxeViolation = { id: string; impact: string | null; help: string; nodes: { target: string[] }[] };

/**
 * Colour transitions (buttons animate for `--km-duration-short`) briefly blend
 * foreground and background colours, so anything that samples computed colours
 * must wait until finite animations have finished. Infinite animations (the
 * indeterminate progress bar) never finish and are ignored.
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
      const axe = (window as unknown as { axe: { run: (ctx: Element | Document, opts: unknown) => Promise<{ violations: unknown[] }> } }).axe;
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
 * The patterns page has no appearance toggle of its own, so the theme is set the
 * same way the shell does: the `data-km-appearance` attribute on `<html>`. The
 * semantic-token blocks for both appearances live on that selector.
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

/** Navigate to the patterns hash route and wait for it to render and settle. */
async function openPatterns(page: Page) {
  await page.goto("/#/patterns");
  await expect(page.getByRole("heading", { level: 1, name: "Application patterns" })).toBeVisible();
  await settle(page);
}

/**
 * Force a clean remount of the patterns route. `goto("/#/patterns")` when the
 * hash is already `#/patterns` is a same-document no-op, so state would survive;
 * a reload guarantees a fresh page.
 */
async function reloadPatterns(page: Page) {
  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: "Application patterns" })).toBeVisible();
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

/**
 * Shared close-out for every pattern test: a full-page visual baseline in the
 * light appearance, an axe audit of the pattern under test in both appearances,
 * and no horizontal overflow at 320/375/768/1440.
 *
 * The axe audit is scoped to the pattern's own section so one pattern's
 * pre-existing defect cannot fail every other pattern's test; each pattern is
 * still audited in both appearances.
 */
async function audit(page: Page, screenshot: string, section: string) {
  const scope = `[data-pattern-section="${section}"]`;

  await setAppearance(page, "light");
  await expect(page).toHaveScreenshot(screenshot, { fullPage: true });

  expect(describeViolations(await runAxe(page, scope)), "axe (light)").toEqual([]);
  await setAppearance(page, "dark");
  expect(describeViolations(await runAxe(page, scope)), "axe (dark)").toEqual([]);

  await setAppearance(page, "light");
  for (const width of [320, 375, 768, 1440]) {
    await expectNoHorizontalOverflow(page, width);
  }
}

test.describe("Application patterns", () => {
  test("search and results: query, select + checkbox filters, dismiss a chip", async ({ page }) => {
    const errors = trackErrors(page);
    await openPatterns(page);

    const section = page.locator('[data-pattern-section="search"]');
    const count = section.locator('[data-part="count"]');
    const rows = section.locator('[data-part="result"]');
    const search = page.getByRole("searchbox", { name: "Search items" });

    // `/` focuses the search field from outside a text field.
    await page.keyboard.press("/");
    await expect(search).toBeFocused();

    await search.fill("0");
    await expect(count).toHaveText("5 results");
    await expect(rows).toHaveCount(5);

    // A query with no matches shows the unified empty copy. With no filters
    // active it is the bare message.
    await search.fill("zzzz");
    await expect(rows).toHaveCount(0);
    await expect(section.locator('[data-part="empty"]')).toHaveText("No items found.");
    await search.fill("0");
    await expect(count).toHaveText("5 results");
    await expect(rows).toHaveCount(5);

    // Select filter (single choice): Type = Note.
    await section.getByRole("combobox", { name: "Type" }).click();
    await page.getByRole("option", { name: "Note", exact: true }).click();
    await expect(count).toHaveText("4 results");
    await expect(rows).toHaveCount(4);

    // Checkbox filter (multi choice): Status = Active.
    await section.getByRole("checkbox", { name: "Active" }).click();
    await expect(count).toHaveText("3 results");
    await expect(rows).toHaveCount(3);

    // Dismiss the Status chip: the result set widens back.
    await page.getByRole("button", { name: "Remove Status: Active" }).click();
    await expect(count).toHaveText("4 results");
    await expect(rows).toHaveCount(4);

    // With a filter still active, the empty copy gains the removal hint.
    await search.fill("zzzz");
    await expect(rows).toHaveCount(0);
    await expect(section.locator('[data-part="empty"]')).toHaveText(
      "No items found. Try removing a filter."
    );
    await search.fill("0");
    await expect(count).toHaveText("4 results");
    await expect(rows).toHaveCount(4);

    await audit(page, "search-and-results.png", "search");
    expect(errors).toEqual([]);
  });

  test("settings section: edit a field, save, saved status", async ({ page }) => {
    const errors = trackErrors(page);
    await openPatterns(page);

    const form = page.locator("form[data-km-settings-section]");
    const save = form.getByRole("button", { name: "Save" });

    await expect(save).toBeDisabled();
    await form.getByLabel("Display name").fill("Renamed runner");
    await expect(save).toBeEnabled();

    await save.click();
    await expect(form.getByText("Settings saved.")).toBeVisible();
    await expect(form).toHaveAttribute("data-state", "saved");
    // A successful save moves the dirty baseline forward, so the action returns
    // to its honest disabled state.
    await expect(save).toBeDisabled();

    await audit(page, "settings-section.png", "settings");
    expect(errors).toEqual([]);
  });

  test("process monitor: run to completion, then cancel a fresh run", async ({ page }) => {
    const errors = trackErrors(page);
    await openPatterns(page);

    const section = page.locator('[data-pattern-section="process"]');
    await section.getByRole("button", { name: "Start task" }).click();

    // Cancel is offered while the task runs.
    await expect(section.getByRole("button", { name: "Cancel" })).toBeVisible();

    // Every stage advances to the terminal completed state.
    await expect(section.getByText("Task completed", { exact: true })).toBeVisible({ timeout: 15000 });
    await expect(section.getByText("All stages finished.", { exact: true })).toBeVisible();
    await expect(section.locator('[data-part="stage"][data-status="done"]')).toHaveCount(4);
    await expect(section.getByRole("button", { name: "Dismiss" })).toBeVisible();

    await audit(page, "process-monitor.png", "process");

    // Fresh navigation: the cancel flow is a separate user task.
    await reloadPatterns(page);
    const cancelSection = page.locator('[data-pattern-section="process"]');
    await cancelSection.getByRole("button", { name: "Start task" }).click();
    await cancelSection.getByRole("button", { name: "Cancel" }).click();

    await expect(cancelSection.locator('[data-km-process-monitor]')).toHaveAttribute("data-status", "cancelled");
    await expect(cancelSection.getByText("Task stopped", { exact: true })).toBeVisible();
    await expect(cancelSection.getByText("Remaining stages were skipped.", { exact: true })).toBeVisible();
    await expect(cancelSection.locator('[data-part="stage"][data-status="active"]')).toHaveCount(0);

    expect(errors).toEqual([]);
  });

  test("resource explorer: keyboard select, rename, reorder", async ({ page }) => {
    const errors = trackErrors(page);
    await openPatterns(page);

    const section = page.locator('[data-pattern-section="resource"]');
    const tree = section.getByRole("tree", { name: "Items" });

    // Select a row with the keyboard.
    const documents = tree.getByRole("treeitem", { name: "Documents" });
    await documents.focus();
    await page.keyboard.press("Enter");
    await expect(documents).toHaveAttribute("aria-selected", "true");

    // Selection is marked by a start-edge indicator (neutral foreground, not the
    // old emerald), so it is never conveyed by colour alone.
    await expect(documents.locator('[data-part="indicator"]')).toBeVisible();

    // Rename it with F2 + Enter.
    await page.keyboard.press("F2");
    const rename = section.getByRole("textbox", { name: "Rename: Documents" });
    await expect(rename).toBeVisible();
    await rename.fill("Library");
    await page.keyboard.press("Enter");
    await expect(tree.getByRole("treeitem", { name: "Library" })).toBeVisible();
    await expect(tree.getByRole("treeitem", { name: "Documents" })).toHaveCount(0);

    // Trigger a reorder action from the row's actions menu.
    await section.getByRole("button", { name: "More actions: Library" }).click();
    await page.getByRole("menuitem", { name: "Move down" }).click();

    // The moved row is now the second root-level row and the undo affordance
    // reports the change.
    //
    // The treeitem no longer forces a label-only `aria-label`: its accessible
    // name is computed from its content, so it now contains the visible text —
    // the row label plus the child-count Badge (and the nested actions button's
    // name), e.g. "Items 3 …" / "Library 2 …". That is the fix for the previous
    // WCAG 2.5.3 `label-content-name-mismatch` axe failure. These assertions
    // therefore match the leading "<label> <count>" of the accessible name
    // rather than the bare label.
    const rootRows = tree.locator('[role="treeitem"][aria-level="1"]');
    await expect(rootRows.first()).toHaveAccessibleName(/^Items\s+3\b/);
    await expect(rootRows.nth(1)).toHaveAccessibleName(/^Library\s+2\b/);
    await expect(section.locator('[data-part="undo-message"]')).toContainText("Moved");

    await audit(page, "resource-explorer.png", "resource");
    expect(errors).toEqual([]);
  });

  test("data and details workspace: sort, select, detail follows selection", async ({ page }) => {
    const errors = trackErrors(page);
    await openPatterns(page);

    const section = page.locator('[data-pattern-section="workspace"]');
    const rows = section.locator("[data-row-id]");
    const detail = section.locator('[data-part="detail"]');

    // Sort by the Updated column.
    await section.getByRole("button", { name: "Updated" }).click();
    await expect(rows.first()).toHaveAttribute("data-row-id", "item-04");

    // Select a row: the detail pane shows it.
    await section.locator('[data-row-id="item-02"]').click();
    await expect(section.locator('[data-km-data-details-workspace]')).toHaveAttribute("data-has-selection", "");
    await expect(detail.getByRole("heading", { name: "Item 02" })).toBeVisible();
    await expect(detail.getByText("Archived")).toBeVisible();

    // Every selectable row exposes a radio so the same selection is reachable and
    // committed entirely by keyboard; the selected row's radio is checked and named.
    await expect(rows.locator('[data-part="select"]')).toHaveCount(5);
    await expect(section.locator('[data-row-id="item-02"] [data-part="select"]')).toBeChecked();
    await expect(
      section.locator('[data-row-id="item-02"] [data-part="select"]')
    ).toHaveAccessibleName("Select Item 02");
    await expect(section.locator('[data-row-id="item-01"] [data-part="select"]')).not.toBeChecked();

    // Selecting another row updates the detail pane.
    await section.locator('[data-row-id="item-03"]').click();
    await expect(detail.getByRole("heading", { name: "Item 03" })).toBeVisible();
    await expect(detail.getByText("2026-10-12")).toBeVisible();

    await audit(page, "data-details-workspace.png", "workspace");
    expect(errors).toEqual([]);
  });

  test("guided form: complete, hit validation, fix it, submit", async ({ page }) => {
    const errors = trackErrors(page);
    await openPatterns(page);

    const guided = page.locator('[data-pattern-section="guided"]');
    const form = guided.locator("[data-km-guided-form]");
    // Only the active step's panel is mounted, so the active step is identified by
    // its heading role. Step headings are `h3` under the section's `h2`.
    const stepHeading = (name: string) =>
      guided.getByRole("heading", { level: 3, name, exact: true });

    // Step 1 (Details): complete it and advance.
    await guided.getByLabel("Name").fill("Quarterly report");
    await guided.getByRole("combobox", { name: "Category" }).click();
    await page.getByRole("option", { name: "Documents", exact: true }).click();
    await guided.getByRole("button", { name: "Next" }).click();
    await expect(stepHeading("Preferences")).toBeVisible();

    // Step 2 (Preferences): press Next with no language to trigger validation.
    await guided.getByRole("button", { name: "Next" }).click();
    const summary = guided.locator('[data-part="error-summary"]');
    await expect(summary).toBeVisible();
    await expect(summary).toContainText("Please fix the following errors");
    await expect(summary).toContainText("Choose a language.");
    // Forward navigation was blocked.
    await expect(form).toHaveAttribute("data-step", "1");

    // Fix the error and advance to the final submit step.
    await guided.getByRole("combobox", { name: "Language" }).click();
    await page.getByRole("option", { name: "English", exact: true }).click();
    await guided.getByRole("button", { name: "Next" }).click();
    await expect(stepHeading("Review")).toBeVisible();
    await expect(summary).toBeHidden();

    const submit = guided.getByRole("button", { name: "Submit" });
    await expect(submit).toBeVisible();
    await submit.click();
    await expect(guided.getByText("Completed.", { exact: true })).toBeVisible();

    await audit(page, "guided-form.png", "guided");
    expect(errors).toEqual([]);
  });
});
