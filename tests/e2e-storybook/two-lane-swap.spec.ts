import { expect, test } from "@playwright/test";

/** Optional browser qualification for the original two-subject animation.
 * Tested under the existing manually triggered Storybook scene QA workflow;
 * it does not enlarge every PR's CI budget.
 */
for (const scenario of [
  { id: "motion-two-lane-swap--crossing", aspect: "landscape" },
  { id: "motion-two-lane-swap--portrait", aspect: "portrait" },
] as const) {
  test(scenario.aspect + " lane-swap preserves visual bounds, clearing and readable zones",
    async ({ page }, info) => {
      await page.goto("/iframe.html?id=" + scenario.id + "&viewMode=story");
      const stage = page.locator('[data-km-lane-swap=""]');
      await expect(stage).toBeVisible();
      await expect(stage.locator('[data-km-lane-swap-subject="amber-signal"]')).toBeVisible();
      await expect(stage.locator('[data-km-lane-swap-subject="jade-orbit"]')).toBeVisible();

      let beginning: Buffer | undefined;
      let crossing: Buffer | undefined;
      for (const [button, frame] of [
        ["Establish", "0"], ["Anticipation", "10"], ["Crossing", "58"],
        ["Settle", "103"], ["Final hold", "119"],
      ] as const) {
        await page.getByRole("button", { name: button, exact: true }).click();
        await expect(stage).toHaveAttribute("data-frame", frame);
        const measured = await stage.evaluate(svg => {
          const stageBox = svg.getBoundingClientRect();
          const subjects = [...svg.querySelectorAll(
            "[data-km-lane-swap-subject]")].map(node => {
            const box = node.getBoundingClientRect();
            return { left: box.left, top: box.top, right: box.right,
              bottom: box.bottom };
          });
          const header = svg.querySelector("text");
          const title = header?.getBoundingClientRect();
          const footer = [...svg.querySelectorAll("text")].at(-1)?.getBoundingClientRect();
          const clear = Number(svg.getAttribute("data-sampled-clearance"));
          return { stageBox: {
              left: stageBox.left, top: stageBox.top,
              right: stageBox.right, bottom: stageBox.bottom,
            },
            subjects, title: title ? { top: title.top, bottom: title.bottom } : null,
            footer: footer ? { top: footer.top, bottom: footer.bottom } : null,
            clear, aspect: stageBox.width / stageBox.height };
        });
        expect(measured.subjects).toHaveLength(2);
        expect(measured.clear).toBeGreaterThanOrEqual(22);
        expect(measured.aspect).toBeCloseTo(
          scenario.aspect === "landscape" ? 1200/680 : 720/1080, 2);
        for (const object of measured.subjects) {
          expect(object.left).toBeGreaterThanOrEqual(measured.stageBox.left - 1);
          expect(object.top).toBeGreaterThanOrEqual(measured.stageBox.top - 1);
          expect(object.right).toBeLessThanOrEqual(measured.stageBox.right + 1);
          expect(object.bottom).toBeLessThanOrEqual(measured.stageBox.bottom + 1);
        }
        const [a, b] = measured.subjects;
        // Every image shows visually distinct subjects, not overlapping SVG
        // bounds (the compiler additionally checks conservative circles).
        const rectsOverlap = a.left < b.right && b.left < a.right &&
          a.top < b.bottom && b.top < a.bottom;
        expect(rectsOverlap).toBe(false);
        for (const object of measured.subjects) {
          if (measured.title) expect(object.top).toBeGreaterThan(measured.title.bottom);
          if (measured.footer) expect(object.bottom).toBeLessThan(measured.footer.top);
        }
        const png = await stage.screenshot({
          path: info.outputPath(scenario.aspect + "-" + frame + ".png"),
          animations: "disabled",
        });
        if (frame === "0") beginning = png;
        if (frame === "58") crossing = png;
      }
      expect(beginning).toBeDefined();
      expect(crossing).toBeDefined();
      expect(beginning!.equals(crossing!)).toBe(false);
      await page.getByLabel("Reduced motion").check();
      await expect(stage).toHaveAttribute("data-reduced-motion", "true");
      await expect(stage.locator("[data-phase=reduced-motion-final]")).toHaveCount(2);
    },
  );
}
