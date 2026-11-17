import {test,expect} from "@playwright/test";

test("RISO64 original press/camera beats stay source-native in actual FilmStage and both outputs",
  async({page},info)=>{
  const errors:string[]=[];
  page.on("pageerror",e=>errors.push(e.message));
  await page.setViewportSize({width:1500,height:1300});
  await page.goto("/iframe.html?id=video-riso-print-lab--risograph-cinematic-journey&viewMode=story");
  const root=page.locator("[data-km-riso64-studio]");
  const stage=root.locator("[data-km-riso64-film-stage]");
  await expect(root).toBeVisible();
  const aspect=page.getByRole("combobox",{name:"RISO64 output aspect"});
  const frame=page.getByRole("slider",{name:"RISO64 absolute film frame"});
  const setFrame=async(value:number)=>{
    await frame.evaluate((element,next)=>{
      const input=element as HTMLInputElement;
      const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")?.set;
      if(!setter)throw new Error("native slider setter unavailable");
      setter.call(input,String(next));
      input.dispatchEvent(new Event("input",{bubbles:true}));
      input.dispatchEvent(new Event("change",{bubbles:true}));
    },value);
    await expect(root).toHaveAttribute("data-km-riso64-frame",String(value));
  };
  const beats=[
    {at:24,id:"cobalt-macro",master:"blue"},
    {at:74,id:"cobalt-pullback",master:"blue"},
    {at:138,id:"vermilion-pass",master:"both"},
    {at:198,id:"overprint-macro",master:"both"},
    {at:287,id:"original-hold",master:"both"},
  ] as const;
  for(const shape of ["landscape","portrait"] as const){
    await aspect.selectOption(shape);
    await expect(root).toHaveAttribute("data-km-riso64-aspect",shape);
    const dims=shape==="landscape"?[960,540]:[540,960];
    await expect(stage).toHaveCSS("width",dims[0]+"px");
    await expect(stage).toHaveCSS("height",dims[1]+"px");
    for(const beat of beats){
      await setFrame(beat.at);
      const ink=stage.locator("[data-km-riso64-shot]");
      await expect(ink).toHaveAttribute("data-km-riso64-shot",beat.id);
      await expect(ink).toHaveAttribute("data-km-riso64-master",beat.master);
      await expect(ink.locator("[data-km-riso62-brush]")).toHaveCount(beat.master==="blue"?11:20);
      await expect(ink.locator("[data-km-riso-plate]")).toHaveCount(beat.master==="blue"?1:2);
      await stage.screenshot({path:info.outputPath(
        "riso64-"+shape+"-"+beat.id+"-native-filmstage.png"
      ),animations:"disabled"});
    }
    await setFrame(287);
    const finish=stage.locator("[data-km-riso64-shot]");
    await expect(finish).toHaveAttribute("data-km-riso64-camera-zoom","1.00000");
    const camera=finish.locator("[data-km-riso64-camera]");
    await expect(camera).toHaveCSS("transform","matrix(1, 0, 0, 1, 0, 0)");
    const nodes=finish.locator("svg text");
    const paper=await stage.boundingBox();
    expect(paper).not.toBeNull();
    expect(await nodes.count()).toBeGreaterThan(1);
    for(const node of await nodes.all()){
      const rect=await node.boundingBox();
      if(!rect||!paper)continue;
      expect(rect.x).toBeGreaterThanOrEqual(paper.x-1);
      expect(rect.y).toBeGreaterThanOrEqual(paper.y-1);
      expect(rect.x+rect.width).toBeLessThanOrEqual(paper.x+paper.width+1);
      expect(rect.y+rect.height).toBeLessThanOrEqual(paper.y+paper.height+1);
    }
  }
  await aspect.selectOption("landscape");
  await setFrame(143);
  const red=stage.locator("[data-km-riso64-shot]");
  const early=Number(await red.getAttribute("data-km-riso64-press-frame"));
  await setFrame(163);
  const late=Number(await red.getAttribute("data-km-riso64-press-frame"));
  expect(late).toBeGreaterThan(early);
  await setFrame(143);
  expect(Number(await red.getAttribute("data-km-riso64-press-frame"))).toBe(early);
  await setFrame(265);
  const source=stage.locator("[data-km-riso62-source-path]").first();
  const a=await source.getAttribute("d");
  await setFrame(287);
  const b=await source.getAttribute("d");
  expect(a).not.toBe(b);
  await setFrame(265);
  expect(await source.getAttribute("d")).toBe(a);
  const reduced=page.getByRole("checkbox",{name:"RISO64 reduce motion"});
  await reduced.check();
  await setFrame(24);
  const still=stage.locator("[data-km-riso64-shot]");
  await expect(still).toHaveAttribute("data-km-riso64-camera-zoom","1.00000");
  await expect(still).toHaveAttribute("data-km-riso64-press-frame","239");
  await expect(still).toHaveAttribute("data-km-riso64-master","both");
  await reduced.uncheck();
  await expect(still).toHaveAttribute("data-km-riso64-camera-zoom",/^[23]\./);
  await page.getByRole("button",{name:"RISO64 shot 5 original-hold"}).click();
  await expect(root).toHaveAttribute("data-km-riso64-frame","222");
  await page.getByRole("button",{name:"RISO64 play film"}).click();
  await expect(root).toHaveAttribute("data-km-riso64-playing","true");
  await page.getByRole("button",{name:"RISO64 pause film"}).click();
  await expect(root).toHaveAttribute("data-km-riso64-playing","false");
  expect(errors).toEqual([]);
});
