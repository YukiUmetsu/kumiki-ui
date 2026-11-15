import { expect, test } from "@playwright/test";
import { createHash } from "node:crypto";

const digest = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");
/** A single-pixel blend/antialias rounding difference isn't a timeline defect.
 * Require the decoded image to remain the same size and differ by at most
 * two channel levels in a tiny fraction of pixels.
 */
async function expectStablePixels(page: import("@playwright/test").Page, before: Buffer, after: Buffer) {
  if (digest(before) === digest(after)) return;
  const result = await page.evaluate(async ({a,b}) => {
    const decode = async (base64: string) => {
      const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
      const bmp = await createImageBitmap(new Blob([bytes], {type: "image/png"}));
      const canvas = document.createElement("canvas");
      canvas.width = bmp.width; canvas.height = bmp.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas2D unavailable for pixel regression");
      ctx.drawImage(bmp,0,0); bmp.close();
      return {width:canvas.width,height:canvas.height,
        data:ctx.getImageData(0,0,canvas.width,canvas.height).data};
    };
    const one=await decode(a),two=await decode(b);
    if(one.width!==two.width||one.height!==two.height) return {sameSize:false,maxDelta:255,changed:-1,total:one.width*one.height};
    let maxDelta=0,changed=0;
    for(let i=0;i<one.data.length;i+=4){
      let d=0;
      for(let k=0;k<4;k++) d=Math.max(d,Math.abs(one.data[i+k]-two.data[i+k]));
      maxDelta=Math.max(maxDelta,d);
      if(d>0)changed++;
    }
    return {sameSize:true,maxDelta,changed,total:one.width*one.height};
  },{a:before.toString("base64"),b:after.toString("base64")});
  expect(result.sameSize,JSON.stringify(result)).toBe(true);
  expect(result.maxDelta,JSON.stringify(result)).toBeLessThanOrEqual(2);
  expect(result.changed,JSON.stringify(result)).toBeLessThanOrEqual(
    Math.max(12,Math.ceil(result.total*.0001)));
}
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
  // The Storybook entry point must show *actors*, not an empty sheet that
  // looks like a rendering error. Full frame-0 reveal stays seekable below.
  await expect(page.getByRole("slider",{name:"Ink ensemble frame"}))
    .toHaveValue("117");
  await expect(page.locator("[data-km-ink-ensemble-actor]")).toHaveCount(2);
  // The authored paper reveal begins at frame 3. The initial frame intentionally
  // contains no mounted actor media, preserving a completely empty sheet.
  await seek(page,10);
  const actor=page.locator("[data-km-ink-ensemble-actor]");
  await expect(actor).toHaveCount(2);
  for(const aspect of ["landscape","portrait"] as const){
    await page.getByRole("combobox",{name:"Ink ensemble output"}).selectOption(aspect);
    await page.getByRole("checkbox",{name:"Show reach audit"}).check();
    await expect(actor).toHaveCount(2);
    await expect(page.locator("[data-km-character-presenter]")).toHaveCount(2);
    // A rotated/raised sleeve may leave its rig-design rectangle; no hard cut.
    const rig = page.locator('[data-km-ink-character="master"] [data-km-character-presenter]');
    await expect(rig).toHaveCSS("overflow", "visible");
    await expect(rig.locator("svg")).toHaveCSS("overflow", "visible");
    for (const frame of [10,117,188,298]){
      await seek(page,frame);
      await expect(page.locator("[data-km-ink-ensemble]")).toHaveAttribute("data-km-ink-ensemble-frame",String(frame));
      await scene.screenshot({animations:"disabled",
        path:info.outputPath("ink-duet-"+aspect+"-"+frame+".png")});
    }
    await expect(page.locator('[data-km-ink-reach="pass"]')).toHaveCount(0);
    await seek(page,188);
    await expect(page.locator('[data-km-ink-reach="pass"]')).toHaveCount(1);
    // The second QA marker measures the *posed* hand anchors. Its result may
    // legitimately fail despite passing coarse actor-root reach.
    const hand = page.locator("[data-km-ink-hand-contact]");
    await expect(hand).toHaveCount(1);
    await expect(hand).toHaveAttribute("data-km-ink-hand-gap",/^\d+\.\d{2}$/);
    const accurate = await hand.getAttribute("data-km-ink-hand-contact");
    expect(["pass","fail"]).toContain(accurate);
    const first=await scene.screenshot({animations:"disabled"});
    await seek(page,20);await seek(page,188);
    const again=await scene.screenshot({animations:"disabled"});
    await expectStablePixels(page,first,again);
    await page.getByRole("checkbox",{name:"Show reach audit"}).uncheck();
  }
});

