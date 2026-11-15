import {expect,test} from "@playwright/test";
import {createHash} from "node:crypto";
const hash=(b:Buffer)=>createHash("sha256").update(b).digest("hex");
async function seek(page:import("@playwright/test").Page,frame:number){
  const input=page.getByRole("slider",{name:"Shanshui frame"});
  await input.evaluate((node,value)=>{
    const el=node as HTMLInputElement;
    const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")?.set;
    if(!setter)throw new Error("Input setter unavailable");
    setter.call(el,String(value));
    el.dispatchEvent(new Event("input",{bubbles:true}));
    el.dispatchEvent(new Event("change",{bubbles:true}));
  },frame);
  await expect(input).toHaveValue(String(frame));
  // The slider's native setter synchronously changes the input value,
  // but the much richer SVG/React film is painted on a later commit.
  // Await the *actual stage* frame and two browser paint cycles before
  // hashing native screenshots after rewind. Otherwise this test races
  // a still-rendering previous frame and produces false determinism fails.
  await expect(page.locator("[data-km-shanshui-frame]").first())
    .toHaveAttribute("data-km-shanshui-frame",String(frame));
  await page.evaluate(async()=>{
    await new Promise<void>(r=>requestAnimationFrame(()=>r()));
    await new Promise<void>(r=>requestAnimationFrame(()=>r()));
  });
}
test("reference-inspired code-driven mountain, river and hermit compositions are real drawable scene layers",async({page},info)=>{
  await page.goto("/iframe.html?id=video-ink-shanshui--gallery-studio&viewMode=story");
  const stage=page.getByTestId("shanshui-preview");
  await expect(stage).toBeVisible();
  const landscape=page.locator("[data-km-shanshui-scene]");
  const actor=page.locator("[data-km-ink-character-frame]");
  for(const scene of ["mountain-trail","river-scholar","misty-hermit"] as const){
    await page.getByRole("combobox",{name:"Shanshui composition"}).selectOption(scene);
    await seek(page,125);
    await expect(landscape).toHaveAttribute("data-km-shanshui-scene",scene);
    await expect(landscape).toHaveAttribute("data-km-shanshui-frame","125");
    await expect(page.locator("[data-km-shanshui-mountains]")).toHaveCount(1);
    await expect(page.locator("[data-km-shanshui-birds]")).toHaveCount(1);
    await expect(page.locator("[data-km-shanshui-foreground]")).toHaveCount(1);
    await expect.poll(()=>page.locator("[data-km-shanshui-bamboo-leaf]").count())
      .toBeGreaterThan(70);
    await expect(actor).toHaveCount(1);
    // Ink material renders a set of individual named paths inside the same
    // canonical body part; one actor is not one DOM path.
    await expect.poll(()=>page.locator('[data-km-ink-character-part="body"]').count())
      .toBeGreaterThan(1);
    if(scene==="river-scholar"){
      await expect(page.locator("[data-km-shanshui-willow]")).toHaveCount(1);
      await expect(page.locator("[data-km-shanshui-bridge]")).toHaveCount(1);
      await expect(page.locator("[data-km-shanshui-water]")).toHaveCount(1);
    }else{
      await expect(page.locator("[data-km-shanshui-pine]")).toHaveCount(1);
    }
    await stage.screenshot({animations:"disabled",
      path:info.outputPath("shanshui-"+scene+"-125.png")});
    await seek(page,210);
    await stage.screenshot({animations:"disabled",
      path:info.outputPath("shanshui-"+scene+"-210.png")});
    await seek(page,125);
    const first=await stage.screenshot({animations:"disabled"});
    const firstSvg=await stage.locator("svg").first().evaluate(node=>node.outerHTML);
    await seek(page,31);
    await seek(page,125);
    const again=await stage.screenshot({animations:"disabled"});
    const againSvg=await stage.locator("svg").first().evaluate(node=>node.outerHTML);
    // Geometry must match byte-for-byte. Chromium rasterization of nested
    // SVG feTurbulence/filters, however, can produce subpixel differences
    // after back-seeking even when the *actual scene SVG is identical*.
    expect(againSvg).toBe(firstSvg);
    if(hash(first)!==hash(again)){
      const difference=await page.evaluate(async({before,after})=>{
        const pixels=async(base64:string)=>{
          const bytes=Uint8Array.from(atob(base64),x=>x.charCodeAt(0));
          const image=await createImageBitmap(new Blob([bytes],{type:"image/png"}));
          const canvas=document.createElement("canvas");
          canvas.width=image.width;canvas.height=image.height;
          const context=canvas.getContext("2d",{willReadFrequently:true});
          if(!context)throw new Error("PNG comparison needs a canvas context");
          context.drawImage(image,0,0);
          return context.getImageData(0,0,image.width,image.height).data;
        };
        const a=await pixels(before),b=await pixels(after);
        if(a.length!==b.length)throw new Error("Painted canvas size changed");
        let maxPerPixel=0,channelSum=0;
        let significantPixels=0;
        for(let k=0;k<a.length;k+=4){
          const red=Math.abs(a[k]-b[k]);
          const green=Math.abs(a[k+1]-b[k+1]);
          const blue=Math.abs(a[k+2]-b[k+2]);
          channelSum+=red+green+blue;
          maxPerPixel=Math.max(maxPerPixel,red,green,blue);
          if(Math.max(red,green,blue)>12)significantPixels++;
        }
        const count=a.length/4;
        return {maxPerPixel,meanChannelError:channelSum/(3*count),
          significantFraction:significantPixels/count};
      },{before:first.toString("base64"),after:again.toString("base64")});
      // This is stricter than perceptual comparison: any stroke, actor or
      // landscape displacement affects many pixels and is rejected.
      // Only tiny low-level browser filter/antialiasing noise is allowed.
      expect(difference.meanChannelError).toBeLessThan(.16);
      expect(difference.significantFraction).toBeLessThan(.0002);
    }
  }
});
test("real paper/ink controls change geometry and the reduce-motion contract freezes foliage",async({page},info)=>{
  await page.goto("/iframe.html?id=video-ink-shanshui--gallery-studio&viewMode=story");
  const stage=page.getByTestId("shanshui-preview");
  await seek(page,166);
  const before=await stage.screenshot({animations:"disabled"});
  const detail=page.getByRole("slider",{name:"Shanshui detail"});
  await detail.evaluate(node=>{
    const el=node as HTMLInputElement;
    const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")?.set;
    if(!setter)throw new Error("input setter missing");
    setter.call(el,"0");
    el.dispatchEvent(new Event("input",{bubbles:true}));
    el.dispatchEvent(new Event("change",{bubbles:true}));
  });
  await expect(detail).toHaveValue("0");
  const after=await stage.screenshot({animations:"disabled",
    path:info.outputPath("shanshui-sparse-detail.png")});
  expect(hash(before)).not.toBe(hash(after));
  await page.getByRole("checkbox",{name:"Reduced motion"}).check();
  await expect(page.locator("[data-km-ink-character-frame]"))
    .toHaveAttribute("data-km-ink-character-frame","299");
  const original=await page.locator("[data-km-shanshui-birds]").getAttribute("data-km-shanshui-bird-x");
  await seek(page,38);
  await expect(page.locator("[data-km-shanshui-birds]")).toHaveAttribute("data-km-shanshui-bird-x",original!);
  await page.getByRole("checkbox",{name:"Show scholar"}).uncheck();
  await expect(page.locator("[data-km-ink-character-frame]")).toHaveCount(0);
});
for(const [scene,story] of [
  ["mountain-trail","mountain-trail-export"],
  ["river-scholar","river-scholar-export"],
  ["misty-hermit","misty-hermit-export"],
] as const){
  test("the "+scene+" film can seek true production frames through the shared exporter",async({page},info)=>{
    await page.goto("/iframe.html?id=video-ink-shanshui--"+story+"&viewMode=story");
    await expect.poll(()=>page.evaluate(()=>Boolean(window.__kmVideoExport))).toBe(true);
    const manifest=await page.evaluate(()=>window.__kmVideoExport!.manifest);
    expect(manifest.width).toBe(960);
    expect(manifest.height).toBe(540);
    expect(manifest.durationFrames).toBe(300);
    await page.evaluate(async()=>window.__kmVideoExport!.seek(168));
    await expect(page.locator("[data-km-shanshui-scene]")).toHaveAttribute("data-km-shanshui-scene",scene);
    await expect(page.locator("[data-km-shanshui-frame]")).toHaveAttribute("data-km-shanshui-frame","168");
    await page.screenshot({animations:"disabled",
      path:info.outputPath("shanshui-export-"+scene+".png")});
  });
}


