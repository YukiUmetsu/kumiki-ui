import { test,expect } from "@playwright/test";

test("the single Colour-pencil foundation story uses the same pipeline for all subjects",async({page},info)=>{
  await page.goto("/iframe.html?id=video-colored-pencil-science--drawing-foundation&viewMode=story");
  const scene=page.locator("[data-km-foundation-studio]");
  const svg=page.locator("svg[data-km-colored-pencil]");
  const subject=page.getByRole("combobox",{name:"Foundation subject"});
  const aspect=page.getByRole("combobox",{name:"Foundation aspect"});
  await expect(scene).toBeVisible();
  await expect(svg).toHaveAttribute("data-km-pencil-foundation","CP-F1");
  await expect(svg).toHaveAttribute(
    "data-km-pencil-render-method","authored-vector-pigment");
  await expect(svg).toHaveAttribute("data-km-pencil-photo-pixels","none");
  await expect(scene).toHaveAttribute("data-km-foundation-stage","review");
  await expect(svg.locator("[data-km-pencil-craft-base]").first()).toBeVisible();
  for(const format of ["landscape","portrait"] as const){
    await aspect.selectOption(format);
    await expect(svg).toHaveAttribute("viewBox",format==="landscape"?"0 0 960 540":"0 0 540 960");
    for(const item of ["rose","fox","portrait","architecture","fabric","valley"] as const){
      await subject.selectOption(item);
      await expect(svg).toHaveAttribute("data-km-pencil-foundation","CP-F1");
      await expect(svg.locator("[data-km-pencil-region]").first()).toBeVisible();
      // A CP-F1 vector drawing is not photograph stylization: no SVG
      // bitmap/foreignObject reference, no uploaded source/canvas image,
      // and full details remain named editable pencil strokes.
      const provenance=await svg.evaluate(node=>({
        photoElements:node.querySelectorAll(
          "image,foreignObject,feImage").length,
        pencilMarks:node.querySelectorAll(
          "[data-km-pigment-layer] path").length,
        tracedGeometry:node.querySelectorAll(
          "[data-km-graphite] path").length,
      }));
      expect(provenance.photoElements).toBe(0);
      expect(provenance.pencilMarks).toBeGreaterThan(100);
      expect(provenance.tracedGeometry).toBeGreaterThan(10);
      if(item==="fox"){
        for(const region of ["periocular-form","mask","eye-far","eye-near"])
          await expect(svg.locator(
            '[data-km-pencil-region="'+region+'"]')).toHaveCount(1);
        const attachment=await svg.evaluate(root=>{
          const path=(id:string)=>{
            const r=root.querySelector(
              '[data-km-pencil-region="'+id+'"]');
            const d=r?.querySelector('[data-km-pencil-support]')
              ?.getAttribute("d");
            if(!d)throw new Error("Missing fox structural path: "+id);
            return new Path2D(d);
          };
          const ctx=document.createElement("canvas")
            .getContext("2d")!;
          const cranium=path("head-main");
          const far=path("ear-far"),near=path("ear-near");
          // On the intentionally profile-biased drawing the far canthus
          // must be hidden INSIDE the cranium, not float over paper after
          // shrinking the skull. Extract its actual SVG region clip path.
          const regionNodes=Array.from(
            root.querySelectorAll("[data-km-pencil-region]"));
          const farIndex=regionNodes.findIndex(r=>
            r.getAttribute("data-km-pencil-region")==="eye-far");
          const farClip=Array.from(root.querySelectorAll("clipPath"))[farIndex]
            ?.querySelector("path")?.getAttribute("d");
          if(!farClip)throw new Error("Missing far canthus geometry");
          const hiddenCanthus=new Path2D(farClip);
          let farEyeArea=0,eyeInsideCranium=0;
          for(let y=180;y<204;y++)for(let x=185;x<220;x++){
            if(!ctx.isPointInPath(hiddenCanthus,x,y))continue;
            farEyeArea++;
            if(ctx.isPointInPath(cranium,x,y))eyeInsideCranium++;
          }
          let farOverlap=0,nearOverlap=0;
          // Independent actual 2D topology: ears must physically overlap
          // skull, not merely display visually adjacent beige triangles.
          for(let y=110;y<=210;y+=2)for(let x=135;x<=320;x+=2){
            if(!ctx.isPointInPath(cranium,x,y))continue;
            if(ctx.isPointInPath(far,x,y))farOverlap++;
            if(ctx.isPointInPath(near,x,y))nearOverlap++;
          }
          return {farOverlap,nearOverlap,farEyeArea,eyeInsideCranium};
        });
        expect(attachment.farOverlap).toBeGreaterThan(12);
        expect(attachment.nearOverlap).toBeGreaterThan(12);
        expect(attachment.farEyeArea).toBeGreaterThan(12);
        expect(attachment.eyeInsideCranium/attachment.farEyeArea)
          .toBeGreaterThan(.75);
      }
      if(["rose","fox","portrait"].includes(item)){
        await svg.screenshot({animations:"disabled",
          path:info.outputPath("pencil-foundation-"+item+"-"+format+".png")});
      }
    }
  }
  // ArtCraft negative control: flattening artwork to an opaque vector tonal
  // gradient must not be mistaken for the individual dry-pencil marks. Render
  // both states from the SAME authored geometry; restore exact visual output.
  await aspect.selectOption("landscape");
  await subject.selectOption("fox");
  await expect(svg).toHaveAttribute("data-km-pencil-tonal-support","on");
  const baseline=await svg.screenshot({animations:"disabled"});
  const pigmentOnly=page.getByRole("checkbox",{name:"Foundation pigment-only audit"});
  await pigmentOnly.check();
  await expect(svg).toHaveAttribute("data-km-pencil-tonal-support","off");
  await expect(svg.locator("[data-km-pencil-craft-base]")).toHaveCount(0);
  await expect(svg.locator("linearGradient")).toHaveCount(0);
  expect(await svg.locator("[data-km-pigment-layer] path").count()).toBeGreaterThan(100);
  expect(await svg.locator("[data-km-pencil-micro] path").count()).toBeGreaterThan(0);
  await svg.screenshot({animations:"disabled",
    path:info.outputPath("pencil-foundation-fox-pigment-only.png")});
  await pigmentOnly.uncheck();
  await expect(svg.locator("[data-km-pencil-craft-base]").first()).toBeVisible();
  expect(await svg.screenshot({animations:"disabled"})).toEqual(baseline);
  // The same negative control must be usable for human portraits.
  await subject.selectOption("portrait");
  await pigmentOnly.check();
  await expect(svg).toHaveAttribute("data-km-pencil-tonal-support","off");
  await svg.screenshot({animations:"disabled",
    path:info.outputPath("pencil-foundation-portrait-pigment-only.png")});
  await pigmentOnly.uncheck();

  // Precise stage checkpoints must correspond to actual addressable drawing frames.
  await aspect.selectOption("landscape");
  await subject.selectOption("rose");
  for(const [name,frame,stage] of [
    ["1. Reference & structure",0,"observe"],
    ["2. Contour and silhouette",52,"outline"],
    ["3. Light value map",106,"undertone"],
    ["4. Cross-layer colour",168,"layer"],
    ["5. Rooted texture & edges",254,"detail"],
    ["6. Burnish and visual audit",335,"review"],
  ] as const){
    await page.getByRole("button",{name:new RegExp(name.replace(".","\\.") )}).click();
    await expect(svg).toHaveAttribute("data-km-pencil-frame",String(frame));
    await expect(scene).toHaveAttribute("data-km-foundation-stage",stage);
  }
  await page.getByRole("checkbox",{name:"Foundation inspect macro"}).check();
  await expect(svg).toHaveAttribute("style",/scale\(2.15\)/);
  await page.getByRole("checkbox",{name:"Foundation inspect macro"}).uncheck();
  const burnish=page.getByRole("slider",{name:"Foundation burnish"});
  await burnish.focus();await burnish.press("ArrowLeft");
  const tooth=page.getByRole("slider",{name:"Foundation paper tooth"});
  await tooth.focus();await tooth.press("ArrowLeft");
  await expect(svg).toHaveAttribute("data-km-pencil-foundation","CP-F1");
});


