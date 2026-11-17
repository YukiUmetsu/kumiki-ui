import {test,expect} from "@playwright/test";
import {createHash} from "node:crypto";

const sha256=(bytes:Buffer|string)=>createHash("sha256").update(bytes).digest("hex");

test("rose lamina native film: original source and four optical passes at both aspects",async({page},info)=>{
  await page.goto("/iframe.html?id=video-colored-pencil-science--drawing-foundation&viewMode=story");
  const scene=page.locator("[data-km-foundation-studio]");
  const svg=page.locator("svg[data-km-colored-pencil]");
  const checkbox=page.getByRole("checkbox",{name:"Foundation rose petal lamina fibres"});
  await page.getByRole("combobox",{name:"Foundation subject"}).selectOption("rose");
  await expect(checkbox).toBeVisible();
  await expect(checkbox).toBeChecked();
  await expect(scene).toHaveAttribute("data-km-rose-lamina-study","opt-in");
  for(const aspect of ["landscape","portrait"] as const){
    await page.getByRole("combobox",{name:"Foundation aspect"}).selectOption(aspect);
    await expect(svg).toHaveAttribute("viewBox",
      aspect==="landscape"?"0 0 960 540":"0 0 540 960");
    await page.getByRole("button",{name:/6\. Burnish and visual audit/}).click();
    await expect(svg.locator('[data-km-pencil-trace^="rose-lam-"]'))
      .toHaveCount(28);
    expect(await svg.locator("image,foreignObject,feImage").count()).toBe(0);
    const authoredSvgHash=sha256(await svg.evaluate(node=>node.outerHTML));
    const withFibres=await svg.screenshot({animations:"disabled",
      path:info.outputPath("rose-"+aspect+"-lamina-original-native.png")});
    await checkbox.uncheck();
    await expect(scene).toHaveAttribute("data-km-rose-lamina-study","baseline");
    await expect(svg.locator('[data-km-pencil-trace^="rose-lam-"]'))
      .toHaveCount(0);
    const before=await svg.screenshot({animations:"disabled",
      path:info.outputPath("rose-"+aspect+"-baseline-original-native.png")});
    expect(sha256(before)).not.toBe(sha256(withFibres));
    await checkbox.check();
    await expect(svg.locator('[data-km-pencil-trace^="rose-lam-"]'))
      .toHaveCount(28);
    expect(sha256(await svg.evaluate(node=>node.outerHTML))).toBe(authoredSvgHash);
    // PNG buffers can be extremely large: hash the complete native PNG
    // instead of invoking Vitest/Playwright byte-by-byte array diffs. A
    // strict exact-image comparison is still required after A/B restoration.
    await expect.poll(async()=>sha256(await svg.screenshot({animations:"disabled",
      path:info.outputPath("rose-"+aspect+"-restored-native.png")})),
      {timeout:18000,intervals:[400,800,1600]})
      .toBe(sha256(withFibres));
    await page.getByRole("checkbox",{name:"Foundation inspect macro"}).check();
    await svg.screenshot({animations:"disabled",
      path:info.outputPath("rose-"+aspect+"-lamina-macro.png")});
    await page.getByRole("checkbox",{name:"Foundation inspect macro"}).uncheck();
  }
  // Frame-addressed pigment cannot jump ahead of the pencil layering process.
  await page.getByRole("button",{name:/3\. Light value map/}).click();
  // SVG geometry remains in the DOM for deterministic seek; at frame 106
  // the real dash deposition is zero, not deleted source microgeometry.
  await expect(svg.locator('[data-km-pencil-trace^="rose-lam-"]'))
    .toHaveCount(28);
  await expect(svg.locator('[data-km-pencil-trace^="rose-lam-"]').first())
    .toHaveAttribute("stroke-dasharray","0.00000 1");
  await page.getByRole("button",{name:/6\. Burnish and visual audit/}).click();
  await expect(svg.locator('[data-km-pencil-trace^="rose-lam-"]'))
    .toHaveCount(28);
});
