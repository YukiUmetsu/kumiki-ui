import {test,expect} from "@playwright/test";

/**
 * Fully local synthetic input: no dependence on Wikimedia/CORS for CI.
 * This tests actual Canvas pixels, not an inert src URL or JSX source check.
 */
test("reference-guided pencil renders locally loaded colour/edge structure in both aspects",
  async({page},info)=>{
    await page.goto("/iframe.html?id=video-colored-pencil-science--reference-guided-pencil&viewMode=story");
    const img=await page.evaluate(()=>{
      const canvas=document.createElement("canvas");
      canvas.width=72;canvas.height=52;
      const g=canvas.getContext("2d")!;
      const grad=g.createLinearGradient(0,0,72,52);
      grad.addColorStop(0,"#D8774A");grad.addColorStop(.49,"#A95333");
      grad.addColorStop(.50,"#285C86");grad.addColorStop(1,"#78A1BD");
      g.fillStyle=grad;g.fillRect(0,0,72,52);
      g.strokeStyle="#282D3A";g.lineWidth=3;
      g.beginPath();g.moveTo(18,9);g.quadraticCurveTo(32,22,52,46);g.stroke();
      g.fillStyle="#FEEDCC";g.beginPath();g.ellipse(21,22,4,2,0,0,Math.PI*2);g.fill();
      return canvas.toDataURL("image/png").split(",")[1];
    });
    await page.getByRole("textbox",{name:"Upload pencil reference photo"})
      .setInputFiles({name:"controlled-anatomy.png",mimeType:"image/png",
        buffer:Buffer.from(img,"base64")});
    const canvas=page.locator('canvas[data-km-pencil-photo]');
    await expect(canvas).toHaveAttribute("data-km-pencil-photo","ready",{timeout:20000});
    await expect(page.getByRole("alert")).toHaveCount(0);
    for(const aspect of ["landscape","portrait"] as const){
      await page.getByRole("combobox",{name:"Pencil photo aspect"}).selectOption(aspect);
      await expect(canvas).toHaveAttribute("data-km-pencil-photo","ready",{timeout:20000});
      await page.getByRole("slider",{name:"Pencil photo frame"}).fill("350");
      const metrics=await canvas.evaluate(node=>{
        const c=node as HTMLCanvasElement;
        const x=c.getContext("2d")!;
        const a=x.getImageData(Math.round(c.width*.25),Math.round(c.height*.50),1,1).data;
        const b=x.getImageData(Math.round(c.width*.75),Math.round(c.height*.50),1,1).data;
        return {left:[...a].slice(0,3),right:[...b].slice(0,3)};
      });
      expect(metrics.left[0]).toBeGreaterThan(metrics.right[0]+20);
      expect(metrics.right[2]).toBeGreaterThan(metrics.left[2]+15);
      await canvas.screenshot({animations:"disabled",
        path:info.outputPath("pencil-source-guided-"+aspect+"-finished.png")});
      await page.getByRole("slider",{name:"Pencil photo frame"}).fill("175");
      await canvas.screenshot({animations:"disabled",
        path:info.outputPath("pencil-source-guided-"+aspect+"-mid-draw.png")});
    }
    await page.getByRole("slider",{name:"Pencil photo density"}).fill("1.8");
    await expect(canvas).toHaveAttribute("data-km-pencil-photo","ready");
    await page.getByRole("slider",{name:"Pencil photo frame"}).fill("350");
    await canvas.screenshot({animations:"disabled",
      path:info.outputPath("pencil-source-guided-extra-strokes.png")});
  });