test("Ensemble Storybook opens without a runtime error for either output format",async({page})=>{
  const errors:string[]=[];
  page.on("pageerror",error=>errors.push(error.message));
  await page.goto("/iframe.html?id=video-ink-ensemble--ink-ensemble-story&viewMode=story");
  await expect(page.getByRole("slider",{name:"Ink ensemble frame"})).toHaveValue("117");
  for(const aspect of ["landscape","portrait"] as const){
    await page.getByRole("combobox",{name:"Ink ensemble output"}).selectOption(aspect);
    for(const frame of [0,3,57,117,188,253,298,329]){
      await seek(page,frame);
      await expect(page.locator("[data-km-ink-scene]")).toBeVisible();
      if(frame>=3)
        await expect(page.locator("[data-km-ink-ensemble-actor]")).toHaveCount(2);
    }
  }
  expect(errors).toEqual([]);
});

test("original classical figure painting follows both articulated performers and supports live brush controls",async({page},info)=>{
  await page.goto("/iframe.html?id=video-ink-ensemble--ink-ensemble-story&viewMode=story");
  const scene=page.locator('[data-km-ink-scene]');
  const setRange=async(name:string,value:string)=>{
    const input=page.getByRole("slider",{name});
    await input.evaluate((node,v)=>{
      const el=node as HTMLInputElement;
      const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")?.set;
      if(!setter)throw new Error("range input setter missing");
      setter.call(el,v);
      el.dispatchEvent(new Event("input",{bubbles:true}));
      el.dispatchEvent(new Event("change",{bubbles:true}));
    },value);
    // HTML range inputs canonicalize numeric strings such as ".25" to "0.25".
    await expect(input).toHaveValue(String(Number(value)));
  };
  for(const aspect of ["landscape","portrait"] as const){
    await page.getByRole("combobox",{name:"Ink ensemble output"}).selectOption(aspect);
    await seek(page,188);
    const robe=page.locator('[data-km-ink-ensemble-actor="master"] [data-km-ink-character-part="body"] path');
    const apprentice=page.locator('[data-km-ink-ensemble-actor="learner"] [data-km-ink-character-part="body"] path');
    const fullMaster=await robe.count(),fullApprentice=await apprentice.count();
    expect(fullMaster).toBeGreaterThan(10);
    expect(fullApprentice).toBeGreaterThan(10);
    await scene.screenshot({animations:"disabled",
      path:info.outputPath("ink-classical-"+aspect+"-detail-full.png")});
    await setRange("Ink figure detail","0");
    await expect.poll(()=>robe.count()).toBeLessThan(fullMaster);
    await expect.poll(()=>apprentice.count()).toBeLessThan(fullApprentice);
    await scene.screenshot({animations:"disabled",
      path:info.outputPath("ink-classical-"+aspect+"-detail-zero.png")});
    await setRange("Ink figure detail","1");
    await expect.poll(()=>robe.count()).toBe(fullMaster);
    await setRange("Ink figure contrast",".25");
    const light=await scene.screenshot({animations:"disabled"});
    await setRange("Ink figure contrast","1.5");
    const strong=await scene.screenshot({animations:"disabled"});
    expect(digest(light)).not.toEqual(digest(strong));
    await seek(page,295);
    await seek(page,188);
    await scene.screenshot({animations:"disabled",
      path:info.outputPath("ink-classical-"+aspect+"-dense.png")});
    await setRange("Ink figure contrast",".85");
  }
});

test("close-up Film Looks study displays real articulated figure assets in both aspects",async({page},info)=>{
  await page.goto("/iframe.html?id=video-ink-ensemble--ink-figure-brushwork-study&viewMode=story");
  const stage=page.getByTestId("ink-figure-closeup");
  await expect(stage).toBeVisible();
  const master=page.locator('[data-km-ink-ensemble-actor="master"] [data-km-ink-character-part="body"] path');
  await expect.poll(()=>master.count()).toBeGreaterThan(10);
  await stage.screenshot({animations:"disabled",
    path:info.outputPath("ink-figure-master-closeup.png")});
  await page.getByRole("combobox",{name:"Ink figure focus"}).selectOption("learner");
  await page.getByRole("combobox",{name:"Ink figure aspect"}).selectOption("portrait");
  await expect(stage).toHaveCSS("overflow","hidden");
  await stage.screenshot({animations:"disabled",
    path:info.outputPath("ink-figure-apprentice-portrait-closeup.png")});
  const advanced=await stage.screenshot({animations:"disabled"});
  const slider=page.getByRole("slider",{name:"Ink closeup detail"});
  await slider.evaluate(input=>{
    const el=input as HTMLInputElement;
    const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")?.set;
    if(!setter)throw new Error("native range setter unavailable");
    setter.call(el,"0");
    el.dispatchEvent(new Event("input",{bubbles:true}));
    el.dispatchEvent(new Event("change",{bubbles:true}));
  });
  await expect(slider).toHaveValue("0");
  const baseline=await stage.screenshot({animations:"disabled"});
  expect(digest(advanced)).not.toBe(digest(baseline));
  await page.getByRole("button",{name:"Bow"}).click();
  await expect(page.getByRole("slider",{name:"Ink figure closeup frame"})).toHaveValue("296");
  await expect(page.locator("[data-km-ink-ensemble]")).toHaveAttribute(
    "data-km-ink-ensemble-frame","296");
});
