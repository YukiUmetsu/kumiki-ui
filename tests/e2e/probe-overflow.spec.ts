import { test } from "@playwright/test";

test("probe: find horizontal overflow source at 320", async ({ page }) => {
  await page.goto("/#/media");
  await page.setViewportSize({ width: 320, height: 900 });
  await page.waitForTimeout(500);
  const report = await page.evaluate(() => {
    const html = document.documentElement;
    const result = {
      scrollWidth: html.scrollWidth,
      clientWidth: html.clientWidth,
      ancestors: [] as Array<{ selector: string; width: number; minWidth: string; maxWidth: string; overflow: string; display: string }>,
      offenders: [] as Array<{ tag: string; class?: string; scrollWidth: number; clientWidth: number; right: number }>,
    };
    const section = document.querySelector('[data-pattern-section="golden"]');
    if (section) {
      let current: Element | null = section;
      while (current) {
        const style = window.getComputedStyle(current as HTMLElement);
        result.ancestors.push({
          selector: current.className || current.tagName,
          width: (current as HTMLElement).getBoundingClientRect().width,
          minWidth: style.minWidth,
          maxWidth: style.maxWidth,
          overflow: style.overflow,
          display: style.display,
        });
        current = current.parentElement;
        if (current === document.body) break;
      }
      const firstComposition = section.querySelector('[class*="flex min-w-0 flex-col gap-4"]');
      if (firstComposition) {
        const outer = firstComposition.querySelector('[class*="max-h-[38rem]"]');
        const inner = outer?.firstElementChild;
        for (const el of [firstComposition, outer, inner]) {
          if (!el) continue;
          const style = window.getComputedStyle(el as HTMLElement);
          result.ancestors.push({
            selector: `COMP: ${el.className || el.tagName}`,
            width: (el as HTMLElement).getBoundingClientRect().width,
            minWidth: style.minWidth,
            maxWidth: style.maxWidth,
            overflow: style.overflow,
            display: style.display,
          });
        }
      }
    }
    const all = document.querySelectorAll("*");
    for (const el of all) {
      const rect = el.getBoundingClientRect();
      if (rect.right > html.clientWidth + 1) {
        result.offenders.push({
          tag: el.tagName,
          class: el.className,
          scrollWidth: (el as HTMLElement).scrollWidth,
          clientWidth: (el as HTMLElement).clientWidth,
          right: rect.right,
        });
      }
    }
    return result;
  });
  // eslint-disable-next-line no-console
  console.log("OVERFLOW PROBE:", JSON.stringify(report, null, 2));
});
