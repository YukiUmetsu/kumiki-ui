import { expect, test } from "@playwright/test";
import { createHash } from "node:crypto";

function sha(png:Buffer){ return createHash("sha256").update(png).digest("hex"); }
async function seek(page:import("@playwright/test").Page,frame:number){
  const range=page.getByRole("slider",{name:"Film frame"});
  await range.evaluate((node,value)=>{
    const input=node as HTMLInputElement;
    const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")?.set;
    if(!setter)throw Error("Native range setter unavailable.");
    setter.call(input,String(value));
    input.dispatchEvent(new Event("input",{bubbles:true}));
    input.dispatchEvent(new Event("change",{bubbles:true}));
  },frame);
  await expect(range).toHaveValue(String(frame));
  await expect(page.locator("[data-km-ink-scene]")).toHaveAttribute("data-km-ink-scene-frame",String(frame));
}
test("ink character director: both aspects, IK legs, frame-exact reverse seek and reduced-motion hold",
  async ({page},info)=>{
    await page.goto("/iframe.html?id=video-ink-character-director--continuous-walk&viewMode=story");
    await expect(page.locator("[data-km-ink-scene]")).toBeVisible();
    for(const aspect of ["landscape","portrait"] as const){
      await page.getByRole("combobox",{name:"Output"}).selectOption(aspect);
      const actor=page.locator("[data-km-ink-character]");
      await expect(actor).toBeVisible();
      await expect(actor.locator('[data-part="far-thigh"]')).toHaveCount(1);
      await expect(actor.locator('[data-part="far-shin"]')).toHaveCount(1);
      await expect(actor.locator('[data-part="near-thigh"]')).toHaveCount(1);
      await expect(actor.locator('[data-part="near-shin"]')).toHaveCount(1);
      const shots:Record<number,string>={};
      for(const frame of [0,85,135,235,310,419]){
        await seek(page,frame);
        const png=await page.locator("[data-km-ink-scene]").screenshot({
          animations:"disabled",
          path:info.outputPath("ink-director-"+aspect+"-"+String(frame).padStart(3,"0")+".png"),
        });
        shots[frame]=sha(png);
      }
      expect(shots[0]).not.toEqual(shots[135]);
      expect(shots[135]).not.toEqual(shots[419]);
      await seek(page,135);
      const replay=sha(await page.locator("[data-km-ink-scene]").screenshot({animations:"disabled"}));
      expect(replay,"A repeated absolute ink frame must render identically").toBe(shots[135]);
      await page.getByRole("checkbox",{name:"Reduced motion"}).check();
      await seek(page,0);
      await expect(actor).toHaveAttribute("data-km-ink-character-frame","419");
      await page.getByRole("checkbox",{name:"Reduced motion"}).uncheck();
    }
  });
