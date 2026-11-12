import { expect, test } from "@playwright/test";

/** Human-review evidence capture for the ORIGINAL authored SVG composition.
 * Invoked by the existing manual Scene Recipe QA workflow, not every PR.
 * Pixel screenshots are evidence to inspect, not automated art approval.
 */
for (const scenario of [
  { id: "motion-paired-focus--complete-sequence", aspect: "landscape" },
  { id: "motion-paired-focus--portrait", aspect: "portrait" },
] as const) {
  test("paired focus " + scenario.aspect + " maintains two unobstructed subjects and readable title/footer",
    async ({ page }, info) => {
      await page.goto("/iframe.html?id=" + scenario.id + "&viewMode=story");
      const stage = page.locator('[data-km-paired-focus=""]');
      await expect(stage).toBeVisible();
      const a = stage.locator('[data-km-paired-focus-subject="gold-wave"]');
      const b = stage.locator('[data-km-paired-focus-subject="mint-orbit"]');
      await expect(a).toBeVisible();
      await expect(b).toBeVisible();
      let start: Buffer | undefined, focus: Buffer | undefined;
      for (const [label, frame] of [
        ["Establish", "0"], ["Approach", "34"],
        ["Focal moment", "77"], ["Release", "118"],
        ["Final hold", "159"],
      ] as const) {
        await page.getByRole("button", { name: label, exact: true }).click();
        await expect(stage).toHaveAttribute("data-frame", frame);
        const measured = await stage.evaluate((svg) => {
          const stageBounds = svg.getBoundingClientRect();
          const elements = [...svg.querySelectorAll("[data-km-paired-focus-subject]")];
          const boxes = elements.map(e => e.getBoundingClientRect());
          const textBoxes = [...svg.querySelectorAll("text")]
            .map(e=>e.getBoundingClientRect());
          const focusStrength = Number(svg.getAttribute("data-focus-strength"));
          const clearance = Number(svg.getAttribute("data-sampled-clearance"));
          return {
            stage: { left: stageBounds.left, top: stageBounds.top,
              right: stageBounds.right, bottom: stageBounds.bottom,
              aspect: stageBounds.width / stageBounds.height },
            boxes: boxes.map(r=>({left:r.left,top:r.top,right:r.right,bottom:r.bottom})),
            titleBottom: Math.max(...textBoxes.slice(0,2).map(x=>x.bottom)),
            footerTop: Math.min(...textBoxes.slice(2).map(x=>x.top)),
            focusStrength, clearance,
          };
        });
        expect(measured.boxes).toHaveLength(2);
        expect(measured.clearance).toBeGreaterThanOrEqual(20 - .001);
        expect(measured.focusStrength).toBeGreaterThanOrEqual(0);
        expect(measured.focusStrength).toBeLessThanOrEqual(1);
        expect(measured.stage.aspect).toBeCloseTo(
          scenario.aspect === "landscape" ? 16/9 : 2/3, 2);
        for (const box of measured.boxes) {
          expect(box.left).toBeGreaterThanOrEqual(measured.stage.left - 1);
          expect(box.right).toBeLessThanOrEqual(measured.stage.right + 1);
          expect(box.top).toBeGreaterThanOrEqual(measured.titleBottom - 1);
          expect(box.bottom).toBeLessThanOrEqual(measured.footerTop + 1);
        }
        const [first, second] = measured.boxes;
        const overlap = first.left < second.right && second.left < first.right &&
          first.top < second.bottom && second.top < first.bottom;
        expect(overlap).toBe(false);
        const png = await stage.screenshot({
          path: info.outputPath(scenario.aspect + "-" + frame + ".png"),
          animations: "disabled",
        });
        if (frame === "0") start = png;
        if (frame === "77") {
          focus = png;
          expect(measured.focusStrength).toBe(1);
        }
        if (frame === "159") expect(measured.focusStrength).toBe(0);
      }
      expect(start).toBeDefined();
      expect(focus).toBeDefined();
      expect(start!.equals(focus!)).toBe(false);
      await page.getByLabel("Reduced motion").check();
      await expect(stage).toHaveAttribute("data-reduced-motion", "true");
      await expect(stage.locator('[data-phase="reduced-motion-final"]')).toHaveCount(2);
    });
}
