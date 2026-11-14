import { test, expect } from "@playwright/test";

/** Each Film Looks story previews the very same FD1 scene used for production export.
 * These checks run against Storybook's actual browser iframe, not a mocked renderer.
 */
test.describe("watercolour Film Looks interactive showcases",()=>{
  test("brush film plays, seeks and accepts individual stroke edits",async({page})=>{
    await page.goto("/iframe.html?id=film-art-watercolour-brush--painted-film&viewMode=story");
    await expect(page.getByRole("heading",{name:"Watercolour & brush atelier"})).toBeVisible();
    await page.getByRole("slider",{name:"Absolute film frame"}).fill("690");
    await expect(page.getByText("Absolute film frame: 690 / 819")).toBeVisible();
    await page.getByRole("spinbutton",{name:"Paper seed"}).fill("93");
    await page.getByText(/Coast brush strokes.*advanced JSON editor/).click();
    const input=page.getByRole("textbox",{name:"Scene configuration (JSON)"});
    const original=JSON.parse(await input.inputValue());
    expect(original.seed).toBe(93);
    expect(original.strokes.length).toBeGreaterThan(10);
    original.strokes[0].color="#526A83";
    await input.fill(JSON.stringify(original));
    await page.getByRole("button",{name:"Apply validated JSON"}).click();
    await expect(page.locator('[data-km-watercolour-surface]')).toBeVisible();
  });

  test("painted film switches independent chapters and validates washes",async({page})=>{
    await page.goto("/iframe.html?id=film-art-watercolour-worlds--any-subject-painted-film&viewMode=story");
    await expect(page.getByRole("heading",{name:/Any-Subject Film Atelier/})).toBeVisible();
    await page.getByRole("button",{name:"Science / explainers"}).click();
    await expect(page.getByText("Current chapter:")).toContainText("Science / explainers");
    await page.getByText(/Science \/ explainers layered composition.*advanced JSON editor/).click();
    const input=page.getByRole("textbox",{name:"Scene configuration (JSON)"});
    const spec=JSON.parse(await input.inputValue());
    expect(spec.layers.length).toBeGreaterThan(0);
    expect(spec.layers.some((l:{kind:string})=>l.kind==="wash")).toBe(true);
    spec.paper.tooth=2;
    await input.fill(JSON.stringify(spec));
    await page.getByRole("button",{name:"Apply validated JSON"}).click();
    await expect(page.getByRole("alert")).toContainText("Tooth");
    spec.paper.tooth=.34;
    await input.fill(JSON.stringify(spec));
    await page.getByRole("button",{name:"Apply validated JSON"}).click();
    await expect(page.locator('[data-km-painted-composition]')).toBeVisible();
  });

  test("rigged performer seeks to speech and accepts new material and gait values",async({page})=>{
    await page.goto("/iframe.html?id=film-art-watercolour-character--painted-character-performance&viewMode=story");
    await expect(page.getByRole("heading",{name:"A character made of paint"})).toBeVisible();
    await page.getByRole("button",{name:"Speak"}).click();
    await expect(page.getByText("Absolute film frame: 336 / 429")).toBeVisible();
    await expect(page.locator('[data-km-watercolour-actor]')).toHaveAttribute("data-km-watercolour-actor-frame","336");
    await page.getByText(/Character, rig, cues and painted scene.*advanced JSON editor/).click();
    const input=page.getByRole("textbox",{name:"Scene configuration (JSON)"});
    const spec=JSON.parse(await input.inputValue());
    expect(spec.track.keys.length).toBeGreaterThan(3);
    expect(spec.cues.some((c:{kind:string})=>c.kind==="speech")).toBe(true);
    spec.material.bleed=.9;
    spec.track.stepLift=24;
    await input.fill(JSON.stringify(spec));
    await page.getByRole("button",{name:"Apply validated JSON"}).click();
    await expect(page.locator('[data-km-watercolour-actor]')).toBeVisible();
    await page.getByRole("button",{name:"Reset this preset"}).click();
    await expect(page.locator('[data-km-watercolour-actor]')).toBeVisible();
  });
});
