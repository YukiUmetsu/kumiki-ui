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


// ArtCraft source-to-render causality audit. The old Fuchun screenshot
// reads as a fan of very dark slashes. We need to distinguish the
// mountain's old hero strata from its 78 named contemporary ink fibres,
// not guess at opacity and destroy valid micro-element craftsmanship.
test("Fuchun ink layer differential QA identifies actual dark-spoke producer",async({page},info)=>{
  await page.goto("/iframe.html?id=video-ink-shanshui--four-masters-ink-studio&viewMode=story");
  const card=page.locator('[data-km-master-study="fuchun"]');
  await expect(card).toBeVisible();
  const hero=card.locator("[data-km-rock-hero-cliff]");
  const master=card.locator("[data-km-master-rock-art]");
  await expect(hero).toHaveCount(1);
  await expect(master).toHaveCount(1);
  const baseline=await card.screenshot({animations:"disabled",
    path:info.outputPath("fuchun-layer-full.png")});
  for(const [name,selector] of [
    ["without-hero",'[data-km-rock-hero-cliff]'],
    ["without-master",'[data-km-master-rock-art]'],
  ] as const){
    const style=await page.addStyleTag({content:
      '[data-km-master-study="fuchun"] '+selector+
      '{visibility:hidden!important}'});
    const filtered=await card.screenshot({animations:"disabled",
      path:info.outputPath("fuchun-layer-"+name+".png")});
    expect(hash(filtered)).not.toBe(hash(baseline));
    await style.evaluate(n=>(n as HTMLStyleElement).remove());
  }
  // SVG filter rasters may differ at the subpixel level after hiding
  // and restoring layers. The scene must restore *visible group
  // semantics*; exact-frame geometry determinism is tested separately.
  await expect(hero).toBeVisible();
  await expect(master).toBeVisible();
});

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
    await expect(card.locator("[data-km-cliff-pine-crab-claw]"))
      .toHaveCount(school==="early-spring"?40:0);
    await expect(card.locator("[data-km-master-stroke]"))
      .toHaveCount(count);
    await expect(card.locator("[data-km-master-stratum]")).toHaveCount(15);
    await expect(card.locator("[data-km-master-stratum-wash]")).toHaveCount(15);
    await expect(card.locator("[data-km-master-stratum-lip]")).toHaveCount(15);
    // True native-render proof: all 15 long hemp parents are CURVING
    // painted stone centerlines; their full 78 brush children receive
    // explicit stations on the same (nonquadratic) parent bone.
    const curvedStrata=card.locator("[data-km-master-stratum-centerline]");
    await expect(curvedStrata).toHaveCount(school==="fuchun"?15:0);
    await expect(card.locator("[data-km-master-stroke-bank-station]"))
      .toHaveCount(school==="fuchun"?78:0);
    if(school==="fuchun"){
      const bend=await curvedStrata.evaluateAll(nodes=>nodes.map(node=>{
        const d=node.getAttribute("data-km-master-stratum-centerline")??"";
        const p=(d.match(/-?\d+(?:\.\d+)?/g)??[]).map(Number);
        if(p.length!==8||!d.startsWith("M")||!d.includes(" C"))return -1;
        const dx=p[6]-p[0];
        return Math.abs(p[2]-p[0]-dx/3)+
          Math.abs(p[4]-p[0]-2*dx/3);
      }));
      expect(bend.filter(v=>v>12).length).toBeGreaterThanOrEqual(12);
    }

    const gullies=school==="forest-grotto"?9:0;
    await expect(card.locator("[data-km-master-wang-gully]"))
      .toHaveCount(gullies);
    await expect(card.locator("[data-km-master-wang-gully-shadow]"))
      .toHaveCount(gullies);
    await expect(card.locator("[data-km-master-wang-gully-rim]"))
      .toHaveCount(gullies);
    await expect(card.locator("[data-km-master-wang-gully-fold]"))
      .toHaveCount(gullies);
    const clouds=school==="early-spring"?12:0;
    await expect(card.locator("[data-km-master-cloud-bank]"))
      .toHaveCount(clouds);
    await expect(card.locator("[data-km-master-cloud-mass]"))
      .toHaveCount(clouds);
    await expect(card.locator("[data-km-master-cloud-crown]"))
      .toHaveCount(clouds);
    await expect(card.locator("[data-km-master-cloud-recess]"))
      .toHaveCount(clouds);
    await expect(card.locator("[data-km-master-cloud-undercut]"))
      .toHaveCount(clouds);
    await expect(card.locator("[data-km-master-cloud-shelf]"))
      .toHaveCount(clouds);
    if(school==="early-spring")
      for(const motif of [0,1,2,3])
        await expect(card.locator('[data-km-master-cloud-morph="'+motif+'"]'))
          .toHaveCount(3);
    // Six structural Fuchun back masses (two each in three parent
    // stone cheeks) must be *painted volumes*, not CSS preset labels.
    const roundedCount=school==="fuchun"?6:0;
    await expect(card.locator("[data-km-master-fuchun-hillback]"))
      .toHaveCount(roundedCount);
    await expect(card.locator("[data-km-master-fuchun-hillback-wash]"))
      .toHaveCount(roundedCount);
    await expect(card.locator("[data-km-master-fuchun-hillback-lip]"))
      .toHaveCount(roundedCount);
    if(school==="fuchun"){
      await expect(card.locator('[data-km-master-fuchun-hillback-form="round"]'))
        .toHaveCount(3);
      await expect(card.locator('[data-km-master-fuchun-hillback-form="saddle"]'))
        .toHaveCount(3);
    }
    // The Fuchun grove visibly departs from five identical pine
    // antennas: five true ridge-planted trunks, twenty individual
    // pressure-loaded boughs and all original texture needle taps.
    const treeHeights=await card.locator("[data-km-cliff-pine-height]")
      .evaluateAll(nodes=>nodes.map(node=>
        Number(node.getAttribute("data-km-cliff-pine-height"))));
    expect(treeHeights).toHaveLength(5);
    if(school==="fuchun"){
      expect(Math.max(...treeHeights)-Math.min(...treeHeights))
        .toBeGreaterThan(54);
      const sites=await card.locator("[data-km-cliff-pine-root]").evaluateAll(
        nodes=>nodes.map(node=>Number((node.getAttribute("data-km-cliff-pine-root")??"").split(",")[0])));
      expect(sites).toHaveLength(5);
      expect(sites[4]-sites[0]).toBeGreaterThan(160);
      expect(sites.slice(1).filter((x,j)=>x-sites[j]>50)).toHaveLength(2);
    }
    const boughStations=await card.locator(
      "[data-km-cliff-pine-bough-station]").evaluateAll(nodes=>nodes.map(
        node=>Number(node.getAttribute("data-km-cliff-pine-bough-station"))));
    expect(boughStations).toHaveLength(20);
    if(school==="fuchun")
      expect(new Set(boughStations).size).toBeGreaterThan(13);
    // Real exact-frame native branches carry the same continuously
    // painted thick/dry bunches from their own skeleton; never copied
    // screenshot leaves or free-floating decorative dots.
    const wet=card.locator("[data-km-cliff-pine-wet-cluster]");
    await expect(wet).toHaveCount(school==="fuchun"?119:0);
    if(school==="fuchun"){
      const ends=await card.locator(
        "[data-km-cliff-pine-bough-centerline]").evaluateAll(nodes=>
          nodes.map(node=>{
            const n=(node.getAttribute("data-km-cliff-pine-bough-centerline")??"")
              .match(/-?\d+(?:\.\d+)?/g)?.map(Number)??[];
            return n[5]-n[1];
          }));
      expect(ends.filter(n=>n>2).length).toBeGreaterThanOrEqual(6);
      expect(ends.filter(n=>n< -4).length).toBeGreaterThanOrEqual(7);
      const loads=await wet.evaluateAll(nodes=>nodes.map(node=>
        Number(node.getAttribute("data-km-cliff-pine-wet-cluster-weight"))));
      expect(Math.max(...loads)-Math.min(...loads)).toBeGreaterThan(1.3);
      const connected=await wet.evaluateAll(nodes=>nodes.every(node=>{
        const root=node.getAttribute("data-km-cliff-pine-wet-cluster-root");
        const d=node.getAttribute("d")??"";
        return Boolean(root&&d.startsWith("M"+root.replace(","," "))&&
          d.endsWith(" Z"));
      }));
      expect(connected).toBe(true);
    }
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
    const hempPhrases=card.locator("[data-km-master-stroke-phrase]");
    await expect(hempPhrases).toHaveCount(school==="fuchun"?78:0);
    if(school==="fuchun"){
      const strokes=await hempPhrases.evaluateAll(nodes=>nodes.map(node=>{
        const root=node.getAttribute("data-km-master-stroke-root")??"";
        const axis=node.getAttribute("data-km-master-stroke-axis")??"";
        return {phrase:node.getAttribute("data-km-master-stroke-phrase"),
          connected:axis.startsWith("M"+root.replace(","," "))&&
            axis.includes(" C")};
      }));
      expect(strokes.every(stroke=>stroke.connected)).toBe(true);
      for(const phrase of ["short","medium","long"])
        expect(strokes.filter(stroke=>stroke.phrase===phrase).length)
          .toBeGreaterThanOrEqual(12);
    }
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
    // Fuchun's four fracture gestures now actually follow a parent
    // painted bank with three direction-changing curved sections, while
    // all twelve source reloads and eight attached twigs are retained.
    const hillWashes=card.locator("[data-km-rock-hero-hill-wash]");
    const hillFibres=card.locator("[data-km-rock-hero-hill-fibre]");
    await expect(hillWashes).toHaveCount(school==="fuchun"?3:0);
    await expect(hillFibres).toHaveCount(school==="fuchun"?12:0);
    if(school==="fuchun"){
      const roots=await hillWashes.evaluateAll(nodes=>nodes.map(node=>{
        const r=node.getAttribute("data-km-rock-hero-hill-wash-root")??"";
        const d=node.getAttribute("d")??"";
        const id=node.getAttribute("fill")??"";
        return {r,attached:d.startsWith("M"+r.replace(","," ")),
          closed:d.endsWith(" Z"),gradient:id.startsWith("url(#")};
      }));
      expect(roots.every(x=>x.attached&&x.closed&&x.gradient)).toBe(true);
      expect(new Set(roots.map(x=>x.r)).size).toBe(3);
      const p=await hillFibres.evaluateAll(nodes=>nodes.map(node=>
        node.getAttribute("data-km-rock-hero-hill-fibre-parent")));
      expect(p).toEqual(["0","0","0","0","0","1","1","1","1","2","2","2"]);
    }
    const heroCourses=card.locator('[data-km-rock-hero-rib-course="folded-3"]');
    await expect(heroCourses).toHaveCount(school==="fuchun"?4:0);
    if(school==="fuchun"){
      const supported=await heroCourses.evaluateAll(nodes=>nodes.map(
        node=>node.getAttribute("data-km-rock-hero-rib-support")));
      expect(supported).toEqual(["0","1","2","1"]);
      const faces=card.locator("[data-km-rock-hero-face]");
      await expect(faces).toHaveCount(4);
      for(const d of await faces.evaluateAll(nodes=>nodes.map(
        node=>node.getAttribute("d")??"")))
        expect((d.match(/(?:^| )M/g)??[])).toHaveLength(3);
      await expect(card.locator("[data-km-rock-hero-rib-deposit]"))
        .toHaveCount(12);
      await expect(card.locator("[data-km-rock-hero-fibre]"))
        .toHaveCount(8);
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


test("four-master ArtCraft gallery can inspect full native film and macro/meso/micro without replacing film stages",async({page},info)=>{
  await page.goto("/iframe.html?id=video-ink-shanshui--four-masters-ink-studio&viewMode=story");
  const lab=page.getByTestId("shanshui-master-ink-study");
  const stages=lab.locator("[data-km-master-study]");
  const cameras=lab.locator("[data-km-master-camera-view]");
  await expect(stages).toHaveCount(4);
  await expect(cameras).toHaveCount(4);
  await expect(cameras.first()).toHaveAttribute("data-km-master-camera-view","crop");
  await page.getByRole("button",{name:"Full film · 16:9"}).click();
  await expect(cameras.first()).toHaveAttribute("data-km-master-camera-view","film");
  const transform=await cameras.first().locator(":scope > div").getAttribute("style");
  expect(transform).toContain("scale(0.4375)");
  // No second test renderer or cached screenshot is substituted for the real film.
  for(const school of ["fuchun","early-spring","travelers","forest-grotto"]){
    const card=lab.locator('[data-km-master-study="'+school+'"]');
    await expect(card.locator("[data-km-shanshui-scene]")).toHaveCount(1);
    await expect(card.locator("image")).toHaveCount(0);
  }
  await page.getByRole("button",{name:"Rock strata · meso"}).click();
  await expect(cameras.first()).toHaveAttribute("data-km-master-camera-view","crop");
  await expect(page.getByRole("slider",{name:"Master zoom"})).toHaveValue("2.4");
  await page.getByRole("button",{name:"Brush edge · micro"}).click();
  await expect(page.getByRole("slider",{name:"Master zoom"})).toHaveValue("3.35");
  await page.getByRole("button",{name:"Summit · macro"}).click();
  await expect(page.getByRole("slider",{name:"Master zoom"})).toHaveValue("1.65");
  await page.getByRole("button",{name:"Pine grove · full crowns"}).click();
  await expect(page.getByRole("slider",{name:"Master zoom"})).toHaveValue("1.65");
  await expect(page.getByRole("slider",{name:"Master crop X"})).toHaveValue("628");
  await expect(page.getByRole("slider",{name:"Master crop Y"})).toHaveValue("137");
  await expect(page.getByRole("button",{name:"Pine grove · full crowns"}))
    .toHaveAttribute("aria-pressed","true");
  await expect(cameras.first()).toHaveAttribute("data-km-master-camera-view","crop");
  // Independent native screenshot for large-pine centerline/fan silhouettes.
  // This is the same four live renderer stages, not a flattened source.
  await page.screenshot({animations:"disabled",
    path:info.outputPath("shanshui-full-pine-crowns-145.png")});
  await page.getByRole("slider",{name:"Master frame"}).focus();
  await page.getByRole("slider",{name:"Master frame"}).press("End");
  await expect(lab.locator("[data-km-master-study='fuchun'] [data-km-shanshui-scene]"))
    .toHaveAttribute("data-km-shanshui-frame","299");
  await page.getByRole("button",{name:"Reset all four studies"}).click();
  await expect(page.getByRole("slider",{name:"Master frame"})).toHaveValue("145");
  await expect(cameras.first()).toHaveAttribute("data-km-master-camera-view","crop");
});

test("Fuchun bank inspection preserves the live film while isolating root-linked ink phrases",async({page},info)=>{
  await page.goto("/iframe.html?id=video-ink-shanshui--four-masters-ink-studio&viewMode=story");
  const lab=page.getByTestId("shanshui-master-ink-study");
  const fuchun=lab.locator('[data-km-master-study="fuchun"]');
  const upper=fuchun.locator('[data-km-master-stroke-source-zone="upper-bank"]');
  const lower=fuchun.locator('[data-km-master-stroke-source-zone="lower-bank"]');
  await expect(fuchun.locator("[data-km-master-stroke]")).toHaveCount(78);
  const upperCount=await upper.count(),lowerCount=await lower.count();
  expect(upperCount).toBeGreaterThan(18);
  expect(lowerCount).toBeGreaterThan(15);
  expect(upperCount+lowerCount).toBe(78);
  await expect(lab).toHaveAttribute("data-km-master-ink-inspection","all");
  await expect(upper.first()).toBeVisible();
  await expect(lower.first()).toBeVisible();

  await page.getByRole("button",{name:"Upper-bank contacts only"}).click();
  await expect(lab).toHaveAttribute("data-km-master-ink-inspection","upper");
  await expect(upper.first()).toBeVisible();
  await expect(lower.first()).toBeHidden();
  await expect(fuchun.locator("[data-km-master-stroke]")).toHaveCount(78);
  await expect(fuchun.locator("[data-km-master-stratum]")).toHaveCount(15);
  await expect(fuchun.locator("[data-km-master-fuchun-hillback]")).toHaveCount(6);
  await fuchun.locator("[data-km-master-camera-view]").screenshot({
    animations:"disabled",path:info.outputPath("fuchun-upper-banks-native.png")});

  await page.getByRole("button",{name:"Lower-bank contacts only"}).click();
  await expect(lab).toHaveAttribute("data-km-master-ink-inspection","lower");
  await expect(lower.first()).toBeVisible();
  await expect(upper.first()).toBeHidden();
  await expect(fuchun.locator("[data-km-master-stroke]")).toHaveCount(78);
  for(const school of ["early-spring","travelers","forest-grotto"]){
    const other=lab.locator('[data-km-master-study="'+school+'"]');
    await expect(other.locator("[data-km-master-stroke]")).not.toHaveCount(0);
    await expect(other.locator("[data-km-master-stroke-source-zone]")).toHaveCount(0);
  }
  // Native isolated stone anatomy is rendered by the SAME film SVG.
  // Compare parent positive volumes without overlaid pine and hemp ink.
  const undercuts=fuchun.locator("[data-km-master-fuchun-hillback-undercut]");
  const courses=fuchun.locator("[data-km-master-fuchun-cross-shelf]");
  await expect(undercuts).toHaveCount(6);
  await expect(courses).toHaveCount(12);
  const axes=await courses.evaluateAll(nodes=>nodes.map(node=>({
    root:node.getAttribute("data-km-master-fuchun-cross-shelf-root")??"",
    d:node.getAttribute("data-km-master-fuchun-cross-shelf-axis")??"",
    clip:node.getAttribute("clip-path")??"",
  })));
  expect(axes.every(({root,d,clip})=>
    d.startsWith("M"+root.replace(","," "))&&
    d.includes(" C")&&clip.endsWith("-volume-clip)"))).toBe(true);
  await page.getByRole("button",{name:"Stone volumes · brush hidden"}).click();
  await expect(lab).toHaveAttribute("data-km-master-ink-inspection","stone");
  const stratumFields=fuchun.locator("[data-km-master-stratum-field]");
  const brushFields=fuchun.locator("[data-km-master-brush-field]");
  // Three source stone faces each own a field; never call a singular
  // visibility assertion on a multi-match Playwright locator.
  await expect(stratumFields).toHaveCount(3);
  await expect(brushFields).toHaveCount(3);
  for(let i=0;i<3;i++){
    await expect(stratumFields.nth(i)).toBeHidden();
    await expect(brushFields.nth(i)).toBeHidden();
  }
  await expect(fuchun.locator("[data-km-cliff-pine-grove]")).toBeHidden();
  await expect(fuchun.locator("[data-km-rock-hero-cliff]")).toBeHidden();
  await expect(fuchun.locator("[data-km-master-fuchun-hillback-wash]")).toHaveCount(6);
  // Visual proof is sampled from the actual animated 1.65× SVG
  // silhouette, not copied from a study-only simplified illustration.
  const masses=await fuchun.locator("[data-km-master-mass]")
    .evaluateAll(nodes=>nodes.map(n=>n.getAttribute("d")??""));
  expect(masses).toHaveLength(3);
  const backs=await fuchun.locator("[data-km-master-fuchun-hillback-wash]")
    .evaluateAll(nodes=>nodes.map(n=>n.getAttribute("d")??""));
  expect(backs).toHaveLength(6);
  const broad=(d:string,minimum:number)=>{
    const n=(d.match(/-?\d+(?:\.\d+)?/g)??[]).map(Number);
    const x=n.filter((_,j)=>j%2===0),y=n.filter((_,j)=>j%2===1);
    const spanX=Math.max(...x)-Math.min(...x);
    const spanY=Math.max(...y)-Math.min(...y);
    return (d.match(/ C/g)??[]).length===7&&spanX/spanY>minimum;
  };
  expect(masses.every(d=>broad(d,.83))).toBe(true);
  expect(backs.every(d=>broad(d,.76))).toBe(true);
  await expect(undercuts).toHaveCount(6);
  await expect(courses).toHaveCount(12);
  await expect(courses.locator("xpath=..").first()).toBeVisible();
  for(const school of ["early-spring","travelers","forest-grotto"]){
    await expect(lab.locator('[data-km-master-study="'+school+'"]')
      .locator("[data-km-master-fuchun-cross-shelf]")).toHaveCount(0);
  }
  await expect(fuchun.locator("[data-km-master-stroke]")).toHaveCount(78);
  await expect(fuchun.locator("[data-km-master-stratum]")).toHaveCount(15);
  await fuchun.locator("[data-km-master-camera-view]").screenshot({
    animations:"disabled",path:info.outputPath("fuchun-native-joined-stone-undercuts-145.png")});
  await page.getByRole("button",{name:"All Fuchun hemp"}).click();
  await expect(lab).toHaveAttribute("data-km-master-ink-inspection","all");
  await expect(upper.first()).toBeVisible();
  await expect(lower.first()).toBeVisible();
  await expect(fuchun.locator("[data-km-cliff-pine-grove]")).toBeVisible();
  const middle=fuchun.locator('[data-km-shanshui-ridge-contour="1"]');
  const originalRidge=await middle.getAttribute("d");
  expect(originalRidge).toContain(" L");
  await page.getByRole("button",{name:"Skyline · contour only"}).click();
  await expect(lab).toHaveAttribute("data-km-master-ink-inspection","ridge");
  await expect(middle).toBeVisible();
  await expect(middle).toHaveAttribute("d",originalRidge!);
  await expect(fuchun.locator('[data-km-shanshui-ridge="1"] [data-km-shanshui-cunfa]').first())
    .toBeHidden();
  await expect(fuchun.locator("[data-km-master-mass]").first())
    .toBeHidden();
  await expect(fuchun.locator("[data-km-cliff-pine-grove]")).toBeHidden();
  const other=lab.locator('[data-km-master-study="early-spring"]');
  await expect(other.locator('[data-km-shanshui-ridge-contour="1"]'))
    .toBeVisible();
  await expect(other.locator("[data-km-master-mass]").first())
    .toBeVisible();
  // The Fuchun pale mountain is now a more held source-specific far
  // shoulder; Guo Xi keeps the original far contour, not this school’s
  // new front/back rock grammar or a shared flattened skyline.
  const far=fuchun.locator('[data-km-shanshui-ridge-contour="0"]');
  const otherFar=other.locator('[data-km-shanshui-ridge-contour="0"]');
  await expect(far).toBeVisible();
  await expect(otherFar).toBeVisible();
  expect(await far.getAttribute("d")).not.toBe(
    await otherFar.getAttribute("d"));
  await fuchun.locator("[data-km-master-camera-view]").screenshot({
    animations:"disabled",path:info.outputPath("fuchun-native-rolling-skyline-145.png")});
  // Compare native *same-frame* Fuchun brush pigments before and after
  // physical paper-fibre abrasion, without deleting paths or changing
  // another master's volume/ink or the production film renderer.
  const fibres=fuchun.locator("[data-km-master-stroke-loaded][mask]");
  expect(await fibres.count()).toBeGreaterThan(18);
  expect(await fibres.count()).toBeLessThan(45);
  const nativeMasks=await fibres.evaluateAll(nodes=>nodes.map(el=>({
    geometry:el.getAttribute("d"),
    mask:el.getAttribute("mask"),
  })));
  const heroRibs=fuchun.locator("[data-km-rock-hero-rib-reserve]");
  const heroFaces=fuchun.locator("[data-km-rock-hero-face][mask]");
  const heroCreases=fuchun.locator("[data-km-rock-hero-crease][mask]");
  await expect(heroRibs).toHaveCount(4);
  await expect(heroFaces).toHaveCount(4);
  await expect(heroCreases).toHaveCount(4);
  const heroOriginal=await heroFaces.evaluateAll(nodes=>nodes.map(
    el=>({geometry:el.getAttribute("d"),mask:el.getAttribute("mask")})));
  await page.getByRole("button",{name:"Ink before dry-paper lift"}).click();
  await expect(lab).toHaveAttribute("data-km-master-ink-inspection","uncut");
  expect(await fibres.first().evaluate(el=>getComputedStyle(el).maskImage))
    .toBe("none");
  expect(await heroFaces.first().evaluate(el=>getComputedStyle(el).maskImage))
    .toBe("none");
  expect(await heroCreases.first().evaluate(el=>getComputedStyle(el).maskImage))
    .toBe("none");
  await expect(fuchun.locator("[data-km-master-stroke]")).toHaveCount(78);
  await expect(fuchun.locator("[data-km-master-stroke-reserve]"))
    .toHaveCount(nativeMasks.length);
  await fuchun.locator("[data-km-master-camera-view]").screenshot({
    animations:"disabled",path:info.outputPath("fuchun-native-before-paper-lift-145.png")});
  await page.getByRole("button",{name:"All Fuchun hemp"}).click();
  await expect(lab).toHaveAttribute("data-km-master-ink-inspection","all");
  const restored=await fibres.evaluateAll(nodes=>nodes.map(el=>({
    geometry:el.getAttribute("d"),
    mask:el.getAttribute("mask"),
  })));
  expect(restored).toEqual(nativeMasks);
  expect(await heroFaces.evaluateAll(nodes=>nodes.map(
    el=>({geometry:el.getAttribute("d"),mask:el.getAttribute("mask")}))))
    .toEqual(heroOriginal);
  expect(await fibres.first().evaluate(el=>getComputedStyle(el).maskImage))
    .not.toBe("none");
  expect(await heroFaces.first().evaluate(el=>getComputedStyle(el).maskImage))
    .not.toBe("none");
  expect(await heroCreases.first().evaluate(el=>getComputedStyle(el).maskImage))
    .not.toBe("none");
  await fuchun.locator("[data-km-master-camera-view]").screenshot({
    animations:"disabled",path:info.outputPath("fuchun-native-after-paper-lift-145.png")});
  await page.getByRole("button",{name:"Reset all four studies"}).click();
  await expect(lab).toHaveAttribute("data-km-master-ink-inspection","all");
  await expect(middle).toHaveAttribute("d",originalRidge!);
  await expect(fuchun.locator('[data-km-shanshui-ridge="1"] [data-km-shanshui-cunfa]').first())
    .toBeVisible();
  await expect(fuchun.locator("[data-km-cliff-pine-grove]")).toBeVisible();
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
  await expect.poll(()=>study.locator("[data-km-rock-hero-rib-deposit]").count())
    .toBeGreaterThanOrEqual(60);
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


test("Fuchun paper-lift Storybook compares native masked ink without changing source geometry",async({page},info)=>{
  await page.goto("/iframe.html?id=video-ink-shanshui--fuchun-paper-lift&viewMode=story");
  const lab=page.getByTestId("shanshui-fuchun-paper-lift-studio");
  await expect(lab).toBeVisible();
  const uncut=lab.locator('[data-km-fuchun-material="uncut"]');
  const lifted=lab.locator('[data-km-fuchun-material="lifted"]');
  await expect(uncut).toHaveAttribute("data-km-fuchun-camera","fibre");
  await expect(lifted).toHaveAttribute("data-km-fuchun-camera","fibre");
  await expect(uncut.locator("[data-km-master-stroke]")).toHaveCount(78);
  await expect(lifted.locator("[data-km-master-stroke]")).toHaveCount(78);
  for(const panel of [uncut,lifted]){
    await expect(panel.locator("[data-km-master-fuchun-hillback]")).toHaveCount(6);
    await expect(panel.locator("[data-km-master-fuchun-cross-shelf]")).toHaveCount(12);
    await expect(panel.locator("[data-km-rock-hero-rib]")).toHaveCount(4);
    await expect(panel.locator("[data-km-shanshui-scene]"))
      .toHaveAttribute("data-km-shanshui-frame","145");
    await expect(panel.locator("image")).toHaveCount(0);
  }
  // Preserve every individual loaded brush source path byte-for-byte,
  // rather than comparing the appearance of two separately constructed SVGs.
  const source=async(panel:typeof uncut)=>panel.locator(
    "[data-km-master-stroke-loaded]"
  ).evaluateAll(nodes=>nodes.map(node=>({
    d:node.getAttribute("d"),
    ink:node.getAttribute("fill"),
    load:node.getAttribute("opacity"),
    reserve:node.hasAttribute("mask"),
  })));
  // SVG mask IDs are React-useId instance-local by design; compare the
  // presence of masks, not two valid but different generated URL fragments.
  expect(await source(uncut)).toEqual(await source(lifted));
  const masked=uncut.locator("[data-km-master-stroke-loaded][mask]");
  await expect.poll(()=>masked.count()).toBeGreaterThan(0);
  const uncutMask=await masked.first().evaluate(node=>
    getComputedStyle(node).maskImage);
  const productionMask=await lifted.locator(
    "[data-km-master-stroke-loaded][mask]"
  ).first().evaluate(node=>getComputedStyle(node).maskImage);
  expect(uncutMask).toBe("none");
  expect(productionMask).not.toBe("none");

  const before=await uncut.locator("[data-km-fuchun-material-crop]").screenshot({
    animations:"disabled",path:info.outputPath("fuchun-pre-paper-lift-actual-svg.png"),
  });
  const after=await lifted.locator("[data-km-fuchun-material-crop]").screenshot({
    animations:"disabled",path:info.outputPath("fuchun-paper-lift-actual-svg.png"),
  });
  expect(hash(before)).not.toBe(hash(after));

  await page.getByRole("button",{name:"Full 16:9 film"}).click();
  await expect(uncut).toHaveAttribute("data-km-fuchun-camera","film");
  await expect(lifted).toHaveAttribute("data-km-fuchun-camera","film");
  await lab.screenshot({animations:"disabled",
    path:info.outputPath("fuchun-paper-lift-film-paired.png")});
  await page.getByRole("button",{name:"Rounded rock courses"}).click();
  await expect(uncut).toHaveAttribute("data-km-fuchun-camera","stone");
  const seed=page.getByRole("slider",{name:"Paper-lift seed"});
  await seed.focus();
  await seed.press("ArrowRight");
  await expect(uncut).toHaveAttribute("data-km-fuchun-seed","72");
  await expect(lifted).toHaveAttribute("data-km-fuchun-seed","72");
  expect(await source(uncut)).toEqual(await source(lifted));
  const frame=page.getByRole("slider",{name:"Paper-lift frame"});
  await frame.focus();
  await frame.press("End");
  await expect(uncut).toHaveAttribute("data-km-fuchun-frame","299");
  await expect(lifted.locator("[data-km-shanshui-scene]"))
    .toHaveAttribute("data-km-shanshui-frame","299");

  await page.getByRole("button",{name:"Reset paper-lift study"}).click();
  await expect(frame).toHaveValue("145");
  await expect(seed).toHaveValue("71");
  await expect(uncut).toHaveAttribute("data-km-fuchun-camera","fibre");
  await expect(page.getByRole("slider",{name:"Paper-lift ink"})).toHaveValue("0.9");
  expect(await source(uncut)).toEqual(await source(lifted));
});


test("Fuchun Storybook exposes original trunk-to-arm architecture while preserving fine botanical marks",async({page},info)=>{
  await page.goto("/iframe.html?id=video-ink-shanshui--four-masters-ink-studio&viewMode=story");
  const lab=page.getByTestId("shanshui-master-ink-study");
  const fuchun=lab.locator('[data-km-master-study="fuchun"]');
  const guo=lab.locator('[data-km-master-study="early-spring"]');
  const branches=fuchun.locator("[data-km-cliff-pine-bough-bone]");
  const crowns=fuchun.locator("[data-km-cliff-pine-ink-island]");
  await expect(branches).toHaveCount(20);
  await expect(crowns).toHaveCount(40);
  await expect(fuchun.locator("[data-km-cliff-pine-arm-reach]")).toHaveCount(20);
  const original=await branches.evaluateAll(nodes=>
    nodes.map(n=>n.getAttribute("d")));
  const button=page.getByRole("button",{name:"Pine armature · connected brush bones"});
  await button.click();
  await expect(button).toHaveAttribute("aria-pressed","true");
  await expect(lab).toHaveAttribute("data-km-master-ink-inspection","pine-bones");
  await expect(page.getByRole("slider",{name:"Master crop X"})).toHaveValue("615");
  await expect(branches.first()).toBeVisible();
  await expect(crowns.first()).toBeHidden();
  await expect(fuchun.locator("[data-km-cliff-pine-rootlet]").first())
    .toBeVisible();
  await expect(guo.locator("[data-km-cliff-pine-ink-island]").first())
    .toBeVisible();
  await fuchun.screenshot({animations:"disabled",
    path:info.outputPath("fuchun-authored-20-loaded-pine-arms.png")});
  await page.getByRole("button",{name:"Reset all four studies"}).click();
  await expect(button).toHaveAttribute("aria-pressed","false");
  await expect(crowns.first()).toBeVisible();
  expect(await branches.evaluateAll(nodes=>
    nodes.map(n=>n.getAttribute("d")))).toEqual(original);
});

test("Fuchun native pine anatomy Storybook preset preserves all loaded botanical details",async({page},info)=>{
  await page.goto("/iframe.html?id=video-ink-shanshui--four-masters-ink-studio&viewMode=story");
  const lab=page.getByTestId("shanshui-master-ink-study");
  const fuchun=lab.locator('[data-km-master-study="fuchun"]');
  const guo=lab.locator('[data-km-master-study="early-spring"]');
  await expect(fuchun.locator("[data-km-cliff-pine-graft]")).toHaveCount(60);
  await expect(fuchun.locator("[data-km-cliff-pine-ink-island]")).toHaveCount(40);
  await expect(fuchun.locator("[data-km-cliff-pine-needle]")).toHaveCount(310);
  const preset=page.getByRole("button",{name:"Pine crowns · source anatomy"});
  await preset.click();
  await expect(preset).toHaveAttribute("aria-pressed","true");
  await expect(lab).toHaveAttribute("data-km-master-ink-inspection","pine");
  await expect(page.getByRole("slider",{name:"Master crop X"})).toHaveValue("628");
  await expect(fuchun.locator("[data-km-master-rock-art]")).toBeHidden();
  await expect(fuchun.locator("[data-km-cliff-pine-grove]")).toBeVisible();
  await expect(guo.locator("[data-km-master-rock-art]")).toBeVisible();
  await fuchun.screenshot({animations:"disabled",
    path:info.outputPath("fuchun-pine-rooted-source-60-grafts.png")});
  await page.getByRole("button",{name:"Reset all four studies"}).click();
  await expect(preset).toHaveAttribute("aria-pressed","false");
  await expect(fuchun.locator("[data-km-master-rock-art]")).toBeVisible();
});


test("Fuchun pine-foot Storybook lens inspects actual trunk to mountain grounding",async({page},info)=>{
  await page.goto("/iframe.html?id=video-ink-shanshui--four-masters-ink-studio&viewMode=story");
  const lab=page.getByTestId("shanshui-master-ink-study");
  const fuchun=lab.locator('[data-km-master-study="fuchun"]');
  const guo=lab.locator('[data-km-master-study="early-spring"]');
  await expect(fuchun.locator("[data-km-cliff-pine]")).toHaveCount(5);
  await expect(fuchun.locator("[data-km-cliff-pine-rootlet]")).toHaveCount(15);
  await expect(fuchun.locator("[data-km-cliff-pine-ground-ink]")).toHaveCount(40);
  await expect(guo.locator("[data-km-cliff-pine-rootlet]")).toHaveCount(0);
  await page.getByRole("button",{name:"Pine feet · live ridge contact"}).click();
  await expect(lab).toHaveAttribute("data-km-master-ink-inspection","pine");
  await expect(page.getByRole("slider",{name:"Master zoom"})).toHaveValue("2.8");
  await expect(page.getByRole("slider",{name:"Master crop X"})).toHaveValue("615");
  await expect(page.getByRole("slider",{name:"Master crop Y"})).toHaveValue("145");
  await expect(fuchun.locator("[data-km-cliff-pine-grove]")).toBeVisible();
  await expect(fuchun.locator("[data-km-master-rock-art]")).toBeHidden();
  await expect(guo.locator("[data-km-master-rock-art]")).toBeVisible();
  await fuchun.screenshot({animations:"disabled",
    path:info.outputPath("fuchun-native-live-root-to-ridge-contact.png")});
  await page.getByRole("slider",{name:"Master seed"}).focus();
  await page.getByRole("slider",{name:"Master seed"}).press("ArrowRight");
  await expect(fuchun.locator("[data-km-cliff-pine-rootlet]")).toHaveCount(15);
  await page.getByRole("button",{name:"Reset all four studies"}).click();
  await expect(lab).toHaveAttribute("data-km-master-ink-inspection","all");
  await expect(fuchun.locator("[data-km-master-rock-art]")).toBeVisible();
});

test("geological ArtCraft proof compares real native paintings across independently seeded constructions",async({page},info)=>{
  await page.goto("/iframe.html?id=video-ink-shanshui--geological-ink-studio&viewMode=story");
  const lab=page.getByTestId("shanshui-geology-study");
  const original=lab.locator('[data-km-geology-condition="original"]');
  const alternate=lab.locator('[data-km-geology-condition="seed-variation"]');
  const checkbox=page.getByRole("checkbox",{name:"Compare alternate seed"});
  await expect(checkbox).not.toBeChecked();
  await expect(alternate).toHaveCount(0);
  await checkbox.check();
  await expect(alternate).toHaveCount(1);
  await expect(original).toHaveAttribute("data-km-geology-seed","71");
  await expect(alternate).toHaveAttribute("data-km-geology-seed","87");
  await expect(alternate.locator("[data-km-shanshui-scene]"))
    .toHaveAttribute("data-km-shanshui-frame","145");
  await expect(alternate.locator("image")).toHaveCount(0);
  // Both studies paint from the production renderer, not seeded screenshot assets.
  const first=await original.locator('[data-km-geology-crop="original"]')
    .screenshot({animations:"disabled"});
  const second=await alternate.locator('[data-km-geology-crop="seed-variation"]')
    .screenshot({animations:"disabled",path:info.outputPath("shanshui-geology-alternate-seed-87.png")});
  expect(first.equals(second)).toBe(false);
  // The second seed wraps safely at the documented 199 upper bound.
  const seedSlider=page.getByRole("slider",{name:"Geology seed"});
  await seedSlider.focus();
  await seedSlider.press("End");
  await expect(seedSlider).toHaveValue("199");
  await expect(alternate).toHaveAttribute("data-km-geology-seed","16");
  await expect(original).toHaveAttribute("data-km-geology-seed","199");
  await page.getByRole("button",{name:"Reset geology proof"}).click();
  await expect(checkbox).not.toBeChecked();
  await expect(alternate).toHaveCount(0);
  await expect(seedSlider).toHaveValue("71");
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


test("four-frame ink continuity Storybook uses distinct native frames and isolated school controls",async({page},info)=>{
  await page.goto("/iframe.html?id=video-ink-shanshui--ink-film-continuity&viewMode=story");
  const lab=page.getByTestId("shanshui-ink-continuity-studio");
  const cards=lab.locator("[data-km-ink-continuity-frame]");
  await expect(cards).toHaveCount(4);
  const frames=()=>cards.evaluateAll(nodes=>nodes.map(node=>
    Number(node.getAttribute("data-km-ink-continuity-frame"))));
  expect(await frames()).toEqual([48,102,156,210]);
  for(const [index,frame] of [48,102,156,210].entries())
    await expect(cards.nth(index).locator("[data-km-shanshui-frame]"))
      .toHaveAttribute("data-km-shanshui-frame",String(frame));
  await page.getByRole("combobox",{name:"Continuity ink school"})
    .selectOption("forest-grotto");
  await expect(lab.locator('[data-km-master-school="forest-grotto"]'))
    .toHaveCount(4);
  await page.getByRole("combobox",{name:"Continuity composition"})
    .selectOption("river-scholar");
  await expect(lab.locator('[data-km-shanshui-scene="river-scholar"]'))
    .toHaveCount(4);
  await page.getByRole("combobox",{name:"Continuity composition"})
    .selectOption("mountain-trail");
  const first=page.getByRole("slider",{name:"Continuity First frame"});
  const interval=page.getByRole("slider",{name:"Continuity Frame interval"});
  await expect(first).toHaveAttribute("max","137");
  await first.evaluate(node=>{
    const el=node as HTMLInputElement;
    const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")?.set;
    if(!setter)throw new Error("No native range value setter");
    setter.call(el,"137");
    el.dispatchEvent(new Event("input",{bubbles:true}));
    el.dispatchEvent(new Event("change",{bubbles:true}));
  });
  await expect(first).toHaveValue("137");
  await expect(interval).toHaveAttribute("max","54");
  await expect.poll(frames).toEqual([137,191,245,299]);
  await lab.screenshot({animations:"disabled",
    path:info.outputPath("ink-continuity-distinct-frames.png")});
  await lab.getByRole("button",{name:"Reset continuity study"}).click();
  await expect.poll(frames).toEqual([48,102,156,210]);
  await expect(page.getByRole("combobox",{name:"Continuity ink school"}))
    .toHaveValue("fuchun");
  // The fixed source-space render is not silently cropped on narrow
  // layouts: horizontal panning must remain available at 400px.
  await page.setViewportSize({width:400,height:900});
  const crop=cards.first().locator("div").first();
  await expect.poll(()=>crop.evaluate(node=>({
    overflowX:getComputedStyle(node).overflowX,
    scrollWidth:node.scrollWidth,clientWidth:node.clientWidth
  }))).toMatchObject({overflowX:"auto"});
  expect(await crop.evaluate(node=>node.scrollWidth>node.clientWidth)).toBe(true);
});

test("native full-film ink continuity inspector keeps one original scholar and source-sized video",async({page},info)=>{
  await page.goto("/iframe.html?id=video-ink-shanshui--ink-film-continuity&viewMode=story");
  const lab=page.getByTestId("shanshui-ink-continuity-studio");
  const cards=lab.locator("[data-km-ink-continuity-frame]");
  await expect(cards).toHaveCount(4);
  await expect(lab.locator("[data-km-ink-character-frame]")).toHaveCount(0);
  const native=lab.getByRole("button",{name:/Native 1× complete film/});
  await native.click();
  await expect(native).toHaveAttribute("aria-pressed","true");
  await expect(cards).toHaveCount(0);
  const viewport=lab.getByTestId("shanshui-ink-native-viewport");
  const film=viewport.locator("[data-km-shanshui-frame]");
  await expect(viewport).toBeVisible();
  await expect(film).toHaveCount(1);
  await expect(film).toHaveAttribute("data-km-shanshui-frame","156");
  const actor=viewport.locator("[data-km-ink-character-frame]");
  await expect(actor).toHaveCount(1);
  await expect(actor).toHaveAttribute("data-km-ink-character-frame","156");
  expect(await film.evaluate(node=>({
    width:node.getBoundingClientRect().width,
    height:node.getBoundingClientRect().height
  }))).toEqual({width:960,height:540});
  await lab.getByRole("combobox",{name:"Continuity inspect moment"})
    .selectOption("3");
  await expect(film).toHaveAttribute("data-km-shanshui-frame","210");
  await expect(actor).toHaveAttribute("data-km-ink-character-frame","210");
  await viewport.screenshot({animations:"disabled",
    path:info.outputPath("chinese-ink-native-scholar-film-frame210.png")});
  await page.setViewportSize({width:400,height:900});
  expect(await viewport.evaluate(node=>node.scrollWidth>node.clientWidth)).toBe(true);
  await lab.getByRole("button",{name:"Four-frame landscape contact sheet"}).click();
  await expect(cards).toHaveCount(4);
  await expect(lab.locator("[data-km-ink-character-frame]")).toHaveCount(0);
  await expect(native).toHaveAttribute("aria-pressed","false");
});


test("Fuchun Storybook toggles actual 40-ink-canopy paper channels without changing source geometry",async({page},info)=>{
  await page.goto("/iframe.html?id=video-ink-shanshui--four-masters-ink-studio&viewMode=story");
  const lab=page.getByTestId("shanshui-master-ink-study");
  const fuchun=lab.locator('[data-km-master-study="fuchun"]');
  await expect(fuchun).toBeVisible();
  const canopy=fuchun.locator("[data-km-cliff-pine-ink-canopy]");
  await expect(canopy).toHaveCount(40);
  await expect(canopy.first()).toHaveAttribute(
    "data-km-cliff-pine-canopy-paper-channels","2");
  const paths=await canopy.evaluateAll(nodes=>nodes.map(node=>node.getAttribute("d")));
  await page.getByRole("button",{name:"Pine before bristle paper lift"}).click();
  await expect(lab).toHaveAttribute("data-km-master-ink-inspection","pine-uncut");
  const uncutRules=await canopy.evaluateAll(nodes=>
    nodes.map(node=>getComputedStyle(node).fillRule));
  expect(uncutRules).toEqual(Array(40).fill("nonzero"));
  const uncut=await fuchun.screenshot({animations:"disabled",
    path:info.outputPath("fuchun-pine-bristles-before.png")});
  await page.getByRole("button",{name:"Pine crowns · source anatomy"}).click();
  await expect(lab).toHaveAttribute("data-km-master-ink-inspection","pine");
  const liftedRules=await canopy.evaluateAll(nodes=>
    nodes.map(node=>getComputedStyle(node).fillRule));
  expect(liftedRules).toEqual(Array(40).fill("evenodd"));
  const lifted=await fuchun.screenshot({animations:"disabled",
    path:info.outputPath("fuchun-pine-bristles-after.png")});
  expect(hash(uncut)).not.toBe(hash(lifted));
  expect(await canopy.evaluateAll(nodes=>nodes.map(node=>node.getAttribute("d"))))
    .toEqual(paths);
  await expect(fuchun.locator("[data-km-cliff-pine-needle]")).toHaveCount(310);
  await expect(fuchun.locator("[data-km-cliff-pine-pad]")).toHaveCount(60);
  await expect(fuchun.locator("[data-km-cliff-pine-wet-cluster]")).toHaveCount(119);
  await lab.getByRole("button",{name:"Reset all four studies"}).click();
  await expect(lab).toHaveAttribute("data-km-master-ink-inspection","all");
});



test("the Fuchun continuous pine underwash preserves all 80 physical paper gaps under both original fans",async({page},info)=>{
  await page.goto("/iframe.html?id=video-ink-shanshui--four-masters-ink-studio&viewMode=story");
  const lab=page.getByTestId("shanshui-master-ink-study");
  const fuchun=lab.locator('[data-km-master-study="fuchun"]');
  const guo=lab.locator('[data-km-master-study="early-spring"]');
  const masks=fuchun.locator("[data-km-cliff-pine-bridge-paper-mask]");
  const cuts=fuchun.locator("[data-km-cliff-pine-bridge-paper-cut]");
  const bridges=fuchun.locator("[data-km-cliff-pine-connected-canopy]");
  await expect(masks).toHaveCount(20);
  await expect(cuts).toHaveCount(40);
  await expect(bridges).toHaveCount(20);
  await expect(guo.locator("[data-km-cliff-pine-bridge-paper-mask]"))
    .toHaveCount(0);
  const geometry=await bridges.evaluateAll(nodes=>
    nodes.map(n=>n.getAttribute("d")));
  const originalMask=await bridges.evaluateAll(nodes=>
    nodes.map(n=>n.getAttribute("mask")));
  expect(new Set(originalMask).size).toBe(20);
  const uncut=page.getByRole("button",{name:"Pine bridge before paper reserve"});
  await uncut.click();
  await expect(lab).toHaveAttribute("data-km-master-ink-inspection",
    "pine-bridge-uncut");
  expect(await bridges.evaluateAll(nodes=>
    nodes.map(n=>getComputedStyle(n).maskImage)))
    .toEqual(Array(20).fill("none"));
  const before=await fuchun.screenshot({animations:"disabled",
    path:info.outputPath("fuchun-connected-canopy-before-paper-reserve.png")});
  await page.getByRole("button",{name:"Pine crowns · source anatomy"}).click();
  await expect(lab).toHaveAttribute("data-km-master-ink-inspection","pine");
  const applied=await bridges.evaluateAll(nodes=>
    nodes.map(n=>getComputedStyle(n).maskImage));
  expect(applied.every(v=>v!=="none"&&v.includes("kmpine"))).toBe(true);
  const after=await fuchun.screenshot({animations:"disabled",
    path:info.outputPath("fuchun-connected-canopy-after-paper-reserve.png")});
  // Both images come from the same original film scene. Source trees
  // never move, while the underlying wet brush genuinely unpaints.
  expect(hash(before)).not.toBe(hash(after));
  expect(await bridges.evaluateAll(nodes=>
    nodes.map(n=>n.getAttribute("d")))).toEqual(geometry);
  expect(await bridges.evaluateAll(nodes=>
    nodes.map(n=>n.getAttribute("mask")))).toEqual(originalMask);
  await lab.getByRole("button",{name:"Reset all four studies"}).click();
  await expect(lab).toHaveAttribute("data-km-master-ink-inspection","all");
});


test("original Fuchun stone rock strata become positive rounded parent-anchored brush relief",async({page},info)=>{
  await page.goto("/iframe.html?id=video-ink-shanshui--four-masters-ink-studio&viewMode=story");
  const lab=page.getByTestId("shanshui-master-ink-study");
  const fuchun=lab.locator('[data-km-master-study="fuchun"]');
  const guo=lab.locator('[data-km-master-study="early-spring"]');
  const volume=fuchun.locator("[data-km-master-fuchun-turning-bank]");
  const ribs=fuchun.locator("[data-km-master-stratum]");
  await expect(volume).toHaveCount(9);
  await expect(ribs).toHaveCount(15);
  const original=await volume.evaluateAll(nodes=>
    nodes.map(node=>node.querySelector("[data-km-master-fuchun-turning-wash]")?.getAttribute("d")));
  const beforeButton=lab.getByRole("button",{name:"Stone before rounded stratum relief"});
  await beforeButton.click();
  await expect(lab).toHaveAttribute("data-km-master-ink-inspection",
    "stone-before-turning");
  await expect(page.getByRole("slider",{name:"Master zoom"}))
    .toHaveValue("2.4");
  await expect(volume.first()).toBeHidden();
  await expect(guo.locator("[data-km-master-face]").first()).toBeVisible();
  const before=await fuchun.screenshot({animations:"disabled",
    path:info.outputPath("fuchun-original-stone-before-turning-banks.png")});
  await lab.getByRole("button",{name:"All Fuchun hemp"}).click();
  await expect(lab).toHaveAttribute("data-km-master-ink-inspection","all");
  await expect(volume.first()).toBeVisible();
  const after=await fuchun.screenshot({animations:"disabled",
    path:info.outputPath("fuchun-original-stone-after-turning-banks.png")});
  expect(hash(after)).not.toBe(hash(before));
  expect(await volume.evaluateAll(nodes=>
    nodes.map(node=>node.querySelector("[data-km-master-fuchun-turning-wash]")?.getAttribute("d"))))
    .toEqual(original);
  await expect(ribs).toHaveCount(15);
  await expect(guo.locator("[data-km-master-fuchun-turning-bank]")).toHaveCount(0);
});



test("native Fuchun original four rib paper masks reach both the supporting cheek and each ink reload",async({page},info)=>{
  await page.goto("/iframe.html?id=video-ink-shanshui--four-masters-ink-studio&viewMode=story");
  const lab=page.getByTestId("shanshui-master-ink-study");
  const fuchun=lab.locator('[data-km-master-study="fuchun"]');
  const cheeks=fuchun.locator("[data-km-rock-hero-rib-cheek-wash]");
  const deposits=fuchun.locator("[data-km-rock-hero-rib-deposit]");
  const cuts=fuchun.locator("[data-km-rock-hero-rib-paper-slit]");
  await expect(cheeks).toHaveCount(4);
  await expect(deposits).toHaveCount(12);
  await expect(cuts).toHaveCount(24);
  const geometry=await cheeks.evaluateAll(nodes=>nodes.map(n=>n.getAttribute("d")));
  const actualMasks=await cheeks.evaluateAll(nodes=>
    nodes.map(n=>n.getAttribute("mask")));
  expect(new Set(actualMasks).size).toBe(4);
  const without=lab.getByRole("button",{name:"Hero ribs before shared paper lift"});
  await without.click();
  await expect(lab).toHaveAttribute("data-km-master-ink-inspection","hero-uncut");
  await expect(without).toHaveAttribute("aria-pressed","true");
  expect(await cheeks.evaluateAll(nodes=>
    nodes.map(n=>getComputedStyle(n).maskImage)))
    .toEqual(Array(4).fill("none"));
  expect(await deposits.evaluateAll(nodes=>
    nodes.map(n=>getComputedStyle(n).maskImage)))
    .toEqual(Array(12).fill("none"));
  const before=await fuchun.screenshot({animations:"disabled",
    path:info.outputPath("fuchun-native-hero-underpaint-before-original-paper-lifts.png")});
  await lab.getByRole("button",{name:"All Fuchun hemp"}).click();
  await expect(lab).toHaveAttribute("data-km-master-ink-inspection","all");
  expect((await cheeks.evaluateAll(nodes=>
    nodes.map(n=>getComputedStyle(n).maskImage)))
    .every(x=>x!=="none"&&x.includes("kmrock"))).toBe(true);
  const after=await fuchun.screenshot({animations:"disabled",
    path:info.outputPath("fuchun-native-hero-underpaint-after-original-paper-lifts.png")});
  expect(hash(before)).not.toEqual(hash(after));
  expect(await cheeks.evaluateAll(nodes=>nodes.map(n=>n.getAttribute("d"))))
    .toEqual(geometry);
  expect(await cheeks.evaluateAll(nodes=>nodes.map(n=>n.getAttribute("mask"))))
    .toEqual(actualMasks);
  await expect(cuts).toHaveCount(24);
  await expect(fuchun.locator("[data-km-rock-hero-face]")).toHaveCount(4);
});

test("native Fuchun hero ink ribs are embedded in real short rounded stone cheeks, not long detached wires",async({page},info)=>{
  await page.goto("/iframe.html?id=video-ink-shanshui--four-masters-ink-studio&viewMode=story");
  const lab=page.getByTestId("shanshui-master-ink-study");
  const fuchun=lab.locator('[data-km-master-study="fuchun"]');
  const other=lab.locator('[data-km-master-study="early-spring"]');
  const cheeks=fuchun.locator("[data-km-rock-hero-rib-cheek-wash]");
  const ribs=fuchun.locator("[data-km-rock-hero-rib]");
  const cuts=fuchun.locator("[data-km-rock-hero-rib-paper-slit]");
  await expect(cheeks).toHaveCount(4);
  await expect(ribs).toHaveCount(4);
  await expect(cuts).toHaveCount(24);
  await expect(other.locator("[data-km-rock-hero-rib-cheek-wash]")).toHaveCount(0);
  const source=await cheeks.evaluateAll(nodes=>nodes.map(n=>n.getAttribute("d")));
  const beforeButton=lab.getByRole("button",{name:"Hero ribs before geological cheek wash"});
  await beforeButton.click();
  await expect(lab).toHaveAttribute("data-km-master-ink-inspection",
    "hero-before-cheek");
  await expect(cheeks.first()).toBeHidden();
  await expect(ribs.first()).toBeVisible();
  const before=await fuchun.screenshot({animations:"disabled",
    path:info.outputPath("fuchun-hero-ribs-before-positive-cheek.png")});
  await lab.getByRole("button",{name:"All Fuchun hemp"}).click();
  await expect(cheeks.first()).toBeVisible();
  const after=await fuchun.screenshot({animations:"disabled",
    path:info.outputPath("fuchun-hero-ribs-with-positive-cheek.png")});
  expect(hash(before)).not.toBe(hash(after));
  expect(await cheeks.evaluateAll(nodes=>nodes.map(n=>n.getAttribute("d"))))
    .toEqual(source);
  await expect(cuts).toHaveCount(24);
  await expect(other.locator("[data-km-rock-hero-rib-cheek-wash]")).toHaveCount(0);
});

test("native Fuchun crown branches join 40 fan islands in the original painting",async({page},info)=>{
  await page.goto("/iframe.html?id=video-ink-shanshui--four-masters-ink-studio&viewMode=story");
  const lab=page.getByTestId("shanshui-master-ink-study");
  const fuchun=lab.locator('[data-km-master-study="fuchun"]');
  const bridges=fuchun.locator("[data-km-cliff-pine-connected-canopy]");
  await expect(bridges).toHaveCount(20);
  const paths=await bridges.evaluateAll(nodes=>nodes.map(n=>n.getAttribute("d")));
  await page.getByRole("button",{name:"Pine before continuous crown bridge"}).click();
  await expect(lab).toHaveAttribute("data-km-master-ink-inspection","pine-unlinked");
  expect(await bridges.evaluateAll(nodes=>nodes.map(n=>getComputedStyle(n).visibility)))
    .toEqual(Array(20).fill("hidden"));
  const before=await fuchun.screenshot({animations:"disabled",
    path:info.outputPath("fuchun-unlinked-40-pine-fans.png")});
  await page.getByRole("button",{name:"Pine crowns · source anatomy"}).click();
  await expect(lab).toHaveAttribute("data-km-master-ink-inspection","pine");
  expect(await bridges.evaluateAll(nodes=>nodes.map(n=>getComputedStyle(n).visibility)))
    .toEqual(Array(20).fill("visible"));
  const after=await fuchun.screenshot({animations:"disabled",
    path:info.outputPath("fuchun-connected-20-pine-canopies.png")});
  expect(hash(after)).not.toBe(hash(before));
  expect(await bridges.evaluateAll(nodes=>nodes.map(n=>n.getAttribute("d"))))
    .toEqual(paths);
  await expect(fuchun.locator("[data-km-cliff-pine-ink-island]")).toHaveCount(40);
  await expect(fuchun.locator("[data-km-cliff-pine-needle]")).toHaveCount(310);
  await expect(fuchun.locator("[data-km-cliff-pine-wet-cluster]")).toHaveCount(119);
  await lab.getByRole("button",{name:"Pine armature · connected brush bones"}).click();
  await expect(lab).toHaveAttribute("data-km-master-ink-inspection","pine-bones");
  expect(await bridges.evaluateAll(nodes=>nodes.map(n=>getComputedStyle(n).visibility)))
    .toEqual(Array(20).fill("hidden"));
  await lab.getByRole("button",{name:"Reset all four studies"}).click();
  await expect(lab).toHaveAttribute("data-km-master-ink-inspection","all");
});


test("Fuchun two-load pine crown QA isolates original contours without deleting live needle anatomy",async({page},info)=>{
  await page.goto("/iframe.html?id=video-ink-shanshui--four-masters-ink-studio&viewMode=story");
  const lab=page.getByTestId("shanshui-master-ink-study");
  const school=lab.locator('[data-km-master-study="fuchun"]');
  const crowns=school.locator("[data-km-cliff-pine-ink-canopy]");
  const joins=school.locator("[data-km-cliff-pine-connected-canopy]");
  const needles=school.locator("[data-km-cliff-pine-needle]");
  await expect(crowns).toHaveCount(40);
  await expect(joins).toHaveCount(20);
  await expect(needles).toHaveCount(310);
  const original=await crowns.evaluateAll(nodes=>nodes.map(n=>n.getAttribute("d")));
  const mode=lab.getByRole("button",{name:"Pine dual-load crown silhouettes"});
  await mode.click();
  await expect(mode).toHaveAttribute("aria-pressed","true");
  await expect(lab).toHaveAttribute("data-km-master-ink-inspection","pine-contours");
  await expect(school.locator("[data-km-cliff-pine-ink-island]")).toHaveCount(40);
  expect(await joins.evaluateAll(nodes=>nodes.map(n=>getComputedStyle(n).visibility)))
    .toEqual(Array(20).fill("visible"));
  expect(await needles.evaluateAll(nodes=>nodes.map(n=>getComputedStyle(n).visibility)))
    .toEqual(Array(310).fill("hidden"));
  await school.screenshot({animations:"disabled",
    path:info.outputPath("fuchun-dual-load-crown-silhouettes.png")});
  await lab.getByRole("button",{name:"Pine crowns · source anatomy"}).click();
  await expect(lab).toHaveAttribute("data-km-master-ink-inspection","pine");
  expect(await needles.evaluateAll(nodes=>nodes.map(n=>getComputedStyle(n).visibility)))
    .toEqual(Array(310).fill("visible"));
  expect(await crowns.evaluateAll(nodes=>nodes.map(n=>n.getAttribute("d"))))
    .toEqual(original);
  await lab.getByRole("button",{name:"Reset all four studies"}).click();
  await expect(lab).toHaveAttribute("data-km-master-ink-inspection","all");
});
