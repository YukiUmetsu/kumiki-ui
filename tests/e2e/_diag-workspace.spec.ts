import { expect, test } from "@playwright/test";

test("diag2: phantom column from row ::before", async ({ page }) => {
  await page.goto("/#/patterns");
  await expect(
    page.getByRole("heading", { level: 1, name: "Application patterns" })
  ).toBeVisible();

  const section = page.locator('[data-pattern-section="workspace"]');
  await section.locator('[data-row-id="item-02"]').click();
  await expect(
    section.locator("[data-km-data-details-workspace]")
  ).toHaveAttribute("data-has-selection", "");

  const measure = async (label: string) => {
    const data = await page.evaluate(() => {
      const sec = document.querySelector(
        '[data-pattern-section="workspace"]'
      ) as HTMLElement;
      const table = sec.querySelector("table") as HTMLElement;
      const tr = sec.querySelector("tr[data-selected]") as HTMLElement;
      const ths = Array.from(sec.querySelectorAll("thead th")) as HTMLElement[];
      const before = tr ? getComputedStyle(tr, "::before") : null;
      return {
        tableWidth: Math.round(table.getBoundingClientRect().width * 10) / 10,
        tableLeft: Math.round(table.getBoundingClientRect().left),
        tableRight: Math.round(table.getBoundingClientRect().right * 10) / 10,
        ths: ths.map((t) => [
          Math.round(t.getBoundingClientRect().left),
          Math.round(t.getBoundingClientRect().width * 10) / 10,
        ]),
        lastThRight: Math.round(ths[ths.length - 1].getBoundingClientRect().right * 10) / 10,
        rowTdCount: tr ? tr.querySelectorAll("td").length : null,
        beforeContent: before?.content ?? null,
        beforePosition: before?.position ?? null,
        beforeDisplay: before?.display ?? null,
      };
    });
    console.log(`DIAG2 ${label} ${JSON.stringify(data)}`);
  };

  await measure("SELECTED");
  await page.addStyleTag({
    content: "tr::before, tr::after { content: none !important; }",
  });
  await measure("PSEUDO-KILLED");
});
