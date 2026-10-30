import { expect, test } from "@playwright/test";

const cases = [
  { story: "ledger-laptop", subject: "device" },
  { story: "mobile-app", subject: "device" },
  { story: "original-icon", subject: "icon" },
  { story: "generic-icon", subject: "icon" },
  { story: "receipt-scene", subject: "scene" },
  { story: "diagram-only", subject: null },
] as const;

/** Inspect the real browser frame, not just the React element tree. */
for (const item of cases) {
  for (const portrait of [false, true]) {
    test(`${item.story} ${portrait ? "portrait" : "landscape"} keeps the hierarchy and one-frame reveal`,
      async ({ page }, info) => {
        await page.goto("/iframe.html?id=motion-subject-led-explainers--" + item.story + "&viewMode=story");
        const stage = page.locator("[data-km-subject-stage]");
        await expect(stage).toBeVisible();
        if (portrait) await page.getByRole("checkbox", { name: "9:16 portrait" }).check();
        await expect(stage).toHaveAttribute("data-km-subject-stage", portrait ? "portrait" : "landscape");
        const boxes = await stage.evaluate(el => {
          const outer = el.getBoundingClientRect();
          const get = (selector: string) => {
            const node = el.querySelector(selector);
            if (!node) return null;
            const box = node.getBoundingClientRect();
            return { x: box.x, y: box.y, right: box.right, bottom: box.bottom,
              width: box.width, height: box.height };
          };
          return { outer: { x: outer.x, y: outer.y, right: outer.right, bottom: outer.bottom,
            width: outer.width, height: outer.height },
            subject: get("[data-km-shot-subject]"),
            explanation: get("[data-km-shot-explanation]"),
            title: get("[data-km-shot-title]"),
            caption: get("[data-km-shot-caption]") };
        });
        expect(boxes.outer.width).toBeGreaterThan(200);
        expect(boxes.outer.height / boxes.outer.width).toBeCloseTo(portrait ? 16 / 9 : 9 / 16, 1);
        expect(Boolean(boxes.subject)).toBe(Boolean(item.subject));
        for (const b of [boxes.subject, boxes.explanation, boxes.title, boxes.caption]) {
          if (!b) continue;
          expect(b.x).toBeGreaterThanOrEqual(boxes.outer.x - 1);
          expect(b.y).toBeGreaterThanOrEqual(boxes.outer.y - 1);
          expect(b.right).toBeLessThanOrEqual(boxes.outer.right + 1);
          expect(b.bottom).toBeLessThanOrEqual(boxes.outer.bottom + 1);
        }
        if (boxes.subject && boxes.explanation) {
          if (portrait) expect(boxes.subject.bottom).toBeLessThan(boxes.explanation.y);
          else expect(boxes.subject.right).toBeLessThan(boxes.explanation.x);
        }
        await page.getByRole("button", { name: "3211", exact: true }).click();
        await expect(stage).toHaveAttribute("data-km-phase", "before");
        await expect(stage.locator("[data-km-shot-caption]")).toHaveCount(0);
        if (item.subject === "icon") await expect(stage.locator("[data-km-icon-claim]")).toHaveCount(0);

        await page.getByRole("button", { name: "3212", exact: true }).click();
        await expect(stage).toHaveAttribute("data-km-phase", "hold");
        // All six fixtures use the real DiagramStage; its connector should
        // travel directly across the available axis, not loop around a node.
        const connector = stage.locator('[data-diagram-edge="transfer"] path').first();
        await expect(connector).toBeVisible();
        const crossAxisDeviation = await connector.evaluate((node, isPortrait) => {
          const path = node as SVGPathElement;
          const length = path.getTotalLength(), start = path.getPointAtLength(0);
          let maximum = 0;
          for (let step = 0; step <= 20; step++) {
            const point = path.getPointAtLength(length * step / 20);
            maximum = Math.max(maximum, Math.abs(isPortrait ? point.x - start.x : point.y - start.y));
          }
          return maximum;
        }, portrait);
        expect(crossAxisDeviation).toBeLessThan(3);
        if (item.subject === "icon") {
          await expect(stage.locator("[data-km-icon-claim]")).toHaveCount(1);
          await expect(stage.locator("[data-km-shot-caption]")).toHaveCount(0);
        } else await expect(stage.locator("[data-km-shot-caption]")).toHaveCount(1);
        const reveal = await stage.screenshot({ animations: "disabled",
          path: info.outputPath(item.story + (portrait ? "-portrait" : "-landscape") + "-3212.png") });
        await page.getByRole("button", { name: "3400", exact: true }).click();
        await expect(stage).toHaveAttribute("data-km-phase", "hold");
        const hold = await stage.screenshot({ animations: "disabled",
          path: info.outputPath(item.story + (portrait ? "-portrait" : "-landscape") + "-3400.png") });
        expect(hold).toEqual(reveal);
        await page.getByRole("button", { name: "3211", exact: true }).click();
        await expect(stage).toHaveAttribute("data-km-phase", "before");
      });
  }
}

test("semantic action previews reveal distinct authored geometry", async ({ page }) => {
  const actions = [
    ["show-emphasis", "[data-km-subject-emphasis='true']"],
    ["advance-journey", "[data-km-next-step='true']"],
    ["compare-reveal", "[data-km-comparison='true']"],
    ["ring-example", "[data-km-ring]"],
  ] as const;
  for (const [story, marker] of actions) {
    await page.goto("/iframe.html?id=motion-subject-led-explainers--" + story + "&viewMode=story");
    const stage = page.locator("[data-km-subject-stage]");
    await page.getByRole("button", { name: "3211", exact: true }).click();
    await expect(stage.locator(marker)).toHaveCount(0);
    await page.getByRole("button", { name: "3212", exact: true }).click();
    await expect(stage.locator(marker)).toHaveCount(1);
  }
});
