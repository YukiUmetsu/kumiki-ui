import {test,expect} from "@playwright/test";

/**
 * Actual hosted public-domain/CC0 photographs, not just a synthetic gradient.
 * This is intentionally *not* in the cheap changed-contracts CI gate: browser,
 * origin/CORS and human artwork scrutiny are separate. The dedicated workflow
 * runs only when the source-conditioned pencil implementation changes.
 */
for(const sample of ["fox","kingfisher"] as const){
  test("ArtCraft real "+sample+" code-render and licensed source comparison",
    async({page},info)=>{
      await page.goto("/iframe.html?id=video-colored-pencil-science--reference-guided-pencil&viewMode=story");
      const target=page.getByRole("combobox",{name:"Pencil photo source"});
      await target.selectOption(sample);
      const canvas=page.locator('canvas[data-km-pencil-photo]');
      await expect(canvas).toHaveAttribute("data-km-pencil-photo","ready",{timeout:60000});
      await expect(page.getByRole("alert")).toHaveCount(0);
      const sourceBox=page.getByRole("checkbox",{name:"Show pencil source comparison"});
      await sourceBox.check();
      await expect(page.locator("canvas[data-km-pencil-reference]")).toHaveCount(1);
      for(const aspect of ["landscape","portrait"] as const){
        await page.getByRole("combobox",{name:"Pencil photo aspect"}).selectOption(aspect);
        await expect(canvas).toHaveAttribute("data-km-pencil-photo","ready",{timeout:60000});
        if(aspect==="portrait"){
          await expect(page.getByRole("combobox",{name:"Pencil portrait framing"}))
            .toHaveValue("focus");
          const source=page.locator("canvas[data-km-pencil-reference]");
          const margins=await source.evaluate(node=>{
            const c=node as HTMLCanvasElement,ctx=c.getContext("2d")!;
            const top=ctx.getImageData(Math.floor(c.width*.5),Math.floor(c.height*.06),1,1).data;
            const bottom=ctx.getImageData(Math.floor(c.width*.5),Math.floor(c.height*.94),1,1).data;
            return [[...top].slice(0,3),[...bottom].slice(0,3)];
          });
          // No cream letterbox bars after switching to a close-up portrait.
          for(const rgb of margins)expect(rgb).not.toEqual([250,245,237]);
        }
        const metrics=await canvas.evaluate(output=>{
          const c=output as HTMLCanvasElement;
          const ctx=c.getContext("2d")!;
          const d=ctx.getImageData(0,0,c.width,c.height).data;
          const luminances:number[]=[];
          let min=255,max=0,nonPaper=0;
          for(let i=0;i<d.length;i+=16){
            const y=.2126*d[i]+.7152*d[i+1]+.0722*d[i+2];
            luminances.push(y);min=Math.min(min,y);max=Math.max(max,y);
            if(y<220)nonPaper++;
          }
          const mean=luminances.reduce((a,b)=>a+b,0)/luminances.length;
          const variance=luminances.reduce((a,b)=>a+(b-mean)**2,0)/luminances.length;
          return {min,max,mean,variance,nonPaper,total:luminances.length};
        });
        console.log("[ArtCraft photo]",sample,aspect,metrics);
        expect(metrics.nonPaper/metrics.total).toBeGreaterThan(.025);
        expect(metrics.variance).toBeGreaterThan(150);
        expect(metrics.max-metrics.min).toBeGreaterThan(65);
        await page.getByText("Coloured-pencil rendition · code-generated mark layers").screenshot({
          path:info.outputPath("pencil-"+sample+"-"+aspect+"-label.png"),
        });
        await canvas.screenshot({animations:"disabled",
          path:info.outputPath("pencil-"+sample+"-"+aspect+"-actual.png")});
        await page.locator("canvas[data-km-pencil-reference]").screenshot({
          path:info.outputPath("pencil-"+sample+"-"+aspect+"-source.png")});
        // Macro crop, not an illustration substitution. Original canvas pixels.
        const box=await canvas.boundingBox();
        if(box){
          const cx=sample==="fox"?.32:.61,cy=sample==="fox"?.43:.34;
          const left=Math.max(0,cx*box.width-110);
          const top=Math.max(0,cy*box.height-95);
          await page.screenshot({animations:"disabled",
            clip:{x:box.x+left,y:box.y+top,
              width:Math.min(220,box.width-left),
              height:Math.min(190,box.height-top)},
            path:info.outputPath("pencil-"+sample+"-"+aspect+"-macro.png")});
        }
      }
    });
}