test("four distinct historical ink schools paint separate real rooted rock structures at one film frame",async({page},info)=>{
  await page.goto("/iframe.html?id=video-ink-shanshui--four-masters-ink-studio&viewMode=story");
  const lab=page.getByTestId("shanshui-master-ink-study");
  await expect(lab).toBeVisible();
  const schools=[
    ["fuchun","long-hemp",78],
    ["early-spring","cloud-head",52],
    ["travelers","raindrop",187],
    ["forest-grotto","ox-hair",178],
  ] as const;
  const crests:string[]=[];
  for(const [school,style,count] of schools){
    const card=lab.locator('[data-km-master-study="'+school+'"]');
    await expect(card).toBeVisible();
    await expect(card.locator('[data-km-master-school="'+school+'"]'))
      .toHaveCount(1);
    await expect(card.locator("[data-km-master-face]")).toHaveCount(3);
    await expect(card.locator("[data-km-master-stroke]"))
      .toHaveCount(count);
    await expect(card.locator("[data-km-master-stratum]")).toHaveCount(15);
    await expect(card.locator("[data-km-master-stratum-wash]")).toHaveCount(15);
    await expect(card.locator("[data-km-master-stratum-lip]")).toHaveCount(15);
    const clouds=school==="early-spring"?12:0;
    await expect(card.locator("[data-km-master-cloud-bank]"))
      .toHaveCount(clouds);
    await expect(card.locator("[data-km-master-cloud-mass]"))
      .toHaveCount(clouds);
    await expect(card.locator("[data-km-master-cloud-crown]"))
      .toHaveCount(clouds);
    await expect(card.locator("[data-km-master-cloud-recess]"))
      .toHaveCount(clouds);
    const bankCount=school==="fuchun"?9:school==="forest-grotto"?12:0;
    await expect(card.locator("[data-km-master-rock-bank]"))
      .toHaveCount(bankCount);
    await expect(card.locator("[data-km-master-rock-bank-wash]"))
      .toHaveCount(bankCount);
    await expect(card.locator("[data-km-master-rock-bank-cap]"))
      .toHaveCount(bankCount);
    await expect(card.locator("[data-km-master-moss-dab]"))
      .toHaveCount(school==="forest-grotto"?63:0);
    if(school==="forest-grotto"){
      await expect(card.locator('[data-km-master-moss-wet="wet"]'))
        .toHaveCount(12);
      await expect(card.locator('[data-km-master-moss-wet="dry"]'))
        .toHaveCount(51);
    }
    await expect(card.locator("[data-km-master-fan-facet]"))
      .toHaveCount(school==="travelers"?6:0);
    await expect(card.locator("[data-km-master-fan-facet-wash]"))
      .toHaveCount(school==="travelers"?6:0);
    await expect(card.locator("[data-km-master-fan-facet-rim]"))
      .toHaveCount(school==="travelers"?6:0);
    const banked=card.locator("[data-km-master-stroke-bank]");
    await expect(banked).toHaveCount(count);
    for(let bank=0;bank<5;bank++)
      await expect.poll(()=>card.locator(
        '[data-km-master-stroke-bank="'+bank+'"]').count())
        .toBeGreaterThan(0);
    await expect(card.locator('[data-km-master-stroke-placement="'+
      (school==="travelers"?"rock-volume":"attached-stratum")+'"]'))
      .toHaveCount(count);
    if(school==="early-spring"){
      await expect.poll(()=>card.locator(
        '[data-km-master-stroke-curl="counter"]').count()).toBeGreaterThan(10);
      await expect.poll(()=>card.locator(
        '[data-km-master-stroke-curl="with"]').count()).toBeGreaterThan(10);
    }
    await expect(card.locator("[data-km-rock-hero-fold]"))
      .toHaveCount(school==="fuchun"?3:0);

    await expect(card.locator('[data-km-master-stroke-style="'+style+'"]'))
      .toHaveCount(count);
    const top=card.locator('[data-km-shanshui-ridge-contour="1"]');
    crests.push((await top.getAttribute("d"))??"");
    await expect(card.locator("image")).toHaveCount(0);
    const film=card.locator("[data-km-shanshui-scene]").first();
    await film.screenshot({animations:"disabled",
      path:info.outputPath("shanshui-"+school+"-native-rock-145.png")});
  }
  expect(new Set(crests).size).toBe(4); // sculpted historical landforms
  await page.screenshot({animations:"disabled",fullPage:true,
    path:info.outputPath("shanshui-four-masters-artcraft-comparison.png")});
  await page.getByRole("slider",{name:"Master detail"}).focus();
  await page.getByRole("slider",{name:"Master detail"}).press("Home");
  await expect(page.getByRole("slider",{name:"Master detail"})).toHaveValue("0");
  await expect(lab.locator("[data-km-master-rock-art]")).toHaveCount(0);
  await page.getByRole("button",{name:"Reset all four studies"}).click();
  await expect(page.getByRole("slider",{name:"Master detail"})).toHaveValue("1");
  await expect(lab.locator("[data-km-master-stroke]"))
    .toHaveCount(78+52+187+178);
});

