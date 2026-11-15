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