/** Real CC0 portrait pixels: facial landmarks must survive close framing and redraw. */
for(const sample of ["woman","man"] as const){
  test("ArtCraft realistic "+sample+" face is source-conditioned in both frames",async({page},info)=>{
    await page.goto("/iframe.html?id=video-colored-pencil-science--reference-guided-faces&viewMode=story");
    await page.getByRole("combobox",{name:"Pencil photo source"}).selectOption(sample);
    const output=page.locator("canvas[data-km-pencil-photo]");
    await expect(output).toHaveAttribute("data-km-pencil-photo","ready",{timeout:60000});
    await expect(page.getByRole("alert")).toHaveCount(0);
    const framing=page.getByRole("combobox",{name:"Pencil portrait framing"});
    await expect(framing).toHaveValue("focus");
    await page.getByRole("checkbox",{name:"Show pencil source comparison"}).check();
    for(const aspect of ["landscape","portrait"] as const){
      await page.getByRole("combobox",{name:"Pencil photo aspect"}).selectOption(aspect);
      await expect(output).toHaveAttribute("data-km-pencil-photo","ready",{timeout:60000});
      const source=page.locator("canvas[data-km-pencil-reference]");
      await expect(source).toHaveCount(1);
      // The face is a genuine cropped photographic source, not a generated
      // vector face with oversized eye/nose primitives.
      const metrics=await output.evaluate(node=>{
        const canvas=node as HTMLCanvasElement;
        const {data}=canvas.getContext("2d")!.getImageData(0,0,canvas.width,canvas.height);
        let variance=0,mean=0,n=0;
        for(let i=0;i<data.length;i+=32){const v=(data[i]+data[i+1]+data[i+2])/3;
          mean+=v;variance+=v*v;n++;}
        mean/=n;return {variance:variance/n-mean*mean,width:canvas.width,height:canvas.height};
      });
      expect(metrics.variance).toBeGreaterThan(100);
      await output.screenshot({animations:"disabled",
        path:info.outputPath("artcraft-portrait-"+sample+"-"+aspect+"-pencil.png")});
      await source.screenshot({animations:"disabled",
        path:info.outputPath("artcraft-portrait-"+sample+"-"+aspect+"-source.png")});
      if(sample==="woman"){
        // Full-head paper-only art: actual CC0 material and measured hairline,
        // not a screenshot made from fabricated synthetic portrait geometry.
        // The independent studio output MUST be bit-identical after viewing.
        const originalExport=await output.evaluate(node=>
          (node as HTMLCanvasElement).toDataURL("image/png"));
        const fullHeadToggle=page.getByRole("checkbox",{
          name:"Inspect full pencil head anatomy",
        });
        await fullHeadToggle.check();
        const full=page.locator("canvas[data-km-pencil-full-head-dry]");
        const headSource=page.locator(
          "canvas[data-km-pencil-full-head-reference]");
        await expect(full).toHaveAttribute("data-km-pencil-raster-underpaint","none");
        await expect(full).toHaveAttribute("data-km-pencil-full-head-rendered",
          "true",{timeout:90000});
        await expect(headSource).toHaveAttribute(
          "data-km-pencil-full-head-source","ready",{timeout:90000});
        // Actual Chromium 0% legacy vs 100% anatomy-connected fibre A/B:
        // capture BOTH complete pencil plates for honest 1×/3× review.
        const fibreSlider=page.getByLabel("Pencil anatomy-connected fibre flow");
        await expect(fibreSlider).toHaveValue("1");
        const fibreMetrics=page.locator("[data-km-pencil-head-proof-metrics]");
        await fibreSlider.focus();
        await fibreSlider.press("Home");
        await expect(fibreSlider).toHaveValue("0");
        await expect(fibreMetrics).toContainText("0% anatomy-connected");
        await full.screenshot({animations:"disabled",
          path:info.outputPath("artcraft-cc0-"+aspect+"-legacy-ruled-fibre.png")});
        await fibreSlider.press("End");
        await expect(fibreSlider).toHaveValue("1");
        await expect(fibreMetrics).toContainText("100% anatomy-connected");
        await full.screenshot({animations:"disabled",
          path:info.outputPath("artcraft-cc0-"+aspect+"-anatomy-fibre.png")});
        expect(await output.evaluate(node=>
          (node as HTMLCanvasElement).toDataURL("image/png")))
          .toBe(originalExport);
        // Physical pencil tooth must remain a paper-native operation.
        // Compare exactly the same licensed CC0 source, original mark
        // geometry, and four-shot paper construction at 0 and 100%.
        const nib=page.getByLabel("Pencil dry paper tooth contact");
        if(aspect==="landscape")await expect(nib).toHaveValue("0.75");
        await nib.focus();
        await nib.press("Home");
        await expect(nib).toHaveValue("0");
        await expect(full).toHaveAttribute("data-km-pencil-dry-contact","0");
        await full.screenshot({animations:"disabled",
          path:info.outputPath("artcraft-cc0-"+aspect+"-smooth-vector-tooth-0.png")});
        await nib.press("End");
        await expect(nib).toHaveValue("1");
        await expect(full).toHaveAttribute("data-km-pencil-dry-contact","1");
        await full.screenshot({animations:"disabled",
          path:info.outputPath("artcraft-cc0-"+aspect+"-broken-contact-tooth-100.png")});
        // Changing only the research material cannot alter normal movie
        // output from the original photo-to-pencil rendering pipeline.
        expect(await output.evaluate(node=>
          (node as HTMLCanvasElement).toDataURL("image/png")))
          .toBe(originalExport);
        // ArtCraft v12: source-observed *dark* lid ridges, distinct
        // from generic almond-eye contours. The 0% comparison must be
        // byte-identical to old code-rendered anatomy; 100% must be
        // visibly distinct for this actually photographed woman.
        const lid=page.getByLabel("Pencil photo-measured eyelid anatomy");
        await lid.focus();
        await lid.press("Home");
        await expect(lid).toHaveValue("0");
        await expect(full).toHaveAttribute("data-km-pencil-eyelid-depth","0");
        await expect(full).toHaveAttribute("data-km-pencil-eyelid-nibs","0");
        const noLid=await full.evaluate(node=>
          (node as HTMLCanvasElement).toDataURL("image/png"));
        await full.screenshot({animations:"disabled",
          path:info.outputPath("artcraft-cc0-"+aspect+"-optical-lids-legacy.png")});
        await lid.press("End");
        await expect(lid).toHaveValue("1");
        await expect(full).toHaveAttribute("data-km-pencil-eyelid-depth","1");
        const nibs=Number(await full.getAttribute("data-km-pencil-eyelid-nibs"));
        const evidence=Number(await full.getAttribute(
          "data-km-pencil-eyelid-source-pixels"));
        expect(nibs).toBeGreaterThan(8);
        expect(evidence).toBeGreaterThan(8);
        expect(await full.evaluate(node=>
          (node as HTMLCanvasElement).toDataURL("image/png")))
          .not.toBe(noLid);
        await full.screenshot({animations:"disabled",
          path:info.outputPath("artcraft-cc0-"+aspect+"-optical-lids-source-100.png")});
        expect(await output.evaluate(node=>
          (node as HTMLCanvasElement).toDataURL("image/png")))
          .toBe(originalExport);
        // ArtCraft v13: only this CC0 sitter's visible near/far iris
        // pigment may be reconstructed. The 0% render must exactly
        // reproduce the old photographed eyelid and skin construction;
        // 100% is a separate radial/nib pupil material, not source pixels.
        const iris=page.getByLabel("Pencil photo-registered iris and pupil");
        await iris.focus();
        await iris.press("Home");
        await expect(iris).toHaveValue("0");
        await expect(full).toHaveAttribute("data-km-pencil-iris-depth","0");
        await expect(full).toHaveAttribute("data-km-pencil-iris-near","0");
        const originalEyes=await full.evaluate(node=>
          (node as HTMLCanvasElement).toDataURL("image/png"));
        await full.screenshot({animations:"disabled",
          path:info.outputPath("artcraft-cc0-"+aspect+"-iris-pupil-legacy.png")});
        await iris.press("End");
        await expect(iris).toHaveValue("1");
        await expect(full).toHaveAttribute("data-km-pencil-iris-depth","1");
        const irisNear=Number(await full.getAttribute("data-km-pencil-iris-near"));
        const irisFar=Number(await full.getAttribute("data-km-pencil-iris-far"));
        const glintReserves=Number(await full.getAttribute(
          "data-km-pencil-iris-reserves"));
        expect(irisNear).toBeGreaterThan(40);
        expect(irisFar).toBeGreaterThanOrEqual(0);
        // A photographed iris may genuinely have NO resolved catchlight
        // at this crop/lighting. Do not invent a specular dot to satisfy a
        // screenshot test; the separate synthetic fixture proves an actual
        // white corneal glint is always protected when it exists.
        expect(Number.isInteger(glintReserves)).toBe(true);
        expect(glintReserves).toBeGreaterThanOrEqual(0);
        expect(await full.evaluate(node=>
          (node as HTMLCanvasElement).toDataURL("image/png")))
          .not.toBe(originalEyes);
        await full.screenshot({animations:"disabled",
          path:info.outputPath("artcraft-cc0-"+aspect+"-source-iris-pupil-100.png")});
        expect(await output.evaluate(node=>
          (node as HTMLCanvasElement).toDataURL("image/png")))
          .toBe(originalExport);
        // True photograph-conditioned skin scumbling: original vs
        // curved, layered pigment on the SAME real CC0 pixels. Neither
        // black iris, eye aperture nor the exported video may change.
        const weave=page.getByLabel("Pencil overlapping skin optical weave");
        await weave.focus();
        await weave.press("Home");
        await expect(weave).toHaveValue("0");
        await expect(full).toHaveAttribute("data-km-pencil-skin-weave","0");
        await expect(full).toHaveAttribute("data-km-pencil-skin-weave-nibs","0");
        const withoutWeave=await full.evaluate(node=>
          (node as HTMLCanvasElement).toDataURL("image/png"));
        await full.screenshot({animations:"disabled",
          path:info.outputPath("artcraft-cc0-"+aspect+"-skin-weave-legacy-0.png")});
        await weave.press("End");
        await expect(weave).toHaveValue("1");
        await expect(full).toHaveAttribute("data-km-pencil-skin-weave","1");
        const opticalNibCount=Number(
          await full.getAttribute("data-km-pencil-skin-weave-nibs"));
        const protectedSkinHighlights=Number(
          await full.getAttribute("data-km-pencil-skin-weave-highlight-reserves"));
        expect(opticalNibCount).toBeGreaterThan(300);
        expect(protectedSkinHighlights).toBeGreaterThan(0);
        expect(await full.evaluate(node=>
          (node as HTMLCanvasElement).toDataURL("image/png")))
          .not.toBe(withoutWeave);
        await full.screenshot({animations:"disabled",
          path:info.outputPath("artcraft-cc0-"+aspect+"-skin-weave-optical-100.png")});
        expect(await output.evaluate(node=>
          (node as HTMLCanvasElement).toDataURL("image/png")))
          .toBe(originalExport);
        // Actual licensed source, ALL four chronologically composited
        // Storybook shots. Stage 1..4 must contain increasing genuine
        // pencil marks; the exported film bitmap must not be affected.
        const boardToggle=page.getByRole("checkbox",{
          name:"Inspect four-shot portrait storyboard",
        });
        await boardToggle.check();
        const board=page.locator('[data-km-pencil-portrait-storyboard]');
        const shots=board.locator("canvas[data-km-pencil-portrait-stage]");
        await expect(shots).toHaveCount(4);
        const labels=["value","pigment","form","detail"];
        const totals:number[]=[];
        for(let i=0;i<labels.length;i++){
          await expect(shots.nth(i)).toHaveAttribute(
            "data-km-pencil-storyboard-rendered",labels[i],
            {timeout:90000});
          await expect(shots.nth(i)).toHaveAttribute(
            "data-km-pencil-raster-underpaint","none");
          totals.push(Number(await shots.nth(i)
            .getAttribute("data-km-pencil-storyboard-strokes")));
        }
        expect(totals.every(n=>Number.isInteger(n)&&n>500)).toBe(true);
        expect(totals.every((n,i)=>i===0||n>totals[i-1])).toBe(true);
        await board.screenshot({animations:"disabled",
          path:info.outputPath("artcraft-cc0-"+aspect+"-portrait-storyboard-four-shots.png")});
        expect(await output.evaluate(node=>
          (node as HTMLCanvasElement).toDataURL("image/png")))
          .toBe(originalExport);
        await boardToggle.uncheck();
        const atlasToggle=page.getByRole("checkbox",{
          name:"Inspect CC0 eye nose and lip detail atlas",
        });
        await atlasToggle.check();
        const atlas=page.locator('[data-km-pencil-anatomy-atlas]');
        await expect(atlas).toHaveCount(1);
        const anatomySource=atlas.locator(
          'canvas[data-km-pencil-anatomy-source]');
        const anatomyDry=atlas.locator(
          'canvas[data-km-pencil-anatomy-dry]');
        await expect(anatomyDry).toHaveAttribute(
          "data-km-pencil-raster-underpaint","none");
        const anatomySelect=page.getByRole("combobox",{
          name:"CC0 measured face crop",
        });
        await expect(page.getByLabel("Pencil skin coverage"))
          .toHaveValue("0.7");
        for(const region of ["lips","nose","eyes","skin"] as const){
          await anatomySelect.selectOption(region);
          await expect(anatomySource).toHaveAttribute(
            "data-km-pencil-anatomy-rendered",region,{timeout:90000});
          await expect(anatomyDry).toHaveAttribute(
            "data-km-pencil-anatomy-rendered",region,{timeout:90000});
          await atlas.screenshot({animations:"disabled",
            path:info.outputPath("artcraft-cc0-"+aspect+"-detail-"+region+"-3x.png")});
        }
        const lipEvidence=page.locator(
          '[data-km-pencil-vermilion-proof="ready"]');
        await expect(lipEvidence).toHaveCount(1);
        const lipNumbers=await lipEvidence.evaluate(node=>({
          upper:Number(node.getAttribute(
            "data-km-pencil-vermilion-upper-deficit")),
          lower:Number(node.getAttribute(
            "data-km-pencil-vermilion-lower-deficit")),
        }));
        // Both independently source-observed lip pillows previously
        // disappeared into beige paper (~38 and 40 luma deficit). Keep
        // the photographed upper/lower vermilion in this dry code render.
        expect(lipNumbers.upper).toBeLessThan(25);
        expect(lipNumbers.lower).toBeLessThan(36);
        await expect(lipEvidence).toContainText(
          "No independent ArtCraft artistic approval");
        const jaw=page.locator('[data-km-pencil-jaw-contact="ready"]');
        await expect(jaw).toHaveCount(1);
        const jawDeficits=await jaw.evaluate(node=>[
          "upper","mid","lower"].map(part=>Number(
            node.getAttribute("data-km-pencil-jaw-"+part+"-deficit"))));
        // Old real-browser dry output had jaw 5×5-pixel deficits
        // 83, 80 and 68 despite source luminance only 50–70.
        expect(jawDeficits.every(Number.isFinite)).toBe(true);
        expect(jawDeficits.every(n=>n<65)).toBe(true);
        await expect(jaw).toContainText(
          "Not independent portrait or material approval");
        const lightSkin=page.locator(
          '[data-km-pencil-light-skin-proof="ready"]');
        await expect(lightSkin).toHaveCount(1);
        const lit=await lightSkin.evaluate(node=>({
          malar:Number(node.getAttribute(
            "data-km-pencil-malar-deficit")),
          bridge:Number(node.getAttribute(
            "data-km-pencil-bridge-deficit")),
        }));
        // The CC0 photo is luminous but NOT blank white at these measured
        // points; prior mechanical paper reserve discarded its pigment.
        // Never treat passing technical optics as artist approval.
        expect(lit.malar).toBeLessThan(30);
        expect(lit.bridge).toBeLessThan(32);
        await expect(lightSkin).toContainText(
          "Independent likeness and artistry NOT APPROVED");
        const skinEvidence=page.locator(
          '[data-km-pencil-skin-proof="ready"]');
        await expect(skinEvidence).toHaveCount(1);
        const skinPlanes=await skinEvidence.evaluate(node=>({
          cheek:Number(node.getAttribute(
            "data-km-pencil-skin-cheek-deficit")),
          orbital:Number(node.getAttribute(
            "data-km-pencil-skin-undereye-deficit")),
          chin:Number(node.getAttribute(
            "data-km-pencil-skin-chin-deficit")),
        }));
        // A formerly almost-white cheek/under-eye/chin should never
        // pass as a reference-matched dry-pencil surface merely because
        // the global five-value test still has a wide threshold.
        expect(skinPlanes.cheek).toBeLessThan(30);
        expect(skinPlanes.orbital).toBeLessThan(26);
        expect(skinPlanes.chin).toBeLessThan(29);
        await expect(skinEvidence).toContainText(
          "Independent realism and artist approval: NOT PASSED");
        const currentSource=await anatomySource.evaluate(node=>
          (node as HTMLCanvasElement).toDataURL("image/png"));
        const currentDry=await anatomyDry.evaluate(node=>
          (node as HTMLCanvasElement).toDataURL("image/png"));
        expect(currentSource).not.toBe(currentDry);
        expect(await output.evaluate(node=>
          (node as HTMLCanvasElement).toDataURL("image/png")))
          .toBe(originalExport);
        await atlasToggle.uncheck();
        const contactToggle=page.getByRole("checkbox",{
          name:"Inspect portrait hairline contact at three times scale",
        });
        await contactToggle.check();
        const contact=page.locator(
          '[data-km-pencil-portrait-contact-inspector]');
        await expect(contact).toHaveCount(1);
        const images=contact.locator("canvas[data-km-pencil-contact-image]");
        await expect(images).toHaveCount(2);
        for(const image of await images.all())
          await expect(image).toHaveAttribute(
            "data-km-pencil-contact-rendered","ready",{timeout:90000});
        await contact.screenshot({animations:"disabled",
          path:info.outputPath("artcraft-cc0-"+aspect+"-hairline-occlusion-3x.png")});
        const shadowEvidence=page.locator(
          '[data-km-pencil-hair-occlusion="ready"]');
        await expect(shadowEvidence).toHaveCount(1,{timeout:90000});
        const shadow=await shadowEvidence.evaluate(node=>({
          source:Number(node.getAttribute(
            "data-km-pencil-hair-occlusion-source")),
          drawn:Number(node.getAttribute(
            "data-km-pencil-hair-occlusion-drawn")),
        }));
        // Actual CC0 dark-ear lock was 3/255 in the photographic source
        // but 113/255 in v6's dry plate. Do not let an ivory seam return.
        expect(shadow.source).toBeLessThan(30);
        expect(shadow.drawn).toBeLessThan(105);
        await contactToggle.uncheck();
        const toneEvidence=page.locator(
          '[data-km-pencil-tonal-comparison="ready"]');
        await expect(toneEvidence).toHaveCount(1,{timeout:90000});
        await expect(toneEvidence.locator("tbody tr")).toHaveCount(5);
        const toneNumbers=await toneEvidence.evaluate(node=>({
          meanError:Number(node.getAttribute("data-km-pencil-mean-value-error")),
          retention:Number(node.getAttribute("data-km-pencil-contrast-retention")),
        }));
        // The previous *real* CC0 proof had mean 5-plane lightness
        // deficit near 63/255. Do not regress back to an optical wash.
        // This is a negative visual gate, NOT artistic approval.
        expect(toneNumbers.meanError).toBeLessThan(45);
        expect(toneNumbers.retention).toBeGreaterThan(.75);
        await expect(toneEvidence).toContainText(
          "Independent artistic approval: NOT PASSED");
        await toneEvidence.screenshot({animations:"disabled",
          path:info.outputPath("artcraft-cc0-"+aspect+"-five-source-tone-comparison.png")});
        const headMetrics=await full.evaluate(node=>{
          const canvas=node as HTMLCanvasElement;
          const data=canvas.getContext("2d")!.getImageData(
            0,0,canvas.width,canvas.height).data;
          let painted=0,highContrast=0;
          for(let i=0;i<data.length;i+=4){
            const delta=Math.abs(data[i]-250)+Math.abs(data[i+1]-245)+
              Math.abs(data[i+2]-237);
            if(delta>18)painted++;
            if(delta>125)highContrast++;
          }
          return {painted,highContrast};
        });
        expect(headMetrics.painted).toBeGreaterThan(18000);
        expect(headMetrics.highContrast).toBeGreaterThan(150);
        // Independent CC0 black-hair continuity gate. v1/v2 left an
        // actual near-black root/lock completely unpainted (paper white).
        // Check a small neighbourhood, not a lucky stroke-covered pixel.
        const darkLock=await Promise.all([headSource,full].map(node=>
          node.evaluate(canvasNode=>{
            const canvas=canvasNode as HTMLCanvasElement;
            const ctx=canvas.getContext("2d")!;
            const cx=Math.floor(canvas.width*.281);
            const cy=Math.floor(canvas.height*.691);
            const pixels=ctx.getImageData(cx-4,cy-4,9,9).data;
            let r=0,g=0,b=0,n=0;
            for(let i=0;i<pixels.length;i+=4){
              r+=pixels[i];g+=pixels[i+1];b+=pixels[i+2];n++;
            }
            return [r/n,g/n,b/n] as const;
          })));
        expect(darkLock[0][0]).toBeLessThan(70);
        expect(darkLock[1][0]).toBeLessThan(237);
        expect(darkLock[1][0]).toBeGreaterThan(darkLock[0][0]);
        await headSource.screenshot({animations:"disabled",
          path:info.outputPath("artcraft-cc0-"+aspect+"-full-head-source.png")});
        await full.screenshot({animations:"disabled",
          path:info.outputPath("artcraft-cc0-"+aspect+"-full-head-dry-only.png")});
        expect(await output.evaluate(node=>
          (node as HTMLCanvasElement).toDataURL("image/png")))
          .toBe(originalExport);
        await fullHeadToggle.uncheck();
        await expect(full).toHaveCount(0);
        // Actual CC0 photographic facial values, not the synthetic fixture:
        // capture the no-underpaint code-mark proof in both film aspects.
        const inspect=page.getByRole("checkbox",{
          name:"Inspect portrait detail at three times scale",
        });
        await inspect.check();
        const dry=page.locator("canvas[data-km-pencil-dry-portrait]");
        await expect(dry).toHaveAttribute("data-km-pencil-raster-underpaint","none");
        const detail=page.getByRole("combobox",{name:"Pencil face detail region"});
        for(const region of ["eyes","lips"] as const){
          await detail.selectOption(region);
          await expect(dry).toHaveAttribute("data-km-pencil-dry-rendered-region",region);
          await dry.screenshot({animations:"disabled",
            path:info.outputPath("artcraft-real-cc0-"+aspect+"-"+region+"-dry-only.png")});
        }
        // Compare the exact same licensed source, crop, knobs and time; only
        // the measured facial-pencil passes change. Never attribute old
        // source/algorithm revisions to this PR.
        await expect(output).toHaveAttribute(
          "data-km-portrait-features","source-guided");
        const guided=await output.screenshot({animations:"disabled"});
        // Unlike 'screenshot exists', this verifies the authored face-pigment
        // layer has a measurable final-size effect on actual browser pixels.
        // This is a NEGATIVE engineering threshold, never artistic approval.
        const sampleFace=()=>output.evaluate(node=>{
          const c=node as HTMLCanvasElement,ctx=c.getContext("2d")!;
          const sx=Math.floor(c.width*.28),sy=Math.floor(c.height*.20);
          const sw=Math.floor(c.width*.43),sh=Math.floor(c.height*.68);
          const pixels=ctx.getImageData(sx,sy,sw,sh).data;
          const sampled:number[]=[];
          for(let y=0;y<sh;y+=6)for(let x=0;x<sw;x+=6){
            const i=(y*sw+x)*4;
            sampled.push(pixels[i],pixels[i+1],pixels[i+2]);
          }
          return sampled;
        });
        const guidedSamples=await sampleFace();
        const toggle=page.getByRole("checkbox",{
          name:"Apply source-based portrait pencil marks"});
        await toggle.uncheck();
        await expect(output).toHaveAttribute("data-km-portrait-features","none");
        const unguided=await output.screenshot({animations:"disabled",
          path:info.outputPath("artcraft-portrait-"+sample+"-"+aspect+"-AB-unmodified-base.png")});
        expect(Buffer.compare(guided,unguided)).not.toBe(0);
        const baseSamples=await sampleFace();
        expect(baseSamples.length).toBe(guidedSamples.length);
        const meanDelta=baseSamples.reduce((sum,value,i)=>
          sum+Math.abs(value-guidedSamples[i]),0)/baseSamples.length;
        console.log("[ArtCraft face same-photo A/B]",aspect,
          {meanDelta,source:"CC0",independentArtistApproval:false});
        expect(meanDelta).toBeGreaterThan(.8);
        await toggle.check();
        await expect(output).toHaveAttribute(
          "data-km-portrait-features","source-guided");
        await page.getByRole("checkbox",{name:"Show source-measured face guides"})
          .check();
        await expect(page.locator("svg[data-km-face-guide-overlay] circle"))
          .toHaveCount(25);
        await page.locator('svg[data-km-face-guide-overlay]').screenshot({
          animations:"disabled",
          path:info.outputPath("artcraft-portrait-"+sample+"-"+aspect+"-source-landmarks.png"),
        });
        await page.getByRole("checkbox",{name:"Show source-measured face guides"})
          .uncheck();
      }
    }
    await framing.selectOption("fit");
    await expect(output).toHaveAttribute("data-km-pencil-photo","ready");
    await framing.selectOption("focus");
    await expect(output).toHaveAttribute("data-km-pencil-photo","ready");
  });
}