test("artist school choices are live film renderer modes, not a cosmetic Storybook filter",async({page})=>{
  await page.goto("/iframe.html?id=video-ink-shanshui--gallery-studio&viewMode=story");
  const input=page.getByRole("combobox",{name:"Shanshui ink school"});
  for(const [school,style,count] of [
    ["fuchun","long-hemp",70],
    ["early-spring","cloud-head",45],
    ["travelers","raindrop",160],
    ["forest-grotto","ox-hair",150],
  ] as const){
    await input.selectOption(school);
    await expect(page.locator('[data-km-master-school="'+school+'"]'))
      .toHaveCount(1);
    await expect.poll(()=>page.locator('[data-km-master-stroke-style="'+style+'"]').count())
      .toBeGreaterThanOrEqual(count);
  }
});
test("brushwork study shows native rooted foliage and uneven rock deposition",async({page},info)=>{
  await page.goto("/iframe.html?id=video-ink-shanshui--brushwork-detail-studio&viewMode=story");
  const study=page.getByTestId("shanshui-brushwork-studio");
  await expect(study).toBeVisible();
  await expect(page.locator("[data-km-brush-study-card]")).toHaveCount(5);
  await expect(page.locator("[data-km-brush-study-card]")
    .filter({hasText:"Bamboo leaf canopy"})).toHaveCount(1);
  await expect.poll(()=>study.locator("[data-km-pine-needle-cluster]").count())
    .toBeGreaterThan(80);
  await expect.poll(()=>study.locator("[data-km-cunfa-style]").count())
    .toBeGreaterThan(100);
  await expect.poll(()=>study.locator("[data-km-rock-shoulder]").count())
    .toBeGreaterThan(30);
  await expect.poll(()=>study.locator("[data-km-rock-shoulder-bone]").count())
    .toBeGreaterThan(30);
  await expect.poll(()=>study.locator("[data-km-rock-shoulder-vein]").count())
    .toBeGreaterThan(120);
  await expect.poll(()=>study.locator("[data-km-rock-alum-ledge]").count())
    .toBeGreaterThan(35);
  await expect.poll(()=>study.locator("[data-km-rock-hero-cliff]").count())
    .toBeGreaterThanOrEqual(5);
  await expect.poll(()=>study.locator("[data-km-rock-hero-rib]").count())
    .toBeGreaterThanOrEqual(20);
  await expect.poll(()=>study.locator("[data-km-rock-hero-fold]").count())
    .toBeGreaterThanOrEqual(15);
  await expect.poll(()=>study.locator("[data-km-rock-hero-fold-fibre]").count())
    .toBeGreaterThanOrEqual(45);
  await expect.poll(()=>study.locator("[data-km-rock-pima-stroke]").count())
    .toBeGreaterThanOrEqual(120);
  await expect.poll(()=>study.locator("[data-km-cliff-pine-grove]").count())
    .toBeGreaterThanOrEqual(5);
  await expect.poll(()=>study.locator("[data-km-cliff-pine-needle]").count())
    .toBeGreaterThanOrEqual(1550);
  await expect.poll(()=>study.locator("[data-km-cliff-pine-pad]").count())
    .toBeGreaterThanOrEqual(300);
  await expect.poll(()=>study.locator("[data-km-cliff-pine-ink-island]").count())
    .toBeGreaterThanOrEqual(200);
  await expect.poll(()=>study.locator("[data-km-cliff-pine-ink-canopy]").count())
    .toBeGreaterThanOrEqual(200);
  for(const lobes of [6,7,8])
    await expect.poll(()=>study.locator(
      '[data-km-cliff-pine-fan-lobes="'+lobes+'"]').count())
      .toBeGreaterThan(0);
  await expect.poll(()=>study.locator("[data-km-cliff-pine-ink-edge]").count())
    .toBeGreaterThanOrEqual(200);
  await expect.poll(()=>study.locator("[data-km-bamboo-secondary-shoot]").count())
    .toBeGreaterThan(0);
  await expect.poll(()=>study.locator("[data-km-bamboo-leaf-parent='spur-0']").count())
    .toBeGreaterThan(0);
  await expect.poll(()=>study.locator("[data-km-bamboo-satellite-leaf]").count())
    .toBeGreaterThan(0);
  await expect.poll(()=>study.locator("[data-km-bamboo-leaf-station]").count())
    .toBeGreaterThan(300);
  await expect.poll(()=>study.locator("[data-km-bamboo-satellite-station]").count())
    .toBeGreaterThan(150);
  await expect.poll(()=>study.locator("[data-km-bamboo-hero-leaf]").count())
    .toBeGreaterThan(150);
  await expect.poll(()=>study.locator("[data-km-bamboo-hero-twig]").count())
    .toBeGreaterThan(15);
  await expect.poll(()=>study.locator("[data-km-bamboo-hero-mask]").count())
    .toBeGreaterThan(150);
  await expect.poll(()=>study.locator("mask[id^='kmbamboo']").count())
    .toBeGreaterThan(150);
  await expect.poll(()=>study.locator(
    '[data-km-shanshui-bamboo-leaf][mask]'
  ).count()).toBeGreaterThan(100);
  await page.getByRole("button",{name:"Dry lifted brush · breeze"}).click();
  await expect(page.getByRole("slider",{name:"Brushwork detail"}))
    .toHaveValue("0.85");
  await expect(page.getByRole("slider",{name:"Brushwork seed"}))
    .toHaveValue("87");
  await page.getByRole("button",{name:"Wet loaded brush · still"}).click();
  await expect(page.getByRole("slider",{name:"Brushwork detail"}))
    .toHaveValue("1");
  const ink=page.getByRole("slider",{name:"Brushwork ink"});
  await ink.focus();
  await ink.press("Home");
  await expect(study.locator("[data-km-bamboo-ink-load]").first())
    .toHaveAttribute("data-km-bamboo-ink-load","0");
  await ink.press("End");
  await expect(study.locator("[data-km-bamboo-ink-load]").first())
    .toHaveAttribute("data-km-bamboo-ink-load","1");
  await study.screenshot({animations:"disabled",
    path:info.outputPath("shanshui-native-brush-detail-study.png")});
  const density=page.getByRole("slider",{name:"Brushwork detail"});
  await density.focus();
  await density.press("Home");
  await expect(density).toHaveValue("0");
  await expect(study.locator("[data-km-pine-needle-cluster]")).toHaveCount(0);
  await expect(study.locator("[data-km-bamboo-pressure-twig]")).toHaveCount(0);
});

