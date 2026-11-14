import { expect, test } from "@playwright/test";
import { createHash } from "node:crypto";

const digest = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");
async function seek(page: import("@playwright/test").Page, frame: number) {
  const input = page.getByRole("slider",{name:"Ink ensemble frame"});
  await input.evaluate((node,value)=>{
    const el=node as HTMLInputElement;
    const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")?.set;
    if(!set)throw new Error("Native input value setter missing");
    set.call(el,String(value));
    el.dispatchEvent(new Event("input",{bubbles:true}));
    el.dispatchEvent(new Event("change",{bubbles:true}));
  },frame);
  await expect(input).toHaveValue(String(frame));
}
test("original ink duet uses real independent rigs, ordered scenes and frame-addressable contact review",async({page},info)=>{
  await page.goto("/iframe.html?id=video-ink-ensemble--ink-ensemble-story&viewMode=story");
  const scene=page.locator('[data-km-ink-scene]');
  await expect(scene).toBeVisible();
  const actor=page.locator("[data-km-ink-ensemble-actor]");
  await expect(actor).toHaveCount(2);
  for(const aspect of ["landscape","portrait"] as const){
    await page.getByRole("combobox",{name:"Ink ensemble output"}).selectOption(aspect);
    await page.getByRole("checkbox",{name:"Show reach audit"}).check();
    await expect(actor).toHaveCount(2);
    await expect(page.locator("[data-km-character-presenter]")).toHaveCount(2);
    for (const frame of [10,117,188,298]){
      await seek(page,frame);
      await expect(page.locator("[data-km-ink-ensemble]")).toHaveAttribute("data-km-ink-ensemble-frame",String(frame));
      await scene.screenshot({animations:"disabled",
        path:info.outputPath("ink-duet-"+aspect+"-"+frame+".png")});
    }
    await expect(page.locator('[data-km-ink-reach="pass"]')).toHaveCount(0);
    await seek(page,188);
    await expect(page.locator('[data-km-ink-reach="pass"]')).toHaveCount(1);
    const first=await scene.screenshot({animations:"disabled"});
    await seek(page,20);await seek(page,188);
    const again=await scene.screenshot({animations:"disabled"});
    expect(digest(again),"Returning to frame 188 should be pixel-stable").toBe(digest(first));
    await page.getByRole("checkbox",{name:"Show reach audit"}).uncheck();
  }
});
