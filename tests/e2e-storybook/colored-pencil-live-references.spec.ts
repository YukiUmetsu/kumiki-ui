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