test("geological ArtCraft proof compares source-rooted forms against a genuine missing-detail control",async({page},info)=>{
  await page.goto("/iframe.html?id=video-ink-shanshui--geological-ink-studio&viewMode=story");
  const lab=page.getByTestId("shanshui-geology-study");
  await expect(lab).toBeVisible();
  await expect(page.locator("[data-km-geology-condition]")).toHaveCount(3);
  const negative=page.locator('[data-km-geology-condition="no-structure"]');
  const original=page.locator('[data-km-geology-condition="original"]');
  const diluted=page.locator('[data-km-geology-condition="dilute"]');
  await expect(negative.locator("[data-km-rock-hero-cliff]")).toHaveCount(0);
  await expect(negative.locator("[data-km-rock-pima-stroke]")).toHaveCount(0);
  await expect(negative.locator("[data-km-rock-terrace]")).toHaveCount(0);
  await expect(negative.locator("[data-km-rock-interlocked-mass]")).toHaveCount(0);
  await expect(original.locator("[data-km-rock-interlocked-mass]")).toHaveCount(3);
  await expect(original.locator("[data-km-rock-mass-alum-cap]")).toHaveCount(6);
  await expect(original.locator("[data-km-rock-mass-erosion]")).toHaveCount(9);
  await expect(original.locator("[data-km-rock-mass-flow]")).toHaveCount(33);
  await expect(diluted.locator("[data-km-rock-mass-flow]")).toHaveCount(33);
  const fields=original.locator("[data-km-rock-mass-flow-group]");
  await expect(fields).toHaveCount(3);
  await expect(fields.nth(0)).toHaveAttribute("data-km-rock-mass-flow-count","14");
  await expect(fields.nth(1)).toHaveAttribute("data-km-rock-mass-flow-count","11");
  await expect(fields.nth(2)).toHaveAttribute("data-km-rock-mass-flow-count","8");

  await expect(diluted.locator("[data-km-rock-interlocked-mass]")).toHaveCount(3);
  // Low ink changes material only; the full multi-lobed contour is identical.
  expect(await original.locator("[data-km-rock-mass-underwash]").first()
    .getAttribute("d")).toBe(await diluted.locator(
      "[data-km-rock-mass-underwash]").first().getAttribute("d"));

  await expect.poll(()=>original.locator("[data-km-rock-terrace]").count())
    .toBe(3);
  await expect.poll(()=>original.locator("[data-km-rock-terrace-hemp]").count())
    .toBe(40);

  const loadedHeroLayer=original.locator("[data-km-rock-hero-paint-layer]");
  await expect(loadedHeroLayer).toHaveCount(1);
  const heroOpacity=Number(await loadedHeroLayer.getAttribute("opacity"));
  expect(heroOpacity).toBeGreaterThan(.8);
  // The source-dark brushwork is outside its containing mountain's
  // double opacity, but stays physically clipped by the same crest.
  expect(await loadedHeroLayer.evaluate(node=>
    node.closest("[data-km-shanshui-ridge]"))).toBeNull();
  const clippedHero=loadedHeroLayer.locator("[clip-path]").first();
  const clip=await clippedHero.getAttribute("clip-path");
  expect(clip).toMatch(/^url\(#.+-hero-1-clip\)$/);
  const clipId=clip!.slice(5,-1);
  await expect(loadedHeroLayer.locator("clipPath[id='"+clipId+"']"))
    .toHaveCount(1);

  await expect.poll(()=>diluted.locator("[data-km-rock-terrace-hemp]").count())
    .toBe(40);

  await expect.poll(()=>original.locator("[data-km-rock-pima-stroke]").count())
    .toBeGreaterThan(10);
  await expect.poll(()=>diluted.locator("[data-km-rock-pima-stroke]").count())
    .toBeGreaterThan(10);
  const loaded=original.locator("[data-km-rock-hero-fold-pressure]").first();
  const pale=diluted.locator("[data-km-rock-hero-fold-pressure]").first();
  await expect(loaded).toBeAttached();
  await expect(pale).toBeAttached();
  // The geometry path is unchanged for a material-only comparison.
  expect(await loaded.getAttribute("d")).toBe(await pale.getAttribute("d"));
  expect(await original.locator("[data-km-rock-pima-stroke]").count())
    .toBe(await diluted.locator("[data-km-rock-pima-stroke]").count());
  await lab.screenshot({animations:"disabled",
    path:info.outputPath("shanshui-artcraft-geology-3way.png")});
  // Each stage is the same live export scene at three source-review scales.
  const zoom=page.getByRole("slider",{name:"Geology zoom"});
  await expect(zoom).toHaveValue("1.75");
  await page.getByRole("button",{name:"Hemp-fibre and alum-head · meso"}).click();
  await expect(zoom).toHaveValue("2.4");
  await page.getByRole("button",{name:"Ink-pressure and paper reserve · micro"}).click();
  await expect(zoom).toHaveValue("3.45");
  await page.getByRole("button",{name:"Full hill-back silhouette · macro"}).click();
  await expect(zoom).toHaveValue("1.75");
  const frame=page.getByRole("slider",{name:"Geology frame"});
  await frame.focus();
  await frame.press("Home");
  await expect(original).toHaveAttribute("data-km-geology-frame","0");
  await frame.press("End");
  await expect(original).toHaveAttribute("data-km-geology-frame","299");
  await page.getByRole("button",{name:"Reset geology proof"}).click();
  await expect(frame).toHaveValue("145");
  const first=await original.locator("[data-km-geology-crop]").screenshot({animations:"disabled"});
  await page.getByRole("slider",{name:"Geology seed"}).focus();
  await page.getByRole("slider",{name:"Geology seed"}).press("ArrowRight");
  await expect(original).toHaveAttribute("data-km-geology-seed","72");
  await page.getByRole("button",{name:"Reset geology proof"}).click();
  const again=await original.locator("[data-km-geology-crop]").screenshot({animations:"disabled"});
  expect(hash(first)).toBe(hash(again));
});

test("one Shanshui Storybook folder also exposes the real three-phase garment study",async({page},info)=>{
  await page.goto("/iframe.html?id=video-ink-shanshui--garment-motion-studio&viewMode=story");
  await expect(page.getByTestId("shanshui-garment-studio")).toBeVisible();
  await expect(page.locator("[data-gait-study-frame]")).toHaveCount(3);
  await expect(page.locator('[data-gait-study-frame="60"]')).toHaveCount(1);
  await expect(page.locator('[data-gait-study-frame="73"]')).toHaveCount(1);
  await expect(page.locator('[data-gait-study-frame="86"]')).toHaveCount(1);
  await expect(page.locator('[data-km-ink-character-frame="60"]')).toHaveCount(1);
  await expect(page.locator('[data-km-ink-character-frame="73"]')).toHaveCount(1);
  await expect(page.locator('[data-km-ink-character-frame="86"]')).toHaveCount(1);
  await page.getByTestId("shanshui-garment-studio").screenshot({
    animations:"disabled",path:info.outputPath("shanshui-garment-three-phases.png"),
  });
});

test("opaque hem panels remain attached to the walking scholar through two gait poses",async({page},info)=>{
  await page.goto("/iframe.html?id=video-ink-shanshui--gallery-studio&viewMode=story");
  const stage=page.getByTestId("shanshui-preview");
  const left=page.locator('[data-km-ink-character-part="hem-panel-left"]');
  const right=page.locator('[data-km-ink-character-part="hem-panel-right"]');
  await expect.poll(()=>left.count()).toBeGreaterThanOrEqual(4);
  await expect.poll(()=>right.count()).toBeGreaterThanOrEqual(4);
  await seek(page,60);
  await stage.screenshot({animations:"disabled",
    path:info.outputPath("shanshui-hem-contact-frame60.png")});
  await seek(page,73);
  await stage.screenshot({animations:"disabled",
    path:info.outputPath("shanshui-hem-contact-frame73.png")});
  await seek(page,86);
  await stage.screenshot({animations:"disabled",
    path:info.outputPath("shanshui-hem-contact-frame86.png")});
  await expect(left.first()).toBeAttached();
  await expect(right.first()).toBeAttached();
});

test("the gallery opens on a painted walking pose and plays forward",async({page})=>{
  await page.goto("/iframe.html?id=video-ink-shanshui--gallery-studio&viewMode=story");
  const slider=page.getByRole("slider",{name:/Shanshui frame/});
  await expect(slider).toHaveValue("84");
  await page.getByRole("button",{name:"Play film"}).click();
  await expect.poll(async()=>Number(await slider.inputValue())).toBeGreaterThan(90);
  await page.getByRole("button",{name:"Pause film"}).click();
  await expect(page.getByRole("button",{name:"Play film"})).toBeVisible();
});

test("gallery restarts playback from frame zero after the final frame",async({page})=>{
  await page.goto("/iframe.html?id=video-ink-shanshui--gallery-studio&viewMode=story");
  await seek(page,299);
  await page.getByRole("button",{name:"Play film"}).click();
  const frame=page.getByRole("slider",{name:/Shanshui frame/});
  await expect.poll(async()=>Number(await frame.inputValue()),{
    timeout:12000,
  }).toBeLessThan(299);
  await expect(page.getByRole("button",{name:"Pause film"})).toBeVisible();
  await page.getByRole("button",{name:"Pause film"}).click();
  await expect(page.getByRole("button",{name:"Play film"})).toBeVisible();
});


test("reduced-motion gallery stays static and does not present a nonfunctional player",async({page})=>{
  await page.goto("/iframe.html?id=video-ink-shanshui--gallery-studio&viewMode=story");
  const frame=page.getByRole("slider",{name:/Shanshui frame/});
  await seek(page,180);
  await page.getByRole("checkbox",{name:"Reduced motion"}).check();
  const play=page.getByRole("button",{name:"Play film"});
  await expect(play).toBeDisabled();
  await expect(frame).toHaveValue("180");
  await page.waitForTimeout(150);
  await expect(frame).toHaveValue("180");
  await page.getByRole("checkbox",{name:"Reduced motion"}).uncheck();
  await expect(play).toBeEnabled();
});
