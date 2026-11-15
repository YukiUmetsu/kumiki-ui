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
        await expect(full).toHaveAttribute(
          "data-km-pencil-skin-light-plane-fibres","0");
        await expect(full).toHaveAttribute(
          "data-km-pencil-skin-protected-curve-spans","0");
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
        const lightFibres=Number(await full.getAttribute(
          "data-km-pencil-skin-light-plane-fibres"));
        const protectedCurves=Number(await full.getAttribute(
          "data-km-pencil-skin-protected-curve-spans"));
        expect(Number.isSafeInteger(lightFibres)).toBe(true);
        expect(lightFibres).toBeGreaterThan(0);
        expect(lightFibres).toBeLessThanOrEqual(opticalNibCount);
        expect(Number.isSafeInteger(protectedCurves)).toBe(true);
        expect(protectedCurves).toBeGreaterThanOrEqual(0);
        // Real camera exposure may contain no skin above the calibrated
        // near-paper reserve threshold. Never fabricate a highlight;
        // synthetic pure-white source is covered by the dedicated unit gate.
        expect(Number.isInteger(protectedSkinHighlights)).toBe(true);
        expect(protectedSkinHighlights).toBeGreaterThanOrEqual(0);
        expect(await full.evaluate(node=>
          (node as HTMLCanvasElement).toDataURL("image/png")))
          .not.toBe(withoutWeave);
        await full.screenshot({animations:"disabled",
          path:info.outputPath("artcraft-cc0-"+aspect+"-skin-weave-optical-100.png")});
        expect(await output.evaluate(node=>
          (node as HTMLCanvasElement).toDataURL("image/png")))
          .toBe(originalExport);
        // CP17 opt-in skin tooth bridge: the same CC0 source and same
        // finished dry-pigment drawing, no imported bitmap or raster blur.
        // Report actual pencil nib count and 1×/3× film-aspect evidence.
        const bridge=page.getByLabel("Pencil source-aware tooth bridge");
        await bridge.focus();await bridge.press("Home");
        await expect(bridge).toHaveValue("0");
        await expect(full).toHaveAttribute(
          "data-km-pencil-tooth-bridge","0");
        await expect(full).toHaveAttribute(
          "data-km-pencil-tooth-bridge-nibs","0");
        const bridgeLegacy=await full.evaluate(node=>
          (node as HTMLCanvasElement).toDataURL("image/png"));
        await full.screenshot({animations:"disabled",
          path:info.outputPath("artcraft-cc0-"+aspect+"-tooth-bridge-0.png")});
        await bridge.press("End");
        await expect(bridge).toHaveValue("1");
        await expect(full).toHaveAttribute(
          "data-km-pencil-tooth-bridge","1");
        const bridgeNibs=Number(await full.getAttribute(
          "data-km-pencil-tooth-bridge-nibs"));
        expect(bridgeNibs).toBeGreaterThan(10);
        const bridgePixels=await full.evaluate(node=>
          (node as HTMLCanvasElement).toDataURL("image/png"));
        expect(bridgePixels).not.toBe(bridgeLegacy);
        await full.screenshot({animations:"disabled",
          path:info.outputPath("artcraft-cc0-"+aspect+"-tooth-bridge-100.png")});
        await bridge.press("Home");
        await expect(bridge).toHaveValue("0");
        expect(await full.evaluate(node=>
          (node as HTMLCanvasElement).toDataURL("image/png")))
          .toBe(bridgeLegacy);
        expect(await output.evaluate(node=>
          (node as HTMLCanvasElement).toDataURL("image/png")))
          .toBe(originalExport);
        // Needle-sharp pigment densification is a reversible render-time
        // skin material only. It may not touch the photo, hair, iris, lip
        // or the independent photo-to-pencil video export.
        const needle=page.getByLabel("Pencil needlepoint skin optical fill");
        await needle.focus();
        await needle.press("Home");
        await expect(needle).toHaveValue("0");
        await expect(full).toHaveAttribute(
          "data-km-pencil-needlepoint-depth","0");
        await expect(full).toHaveAttribute(
          "data-km-pencil-needlepoint-fibres","0");
        // At true 285×318 presentation scale, the v14 source-matched
        // cheek/forehead still had 3–6× excess high-pass paper grain.
        // A positive diff PNG alone is NOT proof that it improved.
        // This observes only the actual final Chromium canvas, never
        // reads photo pixels into the painted artwork.
        const measureSkinGrain=async()=>full.evaluate(node=>{
          const canvas=node as HTMLCanvasElement;
          const probe=document.createElement("canvas");
          probe.width=285;probe.height=318;
          const context=probe.getContext("2d")!;
          context.imageSmoothingEnabled=true;
          context.drawImage(canvas,0,0,285,318);
          const rgba=context.getImageData(0,0,285,318).data;
          const value=new Float32Array(285*318);
          for(let i=0;i<value.length;i++){
            const j=i*4;
            value[i]=.2126*rgba[j]+.7152*rgba[j+1]+.0722*rgba[j+2];
          }
          const patches=[
            [90,46,175,91],[75,124,160,192],
            [90,200,180,235],[150,115,210,160],
          ];
          let residual=0,count=0;
          for(const [x0,y0,x1,y1] of patches){
            for(let y=y0+2;y<y1-2;y++)for(let x=x0+2;x<x1-2;x++){
              let average=0;
              for(let yy=-2;yy<=2;yy++)for(let xx=-2;xx<=2;xx++)
                average+=value[(y+yy)*285+x+xx];
              const d=value[y*285+x]-average/25;
              residual+=d*d;count++;
            }
          }
          // Must not alter the real deep iris or photographed lip seam.
          const protectedPixels=[135+130*285,183+190*285,20+20*285]
            .map(i=>Math.round(value[i]*100)/100);
          return {grain:Math.sqrt(residual/count),protectedPixels};
        });
        const sparseEvidence=await measureSkinGrain();
        const sparseSkin=await full.evaluate(node=>
          (node as HTMLCanvasElement).toDataURL("image/png"));
        await full.screenshot({animations:"disabled",
          path:info.outputPath("artcraft-cc0-"+aspect+"-needlepoint-sparse-0.png")});
        await needle.press("End");
        await expect(needle).toHaveValue("1");
        await expect(full).toHaveAttribute(
          "data-km-pencil-needlepoint-depth","1");
        const fineFibres=Number(await full.getAttribute(
          "data-km-pencil-needlepoint-fibres"));
        expect(fineFibres).toBeGreaterThan(2000);
        expect(await full.evaluate(node=>
          (node as HTMLCanvasElement).toDataURL("image/png")))
          .not.toBe(sparseSkin);
        const denseEvidence=await measureSkinGrain();
        // A genuinely improved colored-pencil material lowers visible
        // coarse grain, not merely changes ~6k face pixels. Keep the
        // invariant as a negative quality gate for future refactors.
        expect(denseEvidence.grain).toBeLessThan(sparseEvidence.grain-.15);
        expect(denseEvidence.protectedPixels).toEqual(
          sparseEvidence.protectedPixels);
        await full.screenshot({animations:"disabled",
          path:info.outputPath("artcraft-cc0-"+aspect+"-needlepoint-dense-100.png")});
        expect(await output.evaluate(node=>
          (node as HTMLCanvasElement).toDataURL("image/png")))
          .toBe(originalExport);
        // ArtCraft v16: transparent photograph-measured skin pigment is
        // rendered under every real colored-pencil value/hair/iris stroke.
        // Zero means EXACT original v15, 100 means new optical glaze.
        const glaze=page.getByLabel("Pencil photo-measured soft skin glazing");
        await glaze.focus();await glaze.press("Home");
        await expect(glaze).toHaveValue("0");
        await expect(full).toHaveAttribute(
          "data-km-pencil-photometric-glaze","0");
        await expect(full).toHaveAttribute(
          "data-km-pencil-glaze-strokes","0");
        // Native 285×318 screenshot-scale validation. No image is
        // modified here: this is browser evidence FROM the finished dry
        // pencil and the separately displayed licensed reference.
        const faceMetrics=async()=>full.evaluate(node=>{
          const source=document.querySelector<HTMLCanvasElement>(
            'canvas[data-km-pencil-full-head-source]');
          if(!source)throw Error("Missing observed source proof");
          const values=(canvas:HTMLCanvasElement)=>{
            const image=document.createElement("canvas");
            image.width=285;image.height=318;
            const ctx=image.getContext("2d")!;
            ctx.imageSmoothingEnabled=true;
            ctx.drawImage(canvas,0,0,285,318);
            const data=ctx.getImageData(0,0,285,318).data;
            const out=new Float32Array(285*318);
            for(let i=0;i<out.length;i++){
              const k=i*4;
              out[i]=.2126*data[k]+.7152*data[k+1]+.0722*data[k+2];
            }
            return out;
          };
          const ref=values(source),got=values(node as HTMLCanvasElement);
          const regions=[
            [90,46,175,91],[75,124,160,192],
            [90,200,180,235],[150,115,210,160],
          ];
          let residual=0,error=0,n=0;
          for(const [x0,y0,x1,y1] of regions){
            for(let y=y0+2;y<y1-2;y++)
              for(let x=x0+2;x<x1-2;x++){
                let mean=0;
                for(let dy=-2;dy<=2;dy++)
                  for(let dx=-2;dx<=2;dx++)
                    mean+=got[(y+dy)*285+x+dx];
                const i=y*285+x;
                residual+=(got[i]-mean/25)**2;
                error+=Math.abs(got[i]-ref[i]);n++;
              }
          }
          const protectedPixels=[
            [135,130],[183,190],[20,20],[75,230],
          ].map(([x,y])=>Math.round(got[y*285+x]*100)/100);
          return {mae:error/n,grain:Math.sqrt(residual/n),
            protectedPixels};
        });
        const oldFace=await faceMetrics();
        const unglazed=await full.evaluate(node=>
          (node as HTMLCanvasElement).toDataURL("image/png"));
        await full.screenshot({animations:"disabled",
          path:info.outputPath("artcraft-cc0-"+aspect+"-skin-glaze-legacy-0.png")});
        await glaze.press("End");
        await expect(glaze).toHaveValue("1");
        await expect(full).toHaveAttribute(
          "data-km-pencil-photometric-glaze","1");
        const glazeNibs=Number(await full.getAttribute(
          "data-km-pencil-glaze-strokes"));
        const preserved=Number(await full.getAttribute(
          "data-km-pencil-glaze-protected"));
        expect(glazeNibs).toBeGreaterThan(800);
        expect(preserved).toBeGreaterThan(0);
        expect(await full.evaluate(node=>
          (node as HTMLCanvasElement).toDataURL("image/png")))
          .not.toBe(unglazed);
        const newFace=await faceMetrics();
        // An attractive diff is not enough: full-color glazing must
        // improve BOTH true source-tonal error and coarse paper grain.
        // A stronger underlayer initially passed visual-only tests
        // while DARKENING forehead/cheek by 10-14 grey levels.
        expect(newFace.mae).toBeLessThan(oldFace.mae-.12);
        expect(newFace.grain).toBeLessThan(oldFace.grain-.35);
        for(let i=0;i<oldFace.protectedPixels.length;i++)
          expect(Math.abs(newFace.protectedPixels[i]-
            oldFace.protectedPixels[i])).toBeLessThan(2);
        await full.screenshot({animations:"disabled",
          path:info.outputPath("artcraft-cc0-"+aspect+"-skin-glaze-source-100.png")});
        expect(await output.evaluate(node=>
          (node as HTMLCanvasElement).toDataURL("image/png")))
          .toBe(originalExport);
        // ArtCraft v17: the *source* is dark, connected neck skin
        // below the jaw while a previous authored hair-root split
        // accidentally exposed a 1–3px vertical bright paper channel.
        // Measure genuine licensed-photo evidence, not screenshots
        // invented by a test fixture or a smoothing filter.
        const neck=page.getByLabel(
          "Pencil photo-observed neck contact closure");
        const observedNeck=async()=>full.evaluate(node=>{
          const reference=document.querySelector<HTMLCanvasElement>(
            "canvas[data-km-pencil-full-head-source]");
          if(!reference)throw Error("Missing independently observed CC0 source");
          const values=(canvas:HTMLCanvasElement)=>{
            const sample=document.createElement("canvas");
            sample.width=285;sample.height=318;
            const ctx=sample.getContext("2d")!;
            ctx.drawImage(canvas,0,0,285,318);
            const data=ctx.getImageData(0,0,285,318).data;
            const out=new Float32Array(285*318);
            for(let i=0;i<out.length;i++){
              const k=i*4;
              out[i]=.2126*data[k]+.7152*data[k+1]+.0722*data[k+2];
            }
            return out;
          };
          const drawn=values(node as HTMLCanvasElement);
          const photographic=values(reference);
          let deficit=0,mae=0,n=0;
          // Actual registered 285x318 lower-neck seam (relative to
          // the existing original CC0 photo and fixed 540x600 plate).
          for(let y=240;y<279;y++)for(let x=136;x<=144;x++){
            const i=y*285+x;
            if(photographic[i]>185)continue;
            const delta=drawn[i]-photographic[i];
            deficit+=Math.max(0,delta);
            mae+=Math.abs(delta);
            n++;
          }
          const safe=[
            [135,130],[183,190],[20,20],[75,230],
          ].map(([x,y])=>Math.round(drawn[y*285+x]*100)/100);
          return {deficit:deficit/n,mae:mae/n,safe,n};
        });
        await neck.focus();await neck.press("Home");
        await expect(neck).toHaveValue("0");
        await expect(full).toHaveAttribute(
          "data-km-pencil-neck-contact","0");
        await expect(full).toHaveAttribute(
          "data-km-pencil-neck-contact-nibs","0");
        const noNeck=await observedNeck();
        expect(noNeck.n).toBeGreaterThan(250);
        const legacyNeck=await full.evaluate(node=>
          (node as HTMLCanvasElement).toDataURL("image/png"));
        await full.screenshot({animations:"disabled",
          path:info.outputPath("artcraft-cc0-"+aspect+"-neck-legacy-gap-0.png")});
        await neck.press("End");
        await expect(neck).toHaveValue("1");
        await expect(full).toHaveAttribute(
          "data-km-pencil-neck-contact","1");
        const contacts=Number(await full.getAttribute(
          "data-km-pencil-neck-contact-nibs"));
        expect(contacts).toBeGreaterThan(100);
        expect(await full.evaluate(node=>
          (node as HTMLCanvasElement).toDataURL("image/png")))
          .not.toBe(legacyNeck);
        const repairedNeck=await observedNeck();
        expect(repairedNeck.deficit).toBeLessThan(noNeck.deficit-.8);
        expect(repairedNeck.mae).toBeLessThan(noNeck.mae+1.5);
        expect(repairedNeck.safe).toEqual(noNeck.safe);
        await full.screenshot({animations:"disabled",
          path:info.outputPath("artcraft-cc0-"+aspect+"-neck-photo-contact-100.png")});
        expect(await output.evaluate(node=>
          (node as HTMLCanvasElement).toDataURL("image/png")))
          .toBe(originalExport);
        // CP18: detect false paper-white on the photo-measured jaw
        // polygon, not merely a changed screenshot. Photo and dry-pencil
        // visual evidence are both sampled at real 285×318 presentation.
        // No photograph pixel is copied into the actual pigment artwork.
        const jawSlider=page.getByLabel("Pencil photo-verified jaw paper-tooth repair");
        const measuredJaw=async()=>full.evaluate(node=>{
          const source=document.querySelector<HTMLCanvasElement>(
            "canvas[data-km-pencil-full-head-source]");
          if(!source)throw Error("No source photograph comparison");
          const sample=(canvas:HTMLCanvasElement)=>{
            const out=document.createElement("canvas");
            out.width=285;out.height=318;
            const ctx=out.getContext("2d")!;
            ctx.drawImage(canvas,0,0,285,318);
            const data=ctx.getImageData(0,0,285,318).data;
            const rgb=new Float32Array(285*318);
            for(let i=0;i<rgb.length;i++){
              const k=4*i;
              rgb[i]=.2126*data[k]+.7152*data[k+1]+.0722*data[k+2];
            }
            return rgb;
          };
          const ref=sample(source),drawn=sample(node as HTMLCanvasElement);
          // A native screenshot projection of the photographed contour
          // from face polygon indices 8 to 15. This measures both the
          // ear-side cheek fold and the lower mandibular arc.
          const edge=[
            [204,221],[189,237],[171,246],[146,244],
            [120,231],[99,211],[84,184],[73,151],
          ];
          const positions=new Set<number>();
          for(let seg=0;seg<edge.length-1;seg++){
            const [ax,ay]=edge[seg],[bx,by]=edge[seg+1];
            const dx=bx-ax,dy=by-ay;
            const len=Math.hypot(dx,dy);
            for(let j=0;j<Math.ceil(len);j++){
              const t=(j+.5)/Math.ceil(len);
              for(const normal of [-1,0,1]){
                const x=Math.round(ax+t*dx-normal*dy/len);
                const y=Math.round(ay+t*dy+normal*dx/len);
                if(x<2||y<2||x>=283||y>=316)continue;
                positions.add(y*285+x);
              }
            }
          }
          let gap=0,mae=0,n=0;
          for(const i of positions){
            if(ref[i]>185)continue; // true photographed paper lights
            const d=drawn[i]-ref[i];
            gap+=Math.max(0,d);mae+=Math.abs(d);n++;
          }
          const protect=[
            [135,130],[183,190],[20,20],[75,230],
          ].map(([x,y])=>Math.round(drawn[y*285+x]*100)/100);
          return {gap:gap/n,mae:mae/n,n,protect};
        });
        await jawSlider.focus();await jawSlider.press("Home");
        await expect(jawSlider).toHaveValue("0");
        await expect(full).toHaveAttribute(
          "data-km-pencil-jaw-edge","0");
        await expect(full).toHaveAttribute(
          "data-km-pencil-jaw-edge-nibs","0");
        const oldJaw=await measuredJaw();
        expect(oldJaw.n).toBeGreaterThan(250);
        const noJaw=await full.evaluate(node=>
          (node as HTMLCanvasElement).toDataURL("image/png"));
        await full.screenshot({animations:"disabled",
          path:info.outputPath("artcraft-cc0-"+aspect+"-jaw-chalk-legacy-0.png")});
        await jawSlider.press("End");
        await expect(jawSlider).toHaveValue("1");
        await expect(full).toHaveAttribute(
          "data-km-pencil-jaw-edge","1");
        const jawFibres=Number(await full.getAttribute(
          "data-km-pencil-jaw-edge-nibs"));
        expect(jawFibres).toBeGreaterThan(80);
        expect(await full.evaluate(node=>
          (node as HTMLCanvasElement).toDataURL("image/png")))
          .not.toBe(noJaw);
        const newJaw=await measuredJaw();
        expect(newJaw.gap).toBeLessThan(oldJaw.gap-1.5);
        expect(newJaw.mae).toBeLessThan(oldJaw.mae+.9);
        expect(newJaw.protect).toEqual(oldJaw.protect);
        await full.screenshot({animations:"disabled",
          path:info.outputPath("artcraft-cc0-"+aspect+"-jaw-photo-tooth-100.png")});
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
