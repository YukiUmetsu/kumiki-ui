import { expect, test } from "@playwright/test";

/** GPU-enabled video QA; intentionally separate from the default cross-platform
 * scene suite because CI/remote containers may have no supported WebGL context.
 * A missing GPU is an explicit failure, never a silent fallback to mock frames.
 */
for(const {story,name} of [
  {story:"motion-scene-cutaway-3d--capture-3d",name:"cutaway"},
  {story:"motion-scene-glass-3d--capture-3d",name:"glass"},
  {story:"motion-scene-book-3d--capture-3d",name:"book"},
] as const){
  test(`true 3D ${name} captures the exact requested WebGL frame`,async({page},info)=>{
    await page.goto("/iframe.html?id="+story+"&viewMode=story&kmExport=1");
    const viewer=page.locator('[data-km-hero-viewer][data-km-frame-addressed]');
    await expect(viewer).toBeVisible();
    const canvas=viewer.locator("canvas");
    await expect(canvas).toHaveAttribute("data-km-hero-ready","true",{timeout:30000});
    const stage=page.locator("[data-km-video-capture]");
    const frames=[0,34,63,95,119];
    let previous:Buffer|null=null;
    let differences=0;
    for(const frame of frames){
      await page.evaluate(async n=>{
        const api=window.__kmVideoExport;
        if(!api)throw Error("3D export handshake unavailable");
        await api.seek(n);
      },frame);
      await expect(stage).toHaveAttribute("data-frame",String(frame));
      await expect(canvas).toHaveAttribute("data-km-hero-frame",String(frame));
      await expect(viewer.locator("[role=alert]")).toHaveCount(0);
      const screenshot=await canvas.screenshot({animations:"disabled",
        path:info.outputPath(name+"-3d-"+frame+".png")});
      if(previous&&!previous.equals(screenshot))differences++;
      previous=screenshot;
    }
    expect(differences,"The 3D scene never changed between requested frames").toBeGreaterThan(2);
  });
}