test("ArtCraft fox tail, eye, chest, carpus, folded hock and human neck inspect actual drawing in both aspects",async({page},info)=>{
  await page.goto("/iframe.html?id=video-colored-pencil-science--drawing-foundation&viewMode=story");
  const scene=page.locator("[data-km-foundation-studio]");
  const svg=page.locator("svg[data-km-colored-pencil]");
  const subject=page.getByRole("combobox",{name:"Foundation subject"});
  const aspect=page.getByRole("combobox",{name:"Foundation aspect"});
  const target=page.getByRole("combobox",{name:"Foundation inspection focus"});
  const macro=page.getByRole("checkbox",{name:"Foundation inspect macro"});

  await expect(scene).toHaveAttribute("data-km-foundation-inspection-focus","default");
  for(const format of ["landscape","portrait"] as const){
    await aspect.selectOption(format);
    for(const [specimen,focus,part] of [
      ["fox","fox-tail","tail-back"],
      ["fox","fox-eye","eye-near"],
      ["fox","fox-chest","chest"],
      ["fox","fox-forepaw","foreleg-right"],
      ["fox","fox-hock","rear-leg"],
      ["portrait","portrait-nape","neck"],
    ] as const){
      await subject.selectOption(specimen);
      const before=await svg.screenshot({animations:"disabled"});
      await target.selectOption(focus);
      await macro.check();
      await expect(scene).toHaveAttribute("data-km-foundation-inspection-focus",part);
      await expect(svg).toHaveAttribute("style",/scale\(2\.15\)/);
      const origin=await svg.evaluate(node=>(node as SVGSVGElement).style.transformOrigin);
      const coordinates=(origin.match(/([\d.]+)% ([\d.]+)%/)??[]);
      expect(coordinates.length).toBe(3);
      expect(Number(coordinates[1])).toBeGreaterThan(0);
      expect(Number(coordinates[1])).toBeLessThan(100);
      expect(Number(coordinates[2])).toBeGreaterThan(0);
      expect(Number(coordinates[2])).toBeLessThan(100);
      // A real browser screenshot of the original CP-F1 artwork, NOT
      // a photograph edit or duplicated/flattened alternate hero.
      await svg.screenshot({animations:"disabled",
        path:info.outputPath("pencil-"+specimen+"-"+format+"-"+part+"-macro.png")});
      if(focus==="fox-eye"){
        const topology=await svg.evaluate(root=>{
          const ctx=document.createElement("canvas").getContext("2d")!;
          const path=(id:string)=>{
            const region=root.querySelector(
              '[data-km-pencil-region="'+id+'"]');
            const d=region?.querySelector("[data-km-pencil-support]")?.getAttribute("d");
            if(!d)throw new Error("Missing actual animal anatomy path "+id);
            return new Path2D(d);
          };
          const head=path("head-main"),muzzle=path("muzzle");
          const eyeRegion=root.querySelector(
            '[data-km-pencil-region="eye-near"]')!;
          const eyePaths=[...eyeRegion.querySelectorAll(
            "[data-km-pencil-trace]")].map(p=>p.getAttribute("data-km-pencil-trace"));
          const pupil=eyeRegion.querySelector(
            '[data-km-pencil-trace="fox-vertical-pupil"]');
          // The pupil and superior tarsus must be real authored paths;
          // the focal cornea is embedded in the fox cranial silhouette.
          return {
            cranialEyeContact:ctx.isPointInPath(head,244,189),
            nasalConnection:ctx.isPointInPath(muzzle,183,224),
            tarsus:eyePaths.includes("fox-superior-tarsus"),
            pupil:!!pupil&&pupil.getAttribute("d")?.includes("Q"),
            material:eyeRegion.getAttribute("data-km-pencil-region"),
          };
        });
        expect(topology.cranialEyeContact).toBe(true);
        expect(topology.nasalConnection).toBe(true);
        expect(topology.tarsus).toBe(true);
        expect(topology.pupil).toBe(true);
        expect(topology.material).toBe("eye-near");
      }
      if(focus==="fox-hock"||focus==="fox-forepaw"){
        const pose=await svg.evaluate((root,partId)=>{
          const region=root.querySelector('[data-km-pencil-region="'+partId+'"]')!;
          const base=region.querySelector("[data-km-pencil-support]")!;
          const trace=(name:string)=>Boolean(region.querySelector(
            '[data-km-pencil-trace="'+name+'"]'));
          const ctx=document.createElement("canvas").getContext("2d")!;
          const partPath=new Path2D(base.getAttribute("d")!);
          const hock=partId==="rear-leg";
          const body=root.querySelector(
            '[data-km-pencil-region="body"] [data-km-pencil-support]')!;
          return {
            hasBentHock:hock?trace("hind-hock-plane"):trace("near-antebrachial-plane"),
            digitDetail:hock?trace("hind-digit-folds"):trace("toe-furrows"),
            clawDetail:hock?trace("hind-tiny-claws"):trace("claw-tips"),
            insideFoot:ctx.isPointInPath(partPath,hock?355:281,hock?400:400),
            // The hind hock passes beneath the rendered rump: two real,
            // independently editable pigment regions overlap in world space.
            joinedBody:hock?ctx.isPointInPath(
              new Path2D(body.getAttribute("d")!),330,347)&&
              ctx.isPointInPath(partPath,330,347):true,
          };
        },part);
        expect(pose.hasBentHock).toBe(true);
        expect(pose.digitDetail).toBe(true);
        expect(pose.clawDetail).toBe(true);
        expect(pose.insideFoot).toBe(true);
        expect(pose.joinedBody).toBe(true);
      }
      expect(await svg.locator("image,foreignObject,feImage").count()).toBe(0);
      await target.selectOption("default");
      await expect(scene).toHaveAttribute("data-km-foundation-inspection-focus","default");
      await macro.uncheck();
      expect(await svg.screenshot({animations:"disabled"})).toEqual(before);
    }
  }
});
