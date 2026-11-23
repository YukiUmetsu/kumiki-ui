import { test, expect } from "@playwright/test";

/** Each Film Looks story previews the very same FD1 scene used for production export.
 * These checks run against Storybook's actual browser iframe, not a mocked renderer.
 */
test.describe("watercolour Film Looks interactive showcases",()=>{
  test("brush film plays, seeks and accepts individual stroke edits",async({page})=>{
    await page.goto("/iframe.html?id=film-art-watercolour-brush--painted-film&viewMode=story");
    await expect(page.getByRole("heading",{name:"Watercolour & brush atelier"})).toBeVisible();
    await page.getByRole("button",{name:"Coast 280"}).click();
    await expect(page.getByText("Absolute film frame: 690 / 819")).toBeVisible();
    await page.getByRole("spinbutton",{name:"Paper seed"}).fill("93");
    await page.getByText(/Coast brush strokes.*advanced JSON editor/).click();
    const input=page.getByRole("textbox",{name:"Scene configuration (JSON)"});
    const original=JSON.parse(await input.inputValue());
    expect(original.seed).toBe(93);
    expect(original.strokes.length).toBeGreaterThan(10);
    original.strokes[0].color="#526A83";
    await input.fill(JSON.stringify(original));
    await page.getByRole("button",{name:"Apply validated JSON"}).click();
    await expect(page.locator('[data-km-watercolour]')).toBeVisible();
  });

  test("painted film switches independent chapters and validates washes",async({page})=>{
    await page.goto("/iframe.html?id=film-art-watercolour-worlds--any-subject-painted-film&viewMode=story");
    await expect(page.getByRole("heading",{name:/Any-Subject Film Atelier/})).toBeVisible();
    await page.getByRole("button",{name:"Science / explainers"}).click();
    await expect(page.getByText(/Current chapter:/)).toContainText("Science / explainers");
    await page.getByText(/Science \/ explainers layered composition.*advanced JSON editor/).click();
    const input=page.getByRole("textbox",{name:"Scene configuration (JSON)"});
    const spec=JSON.parse(await input.inputValue());
    expect(spec.layers.length).toBeGreaterThan(0);
    expect(spec.layers.some((l:{kind:string})=>l.kind==="wash")).toBe(true);
    spec.paper.tooth=2;
    await input.fill(JSON.stringify(spec));
    await page.getByRole("button",{name:"Apply validated JSON"}).click();
    await expect(page.getByRole("alert")).toContainText("Tooth");
    spec.paper.tooth=.34;
    await input.fill(JSON.stringify(spec));
    await page.getByRole("button",{name:"Apply validated JSON"}).click();
    await expect(page.locator('[data-km-painted-composition]')).toBeVisible();
  });

  // #245 (948b0d24) retired the "A character made of paint" story with its own spec
  // and left this test behind. The same idea is shown in two stories today: RIG1's
  // performer in the watercolour look (48df98d9), and the Illustration Director's
  // rigged heron, whose whole scene is open in the validated JSON editor.
  test("rigged performer seeks to speech and takes another gait in watercolour",async({page})=>{
    await page.goto("/iframe.html?id=video-universal-rig--lab&viewMode=story");
    await expect(page.getByRole("heading",{name:"One rig, any film look"})).toBeVisible();
    const pick=(group:string,name:string)=>page.getByRole("navigation",{name:group})
      .getByRole("button",{name,exact:true}).click();
    await pick("people","Person");
    await pick("Film looks","Watercolour");
    const art=page.locator('svg[data-km-rig-look="watercolour"]');
    await expect(art.locator("[data-km-rig-watercolour]")).toHaveCount(1);
    const seek=async(frame:number)=>{
      await page.getByRole("slider",{name:"Rig frame"}).evaluate((node,n)=>{
        const input=node as HTMLInputElement;
        const native=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")?.set;
        if(!native)throw new Error("No native range setter");
        native.call(input,String(n));
        input.dispatchEvent(new Event("input",{bubbles:true}));
        input.dispatchEvent(new Event("change",{bubbles:true}));
      },frame);
      await expect(art.locator("[data-km-rig]")).toHaveAttribute("data-km-rig-frame",String(frame));
    };
    const mouth=art.locator('[data-km-rig-part="mouth"] path').first();
    const mouthShape=async()=>({d:await mouth.getAttribute("d"),
      height:await mouth.evaluate(node=>(node as SVGPathElement).getBBox().height)});
    await pick("Motions","talk");
    await seek(20);
    const closed=await mouthShape();
    await seek(70);
    const speaking=await mouthShape();
    expect(speaking.height,"the mouth opens on speech").toBeGreaterThan(closed.height*2);
    const shoe=art.locator('[data-km-rig-part="shoe-f"]').first();
    const stance=()=>shoe.getAttribute("transform");
    const standing=await stance();
    await pick("Motions","walk");
    await seek(70);
    const step=await stance();
    expect(step).not.toBe(standing);
    expect((await mouthShape()).d,"a walker is not speaking").toBe(closed.d);
    await seek(84);
    expect(await stance()).not.toBe(step);
    await pick("Motions","run");
    await seek(70);
    expect(await stance(),"another gait, another step").not.toBe(step);
    // The same cue and frame return the same performance.
    await pick("Motions","talk");
    await seek(70);
    expect(await mouthShape()).toEqual(speaking);
    expect(await stance()).toBe(standing);
  });

  test("rigged heron seeks and accepts new material and motion values",async({page})=>{
    await page.goto("/iframe.html?id=film-art-watercolour-art-director--heron-wetland-film&viewMode=story");
    await expect(page.getByRole("heading",{name:"A heron at the edge of the marsh"})).toBeVisible();
    const art=page.locator("svg[data-km-watercolour-illustration]");
    await page.getByRole("button",{name:"Frame 190",exact:true}).click();
    await expect(art).toHaveAttribute("data-km-watercolour-illustration-frame","190");
    const neck=art.locator('[data-km-watercolour-part="neck-and-head"]');
    const authored=await neck.getAttribute("transform");
    expect(authored).toContain("rotate(");
    await page.getByText(/Art-directed scene graph.*advanced JSON editor/).click();
    const input=page.getByRole("textbox",{name:"Scene configuration (JSON)"});
    type Part={id:string;keys?:{frame:number;rotation:number}[];children?:Part[]};
    const spec=JSON.parse(await input.inputValue()) as {paper:{tooth:number;color:string};parts:Part[]};
    const find=(parts:Part[]):Part|undefined=>parts.flatMap(part=>
      part.id==="neck-and-head"?[part]:[find(part.children??[])]).find(Boolean);
    const joint=find(spec.parts)!;
    expect(joint.keys!.length).toBeGreaterThan(3);
    const apply=async()=>{
      await input.fill(JSON.stringify(spec));
      await page.getByRole("button",{name:"Apply validated JSON"}).click();
    };
    spec.paper.tooth=2;
    await apply();
    await expect(page.getByRole("alert")).toContainText(/paper/i);
    expect(await neck.getAttribute("transform")).toBe(authored);
    spec.paper.tooth=.3;
    spec.paper.color="#EFE6D2";
    for(const key of joint.keys!)key.rotation+=5;
    await apply();
    await expect(page.getByRole("alert")).toHaveCount(0);
    await expect(neck).not.toHaveAttribute("transform",authored!);
    await expect(art.locator('[fill="#EFE6D2"]').first()).toBeAttached();
    await page.getByRole("button",{name:"Reset this preset"}).click();
    await expect(neck).toHaveAttribute("transform",authored!);
    await expect(art.locator('[fill="#EFE6D2"]')).toHaveCount(0);
  });
});
