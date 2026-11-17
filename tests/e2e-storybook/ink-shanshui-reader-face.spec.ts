import {expect,test} from "@playwright/test";

test("reader's only reworked part is a complete asymmetric face with independent eyelid/viseme art",
  async({page},info)=>{
    await page.goto("/iframe.html?id=video-ink-reader-face--three-quarter-face-study&viewMode=story");
    const drawing=page.getByTestId("reader-coded-face");
    await expect(drawing).toBeVisible();
    for(const key of ["face","hair","reader-ear","brows","eyes","mouth","pupil-left","pupil-right"]){
      await expect(drawing.locator('[data-ink-reader-part="'+key+'"]'))
        .toHaveCount(1);
    }
    await expect(drawing.locator('[data-ink-reader-part="face"] path'))
      .not.toHaveCount(0);
    await drawing.screenshot({path:info.outputPath("reader-face-three-quarter-rest.png"),
      animations:"disabled"});

    const eyes=page.getByRole("combobox",{name:"Face eyelids"});
    const pupil=drawing.locator('[data-ink-reader-part="pupil-left"]');
    await eyes.selectOption("closed");
    await expect(pupil).toHaveCount(0);
    await drawing.screenshot({path:info.outputPath("reader-face-blink-closed.png"),
      animations:"disabled"});
    await eyes.selectOption("soft");
    await expect(pupil).toHaveCount(1);

    const mouth=page.getByRole("combobox",{name:"Face mouth"});
    await mouth.selectOption("oh");
    const after=await drawing.locator('[data-ink-reader-part="mouth"] path').first()
      .getAttribute("d");
    await mouth.selectOption("rest");
    const before=await drawing.locator('[data-ink-reader-part="mouth"] path').first()
      .getAttribute("d");
    expect(before).not.toEqual(after);

    await page.getByLabel("Show portrait landmarks").check();
    await expect(drawing.locator('[data-ink-reader-landmark="exposed-ear"]'))
      .toHaveCount(1);
    await expect(drawing.locator('[data-ink-reader-landmark="chin"]'))
      .toHaveCount(1);

    const slider=page.getByRole("slider",{name:"Face craftsmanship"});
    await slider.focus();await slider.press("Home");
    await expect(slider).toHaveValue("0");
    const low=await drawing.locator('[data-ink-reader-part="hair"] path').count();
    await slider.press("End");await expect(slider).toHaveValue("1");
    await expect.poll(()=>drawing.locator('[data-ink-reader-part="hair"] path').count())
      .toBeGreaterThan(low);
    await drawing.screenshot({path:info.outputPath("reader-face-high-detail-with-points.png"),
      animations:"disabled"});
  });

test("ArtCraft 6x face study exposes live asymmetric iris, nasal planes and viseme controls",
  async({page},info)=>{
    await page.goto("/iframe.html?id=video-ink-reader-face--three-quarter-face-study&viewMode=story");
    const close=page.getByTestId("reader-anatomy-closeup");
    await expect(close).toBeVisible();
    await page.getByRole("combobox",{name:"Face eyelids"}).selectOption("open");
    for(const id of ["base-face","eye-apertures","near-iris","far-iris","lip-planes"]){
      await expect(close.locator('[data-ink-anatomy-feature="'+id+'"]'))
        .toHaveCount(1);
    }
    await expect.poll(()=>close.locator(
      '[data-ink-anatomy-feature="eye-apertures"] path').count())
      .toBeGreaterThan(8);
    await expect.poll(()=>close.locator(
      '[data-ink-anatomy-feature="near-iris"] path').count())
      .toBeGreaterThanOrEqual(3);
    await close.screenshot({animations:"disabled",
      path:info.outputPath("reader-artcraft-eye-nose-lips-open.png")});
    await page.getByRole("combobox",{name:"Face eyelids"}).selectOption("closed");
    await expect(close.locator('[data-ink-anatomy-feature="near-iris"]'))
      .toHaveCount(0);
    await expect(close.locator('[data-ink-anatomy-feature="far-iris"]'))
      .toHaveCount(0);
    await close.screenshot({animations:"disabled",
      path:info.outputPath("reader-artcraft-eye-nose-lips-closed.png")});
  });

test("the same Chinese Ink folder displays three separately drawn face identities",
  async({page},info)=>{
    await page.goto("/iframe.html?id=video-ink-reader-face--three-quarter-face-study&viewMode=story");
    const review=page.getByTestId("shanshui-portrait-lineage");
    await expect(review).toBeVisible();
    for(const scene of ["misty-hermit","river-scholar","mountain-trail"]){
      await expect(review.locator('[data-km-scene-face="'+scene+'"]'))
        .toHaveCount(1);
    }
    await expect(review.locator("[data-km-portrait-irises]")).toHaveCount(3);
    const windows=await review.locator("[data-km-scene-face]").evaluateAll(
      elements=>elements.map(el=>el.getAttribute("viewBox")),
    );
    expect(new Set(windows).size).toBeGreaterThan(1);
    // Measure topknot margin after the ORIGINAL source-fitted hair pose.
    // A group's DOM bounding box also contains flying silk beyond the face
    // crop, making it unsuitable as a crown-visibility assertion.
    const headroom=await review.locator("[data-km-scene-face]").evaluateAll(
      paintings=>paintings.map(painting=>
        Number(painting.getAttribute("data-km-camera-crown"))-
        Number(painting.getAttribute("data-km-camera-top"))),
    );
    expect(headroom.every(px=>Number.isFinite(px)&&px>=15)).toBe(true);


    await review.screenshot({animations:"disabled",
      path:info.outputPath("shanshui-three-portrait-identity-review.png")});
    await page.getByRole("combobox",{name:"Face eyelids"}).selectOption("closed");
    await expect(review.locator("[data-km-portrait-irises]")).toHaveCount(0);
    await review.screenshot({animations:"disabled",
      path:info.outputPath("shanshui-three-portrait-blink-review.png")});
  });

test("all three distinct figure faces remain in one Chinese Ink folder with live controls",
  async({page},info)=>{
    await page.goto("/iframe.html?id=video-ink-reader-face--three-faces-comparison&viewMode=story");
    const studio=page.getByTestId("shanshui-three-faces-studio");
    await expect(studio).toBeVisible();
    for(const scene of ["river-scholar","mountain-trail","misty-hermit"]){
      const face=studio.locator('[data-km-three-face-scene="'+scene+'"]');
      await expect(face).toBeVisible();
      await expect.poll(()=>face.locator('path').count()).toBeGreaterThan(18);
      await expect(face.locator('[data-km-three-face-part="eyes"]')).toHaveCount(1);
      await expect(face.locator('[data-km-three-face-part="pupil-left"]')).toHaveCount(1);
    }
    await studio.screenshot({animations:"disabled",
      path:info.outputPath("shanshui-three-face-identities-open.png")});
    await page.getByRole("combobox",{name:"Three faces eyelids"}).selectOption("closed");
    await expect(studio.locator('[data-km-three-face-part="pupil-left"]')).toHaveCount(0);
    await studio.screenshot({animations:"disabled",
      path:info.outputPath("shanshui-three-face-identities-closed.png")});
    await page.getByRole("slider",{name:"Three faces detail"}).focus();
    await page.getByRole("slider",{name:"Three faces detail"}).press("Home");
    await expect(page.getByRole("slider",{name:"Three faces detail"})).toHaveValue("0");
    await expect(studio.locator("[data-km-three-face-scene]")).toHaveCount(3);
  });

test("source teacher reference image overlays locally without committing image pixels",
  async({page})=>{
    await page.goto("/iframe.html?id=video-ink-reader-face--three-quarter-face-study&viewMode=story");
    const reference=page.getByTestId("reader-reference-face");
    await expect(reference).toBeVisible();
    // Synthetic test image only. The user's original teacher art is not copied.
    await page.getByLabel("Load scroll reader teacher image").setInputFiles({
      name:"original-test.png",mimeType:"image/png",
      buffer:Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==","base64"),
    });
    await expect(reference.locator('image[href^="blob:"]')).toHaveCount(1);
    await expect(page.getByTestId("reader-coded-face")).toBeVisible();
  });

test("ArtCraft crown macro renders nine distinct attached regions and reveals the rightward-lowered band",
  async({page},info)=>{
    await page.goto("/iframe.html?id=video-ink-reader-face--three-quarter-face-study&viewMode=story");
    const crown=page.getByTestId("reader-crown-artcraft");
    await expect(crown).toBeVisible();
    const parts=["trailing-silk","rear-tie-wing","sideburn","rear-topknot",
      "front-topknot","cap-shell","forehead-band","fold-lines","dry-ink-grain"];
    for(const name of parts){
      await expect(crown.locator('[data-km-reader-crown-region="'+name+'"]'))
        .toHaveCount(1);
    }
    await crown.screenshot({
      path:info.outputPath("reader-crown-artcraft-all-regions.png"),
      animations:"disabled",
    });
    const picker=page.getByRole("combobox",{name:"Crown structural region"});
    await picker.selectOption("forehead-band");
    await expect(crown.locator('[data-km-reader-crown-region="forehead-band"]'))
      .toHaveAttribute("opacity","1");
    await expect(crown.locator('[data-km-reader-crown-region="front-topknot"]'))
      .toHaveAttribute("opacity","0.13");
    await crown.screenshot({
      path:info.outputPath("reader-crown-artcraft-band-only.png"),
      animations:"disabled",
    });
    await picker.selectOption("all");
    const slider=page.getByRole("slider",{name:"Face craftsmanship"});
    await slider.focus();await slider.press("Home");
    await expect(slider).toHaveValue("0");
    const low=await crown.locator('path').count();
    await slider.press("End");
    await expect(slider).toHaveValue("1");
    await expect.poll(()=>crown.locator('path').count())
      .toBeGreaterThan(low);
    await crown.screenshot({
      path:info.outputPath("reader-crown-artcraft-100pct.png"),
      animations:"disabled",
    });
  });


test("ANAT1 reader facial planes preserve source identity across soft-wash and ink-bone inspection",async({page},info)=>{
  await page.goto("/iframe.html?id=video-ink-reader-face--three-quarter-face-study&viewMode=story");
  const drawing=page.getByTestId("reader-coded-face");
  const inspector=page.getByTestId("reader-face-plane-study");
  const close=page.getByTestId("reader-anatomy-closeup");
  await expect(drawing).toBeVisible();
  await expect(inspector).toBeVisible();
  const viewport=(await close.getAttribute("viewBox"))?.split(/\s+/).map(Number)??[];
  expect(viewport).toHaveLength(4);
  expect(viewport.every(Number.isFinite)).toBe(true);
  // The source 260x340 drawing is translated, scaled and pitched by the
  // production actor. Raw illustration y-coordinates are NOT valid camera
  // assertions. Confirm the original live face really fills the browser
  // frame, instead of accepting a screenshot of empty paper and chin.
  const coverage=await inspector.evaluate(svg=>{
    const canvas=svg.getBoundingClientRect();
    const fraction=(id:string)=>{
      const group=svg.querySelector(
        '[data-km-reader-anatomy-region="'+id+'"]');
      if(!group)return 0;
      const face=group.getBoundingClientRect();
      if(!face.width||!face.height)return 0;
      const w=Math.max(0,Math.min(face.right,canvas.right)-
        Math.max(face.left,canvas.left));
      const h=Math.max(0,Math.min(face.bottom,canvas.bottom)-
        Math.max(face.top,canvas.top));
      return w*h/(face.width*face.height);
    };
    return Object.fromEntries(["opaque-head","near-far-eyes","nose","lips"]
      .map(id=>[id,fraction(id)]));
  });
  for(const [region,visible] of Object.entries(coverage))
    expect(visible,region+" must actually be in frame").toBeGreaterThan(.92);
  const closeEyes=await close.locator(
    '[data-ink-anatomy-feature="eye-apertures"]')
    .evaluate(group=>{
      const root=group.closest("svg");
      if(!root)return 0;
      const rect=root.getBoundingClientRect(),eye=group.getBoundingClientRect();
      const w=Math.max(0,Math.min(eye.right,rect.right)-
        Math.max(eye.left,rect.left));
      const h=Math.max(0,Math.min(eye.bottom,rect.bottom)-
        Math.max(eye.top,rect.top));
      return w*h/Math.max(1,eye.width*eye.height);
    });
  expect(closeEyes).toBeGreaterThan(.85);
  const volume=inspector.locator('[data-km-reader-anatomy-region="wash"]');
  const nasal=inspector.locator('[data-km-reader-anatomy-region="nose"]');
  const lids=inspector.locator('[data-km-reader-anatomy-region="near-far-eyes"]');
  const lips=inspector.locator('[data-km-reader-anatomy-region="lips"]');
  expect(await volume.locator("path").count()).toBeGreaterThanOrEqual(15);
  expect(await nasal.locator("path").count()).toBeGreaterThanOrEqual(6);
  const original=await drawing.locator('[data-ink-reader-part="face"] path')
    .evaluateAll(nodes=>nodes.map(node=>node.getAttribute("d")));
  const selector=page.getByRole("combobox",{name:"Face structure review"});
  await selector.selectOption("wash");
  await expect(volume).toHaveAttribute("opacity","1");
  await expect(nasal).toHaveAttribute("opacity","0.08");
  await expect(lids).toHaveAttribute("opacity","0.08");
  await expect(lips).toHaveAttribute("opacity","0.08");
  await inspector.screenshot({animations:"disabled",
    path:info.outputPath("reader-face-ANAT1-soft-wash-planes.png")});
  await selector.selectOption("bones");
  await expect(volume).toHaveAttribute("opacity","0.08");
  await expect(nasal).toHaveAttribute("opacity","1");
  await expect(lids).toHaveAttribute("opacity","1");
  await expect(lips).toHaveAttribute("opacity","1");
  await inspector.screenshot({animations:"disabled",
    path:info.outputPath("reader-face-ANAT1-ink-bone-planes.png")});
  const opened=await lids.locator("path").count();
  await page.getByRole("combobox",{name:"Face eyelids"}).selectOption("closed");
  const closed=await lids.locator("path").count();
  expect(closed).toBeLessThan(opened);
  await page.getByRole("combobox",{name:"Face eyelids"}).selectOption("open");
  await selector.selectOption("full");
  await expect(volume).toHaveAttribute("opacity","1");
  await expect(nasal).toHaveAttribute("opacity","1");
  await page.getByLabel("Show portrait landmarks").check();
  await expect(inspector.locator("[data-km-anat1-face-point]")).toHaveCount(9);
  await inspector.screenshot({animations:"disabled",
    path:info.outputPath("reader-face-ANAT1-full-landmark-study.png")});
  expect(await drawing.locator('[data-ink-reader-part="face"] path')
    .evaluateAll(nodes=>nodes.map(node=>node.getAttribute("d"))))
    .toEqual(original);
  await expect(page.getByTestId("shanshui-portrait-lineage")
    .locator("[data-km-scene-face]")).toHaveCount(3);
});


test("ear microcamera reveals the real Y-branch antihelix, concha wash and landmarks at both detail levels",
  async({page},info)=>{
    await page.goto("/iframe.html?id=video-ink-reader-face--three-quarter-face-study&viewMode=story");
    const ear=page.getByTestId("reader-ear-native-study");
    await expect(ear).toBeVisible();
    for(const layer of ["opaque-face","hair","cartilage"]){
      await expect(ear.locator('[data-km-reader-ear-layer="'+layer+'"]'))
        .toHaveCount(1);
    }
    const cartilage=ear.locator('[data-km-reader-ear-layer="cartilage"]');
    const hi=await cartilage.locator("path").count();
    expect(hi).toBeGreaterThanOrEqual(11);
    const fold=await cartilage.locator("path").nth(2).getAttribute("d");
    expect((fold?.match(/M/g)??[]).length).toBe(3);
    const coverage=await cartilage.evaluate(group=>{
      const svg=group.closest("svg");
      if(!svg)return 0;
      const a=svg.getBoundingClientRect(),b=group.getBoundingClientRect();
      const w=Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left));
      const h=Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top));
      return w*h/Math.max(1,b.width*b.height);
    });
    expect(coverage).toBeGreaterThan(.85);
    await ear.screenshot({animations:"disabled",
      path:info.outputPath("reader-ear-ANAT1-helix-concha-full.png")});
    await page.getByLabel("Show portrait landmarks").check();
    await expect(ear.locator("[data-km-reader-ear-landmark]")).toHaveCount(2);
    await ear.screenshot({animations:"disabled",
      path:info.outputPath("reader-ear-ANAT1-source-landmarks.png")});
    const detail=page.getByRole("slider",{name:"Face craftsmanship"});
    await detail.focus();
    await detail.press("Home");
    await expect(detail).toHaveValue("0");
    const low=await cartilage.locator("path").count();
    expect(low).toBeLessThan(hi);
    await ear.screenshot({animations:"disabled",
      path:info.outputPath("reader-ear-ANAT1-minimum-detail.png")});
  });


test("source-linked Bochen multiglaze survives native 1x, isolated six-region and lower-detail comparisons",
  async({page},info)=>{
    await page.goto("/iframe.html?id=video-ink-reader-face--three-quarter-face-study&viewMode=story");
    const proof=page.getByTestId("reader-ink-glaze-comparison");
    const original=proof.locator('[data-km-ink-glaze-variant="original"]');
    const layered=proof.locator('[data-km-ink-glaze-variant="layered"]');
    await expect(proof).toBeVisible();
    await expect(original).toBeVisible();
    await expect(layered).toBeVisible();
    const oldShapes=await original.locator("[data-km-ink-glaze-base] path")
      .evaluateAll(nodes=>nodes.map(node=>node.getAttribute("d")));
    const newShapes=await layered.locator("[data-km-ink-glaze-base] path")
      .evaluateAll(nodes=>nodes.map(node=>node.getAttribute("d")));
    expect(newShapes).toEqual(oldShapes);
    // The before/after panels must retain more than an empty head fill:
    // live ear mass, malar jaw paint, philtrum and tiny pressure lines
    // are present in both, so the ArtCraft difference is truthful.
    expect(oldShapes.length).toBeGreaterThan(10);
    expect(oldShapes.some(d=>d?.startsWith(
      "M119.2 116 C121.4 120.5 124.8 123.5"))).toBe(true);
    expect(oldShapes.some(d=>d?.includes("143.3 143.7"))).toBe(true);
    const regions=layered.locator("[data-km-ink-glaze-region]");
    await expect(regions).toHaveCount(6);
    const before=await layered.locator("[data-km-ink-glaze-region] path").count();
    expect(before).toBeGreaterThanOrEqual(15);
    // This is an actual native Chromium geometry constraint: a cheek
    // painted as a long narrow ribbon passed DOM/path-count assertions.
    // Require rounded vertical anatomical depth at the real source scale.
    const cheek=await layered.locator(
      '[data-km-ink-glaze-region="malar-near"] path').first().evaluate(el=>{
      const rect=(el as SVGPathElement).getBBox();
      return {width:rect.width,height:rect.height,x:rect.x,y:rect.y};
    });
    expect(cheek.width).toBeGreaterThan(14);
    expect(cheek.height).toBeGreaterThan(cheek.width*.45);
    expect(cheek.x).toBeGreaterThan(118);
    expect(cheek.y).toBeGreaterThan(104);
    // Real Chromium pixels, not just path counters: invisible source paint
    // must FAIL the ArtCraft proof. Rasterize the original-vs-layered
    // comparison at a fixed size, with identical source camera and palette.
    const pixelDelta=await proof.evaluate(async section=>{
      const svgs=Array.from(section.querySelectorAll(
        'svg[data-km-ink-glaze-variant]')) as SVGSVGElement[];
      const render=async(svg:SVGSVGElement)=>{
        const clone=svg.cloneNode(true) as SVGSVGElement;
        clone.setAttribute("xmlns","http://www.w3.org/2000/svg");
        clone.setAttribute("width","460");
        clone.setAttribute("height","245");
        const markup=new XMLSerializer().serializeToString(clone);
        const url=URL.createObjectURL(new Blob([markup],
          {type:"image/svg+xml"}));
        try{
          const image=new Image();image.src=url;await image.decode();
          const canvas=document.createElement("canvas");
          canvas.width=460;canvas.height=245;
          const ctx=canvas.getContext("2d");
          if(!ctx)throw Error("Missing Chromium canvas");
          ctx.drawImage(image,0,0,460,245);
          return ctx.getImageData(0,0,460,245).data;
        }finally{URL.revokeObjectURL(url);}
      };
      const [oldPixels,newPixels]=await Promise.all(svgs.map(render));
      let changed=0,distance=0;
      for(let i=0;i<oldPixels.length;i+=4){
        const rgb=Math.abs(oldPixels[i]-newPixels[i])+
          Math.abs(oldPixels[i+1]-newPixels[i+1])+
          Math.abs(oldPixels[i+2]-newPixels[i+2]);
        if(rgb>12)changed++;
        distance+=rgb;
      }
      return {changed,mean:distance/(460*245*3)};
    });
    expect(pixelDelta.changed,"New washes must be visible in real SVG pixels")
      .toBeGreaterThan(40);
    expect(pixelDelta.mean,"Paint must stay translucent and locally bounded")
      .toBeLessThan(12);
    for(const id of ["orbital-near","orbital-far","nose-bridge",
      "malar-near","malar-far","sublabial"]){
      expect(await layered.locator('[data-km-ink-glaze-region="'+id+'"] path')
        .count(),id).toBeGreaterThanOrEqual(2);
    }
    await proof.screenshot({animations:"disabled",
      path:info.outputPath("reader-source-Ming-ink-glazes-all-1x.png")});
    const choose=page.getByRole("combobox",{name:"Face glaze region"});
    await choose.selectOption("nose-bridge");
    await expect(layered.locator('[data-km-ink-glaze-region="nose-bridge"]'))
      .toHaveAttribute("opacity","1");
    await expect(layered.locator('[data-km-ink-glaze-region="malar-near"]'))
      .toHaveAttribute("opacity","0.09");
    await proof.screenshot({animations:"disabled",
      path:info.outputPath("reader-source-Ming-ink-nasal-bridge-isolated.png")});
    const detail=page.getByRole("slider",{name:"Face craftsmanship"});
    await detail.focus();await detail.press("Home");
    await expect(detail).toHaveValue("0");
    const low=await layered.locator("[data-km-ink-glaze-region] path").count();
    expect(low).toBeLessThan(before);
    expect(await original.locator("[data-km-ink-glaze-base] path").count())
      .toBeLessThan(oldShapes.length);
    await page.getByRole("combobox",{name:"Face eyelids"})
      .selectOption("closed");
    await page.getByRole("combobox",{name:"Face mouth"}).selectOption("oh");
    await expect(regions).toHaveCount(6);
    await proof.screenshot({animations:"disabled",
      path:info.outputPath("reader-source-Ming-ink-minimum-detail-blink-oh.png")});
  });


test("native source malar dome and attached rounded nasal turn remain visible with live eyelid and mouth overrides",
  async({page},info)=>{
    await page.goto("/iframe.html?id=video-ink-reader-face--three-quarter-face-study&viewMode=story");
    const plane=page.getByTestId("reader-face-plane-study");
    const face=page.getByTestId("reader-coded-face");
    await expect(plane).toBeVisible();
    const wash=plane.locator('[data-km-reader-anatomy-region="wash"]');
    const paths=await wash.locator("path").evaluateAll(nodes=>
      nodes.map(node=>({
        d:node.getAttribute("d")??"",
        opacity:Number(node.getAttribute("opacity")??1),
      })));
    const malar=paths.find(x=>x.d.includes(
      "C124.9 108.7 131.7 112.7 135.2 115.7"));
    expect(malar,"original ANAT1 malar dome must retain the rounded return")
      .toBeDefined();
    expect(malar?.d).toContain(
      "C127.2 115.9 123.2 115.7 120.8 109.6 Z");
    expect(malar?.opacity).toBeLessThan(.14);
    const nose=paths.find(x=>x.d.includes(
      "C149.1 103.8 150.4 109.1 152.2 112.5"));
    expect(nose,"nose bridge belongs to the same continuous source head")
      .toBeDefined();
    expect(nose?.opacity).toBeLessThan(.2);
    expect(paths.some(x=>x.d.includes(
      "C125.6 110 132.9 113.4"))).toBe(false);
    const masseter=await face.locator('[data-ink-reader-part="face"] path')
      .evaluateAll(nodes=>nodes.find(node=>(
        node.getAttribute("d")??"").startsWith(
          "M119.2 116 C121.4 120.5 124.8 123.5"))?.getAttribute("d"));
    expect(masseter).toContain("C122 122.6 120.4 119.6 119.2 116 Z");
    await page.getByRole("combobox",{name:"Face eyelids"}).selectOption("open");
    await page.getByRole("combobox",{name:"Face mouth"}).selectOption("rest");
    await plane.screenshot({animations:"disabled",
      path:info.outputPath("reader-malar-nose-rounded-positive-ink-1x.png")});
    await page.getByRole("combobox",{name:"Face eyelids"}).selectOption("soft");
    await page.getByRole("combobox",{name:"Face mouth"}).selectOption("oh");
    await face.screenshot({animations:"disabled",
      path:info.outputPath("reader-malar-nose-soft-lids-oh-1x.png")});
    // Shape identity and anatomical relief do not depend on film viseme.
    await expect(plane.locator('[data-km-reader-anatomy-region="nose"] path'))
      .not.toHaveCount(0);
    await expect(face.locator('[data-ink-reader-part="face"] path')).not.toHaveCount(0);
  });


test("Ming face ArtCraft microscope keeps live malar and nasal wash at matched source projection",
  async({page},info)=>{
    await page.goto("/iframe.html?id=video-ink-reader-face--three-quarter-face-study&viewMode=story");
    const studio=page.getByTestId("reader-ink-malar-nose-microscope");
    await expect(studio).toBeVisible();
    await expect(studio.locator("[data-km-ink-wash-micro]")).toHaveCount(3);
    const boxes:string[]=[];
    for(const region of ["malar-near","malar-far","nose-bridge"] as const){
      const micro=studio.locator('[data-km-ink-wash-micro="'+region+'"]');
      const svg=micro.locator("svg");
      await expect(svg).toBeVisible();
      const box=await svg.getAttribute("viewBox");
      expect(box?.split(/\s+/).map(Number).every(Number.isFinite)).toBe(true);
      boxes.push(box??"");
      const paint=micro.locator('[data-km-ink-wash-native-face] path');
      expect(await paint.count()).toBeGreaterThan(25);
      await expect(micro.locator('[data-ink-reader-part="eyes"]')).toHaveCount(1);
      await expect(micro.locator('[data-ink-reader-part="pupil-left"]')).toHaveCount(1);
    }
    expect(new Set(boxes).size).toBe(3);
    await studio.screenshot({animations:"disabled",
      path:info.outputPath("reader-native-malar-nose-three-region-wet-wash-microscopy.png")});
    await page.getByRole("combobox",{name:"Face eyelids"}).selectOption("closed");
    await expect(studio.locator('[data-ink-reader-part="pupil-left"]')).toHaveCount(0);
    await page.getByRole("combobox",{name:"Face eyelids"}).selectOption("soft");
    await page.getByRole("combobox",{name:"Face mouth"}).selectOption("oh");
    await expect(studio.locator('[data-ink-reader-part="mouth"]')).toHaveCount(3);
    const detail=page.getByRole("slider",{name:"Face craftsmanship"});
    await detail.focus();
    await detail.press("Home");
    await detail.press("ArrowRight");
    await detail.press("ArrowRight");
    await expect(detail).toHaveValue("0.1");
    await expect(studio.locator('[data-km-ink-wash-native-face] path').first()).toBeVisible();
    await studio.screenshot({animations:"disabled",
      path:info.outputPath("reader-native-malar-nose-low-detail-soft-lids-oh.png")});
  });

test("ANAT1 Chinese-ink five visemes retain detailed live lip relief and visible source-fit cameras",
  async({page},info)=>{
    await page.goto("/iframe.html?id=video-ink-reader-face--three-quarter-face-study&viewMode=story");
    const atlas=page.getByTestId("reader-ink-native-viseme-atlas");
    await expect(atlas).toBeVisible();
    const mouthControl=page.getByRole("combobox",{name:"Face mouth"});
    const originals:string[]=[];
    for(const state of ["rest","aa","oh","mm","smile"] as const){
      const figure=atlas.locator('[data-km-ink-viseme-study="'+state+'"]');
      const svg=figure.locator("svg");
      const ink=figure.locator('[data-km-ink-viseme-part="'+state+'"] path');
      await expect(svg).toBeVisible();
      expect(await ink.count()).toBeGreaterThan(7);
      const originalMouth=await ink.evaluateAll(nodes=>
        nodes.map(node=>node.getAttribute("d")??"").join("|"));
      originals.push(originalMouth);
      await figure.getByRole("button",
        {name:"Inspect "+state.toUpperCase()+" mouth cel"}).click();
      await expect(mouthControl).toHaveValue(state);
      await expect(figure.getByRole("button",
        {name:"Inspect "+state.toUpperCase()+" mouth cel"}))
        .toHaveAttribute("aria-pressed","true");
      const box=await svg.getAttribute("viewBox");
      expect(box?.split(/\s+/).map(Number).every(Number.isFinite)).toBe(true);
      if(state!=="aa"&&state!=="oh")continue;
      // A paper-light lower vermilion and dark aperture must be
      // independent paths: not one oversized fully opaque sticker.
      const opening=await svg.evaluate((root,emotion)=>{
        const group=root.querySelector(
          '[data-km-ink-viseme-part="'+emotion+'"]');
        if(!group)throw Error("Missing source speech cel");
        const paths=Array.from(group.querySelectorAll("path"));
        const isInkFill=(p:Element)=>p.getAttribute("stroke")==="none";
        const alpha=(p:Element)=>Number(p.getAttribute("opacity"));
        // Use explicit pigment/material semantics instead of brittle
        // exact opacity strings. The outer mouth is faint wet ground;
        // at least two smaller interior layers form the deep fissure.
        const cavity=paths.find(p=>p.getAttribute("fill")==="#66513e"&&
          isInkFill(p)&&alpha(p)>=.16&&alpha(p)<.2);
        const inner=paths.find(p=>p.getAttribute("fill")==="#66513e"&&
          isInkFill(p)&&alpha(p)>=.25&&alpha(p)<.4);
        const center=paths.find(p=>p.getAttribute("fill")==="#937251"&&
          isInkFill(p)&&alpha(p)>=.17&&alpha(p)<.3);
        const core=paths.find(p=>p.getAttribute("fill")==="#403329"&&
          isInkFill(p)&&alpha(p)>=.2&&alpha(p)<.3);
        if(!cavity||!inner||!center||!core)
          throw Error("Missing multi-load original wet-ink speaking mouth");
        const b=(cavity as SVGPathElement).getBBox();
        const ib=(inner as SVGPathElement).getBBox();
        const cb=(center as SVGPathElement).getBBox();
        const kb=(core as SVGPathElement).getBBox();
        const matrix=(cavity as SVGPathElement).getScreenCTM();
        if(!matrix)throw Error("Detached source mouth");
        const point=new DOMPoint(b.x+b.width*.5,b.y+b.height*.5)
          .matrixTransform(matrix);
        const outer=root.getBoundingClientRect();
        return {x:(point.x-outer.left)/outer.width,
          y:(point.y-outer.top)/outer.height,
          width:b.width,height:b.height,
          innerWidth:ib.width,innerHeight:ib.height,
          deepWidth:cb.width,deepHeight:cb.height,
          trueInkCoreWidth:kb.width,trueInkCoreHeight:kb.height,
          outlineOpacity:alpha(cavity),
          fillCount:paths.filter(p=>p.getAttribute("fill")!=="none").length,
          topOpacity:Math.max(...paths
            .filter(p=>p.getAttribute("fill")!=="none")
            .map(p=>alpha(p)))};
      },state);
      expect(opening.x).toBeGreaterThan(.15);
      expect(opening.x).toBeLessThan(.85);
      expect(opening.y).toBeGreaterThan(.15);
      expect(opening.y).toBeLessThan(.85);
      expect(opening.fillCount).toBeGreaterThanOrEqual(6);
      expect(opening.topOpacity).toBeLessThan(.6);
      expect(opening.outlineOpacity).toBeLessThan(.2);
      expect(opening.innerWidth).toBeLessThan(opening.width);
      expect(opening.deepWidth).toBeLessThan(opening.innerWidth);
      expect(opening.deepHeight).toBeLessThan(opening.height);
      expect(opening.trueInkCoreWidth).toBeLessThan(opening.deepWidth);
      expect(opening.trueInkCoreHeight).toBeLessThan(opening.deepHeight);
      if(state==="oh"){
        // One true vertical /o/ slit, not a shaded pupil surrounded
        // by horizontally mirrored permanent lip-line ovals.
        expect(opening.height/opening.width).toBeGreaterThan(1.55);
        expect(opening.trueInkCoreHeight/opening.trueInkCoreWidth)
          .toBeGreaterThan(2);
      }
      expect(opening.width).toBeLessThan(state==="aa"?15:7);
      expect(opening.height).toBeLessThan(8);
    }
    expect(new Set(originals).size).toBe(5);
    await atlas.screenshot({animations:"disabled",
      path:info.outputPath("reader-native-anat1-five-speaking-visemes-ink-lip-atlas.png")});
    await mouthControl.selectOption("oh");
    await expect(atlas.getByRole("button",{name:"Inspect OH mouth cel"}))
      .toHaveAttribute("aria-pressed","true");
    await page.getByRole("slider",{name:"Face craftsmanship"}).focus();
    // All five original viseme assets, not separate dummy thumbnails,
    // must remain drawn when the common detail control changes.
    await expect(atlas.locator('[data-km-ink-viseme-part="oh"] path'))
      .not.toHaveCount(0);
  });

test("original three-quarter forehead ink carries unequal near and far frontal relief without a painted-on mask",
  async({page},info)=>{
    await page.goto("/iframe.html?id=video-ink-reader-face--three-quarter-face-study&viewMode=story");
    const study=page.getByTestId("reader-ink-frontal-relief-microscope");
    await expect(study).toBeVisible();
    const focus=[
      {id:"orbital-near",prefix:"M119.5 88.5"},
      {id:"orbital-far",prefix:"M150.8 88.4"},
    ] as const;
    const cameras:string[]=[];
    for(const {id,prefix} of focus){
      const micro=study.locator('[data-km-ink-frontal-micro="'+id+'"]');
      const svg=micro.locator("svg");
      await expect(svg).toBeVisible();
      const viewBox=await svg.getAttribute("viewBox");
      expect(viewBox?.split(/\s+/).map(Number)
        .every(Number.isFinite)).toBe(true);
      cameras.push(viewBox??"");
      await expect(micro.locator('[data-km-ink-frontal-face] path'))
        .not.toHaveCount(0);
      await expect(micro.locator('[data-ink-reader-part="hair"]')).toHaveCount(1);
      await expect(micro.locator('[data-ink-reader-part="brows"]')).toHaveCount(1);
      // Target only this source-space path, not a screenshot legend or
      // decorative copy. It must truly be inside the native viewport.
      const center=await svg.evaluate((root,starts)=>{
        const paths=Array.from(root.querySelectorAll(
          '[data-km-ink-frontal-face] path')) as SVGPathElement[];
        const path=paths.find(p=>
          (p.getAttribute("d")??"").startsWith(starts));
        if(!path)throw Error("Native frontal source pigment missing");
        const box=path.getBBox(),matrix=path.getScreenCTM();
        if(!matrix)throw Error("Detached forehead paint");
        const p=new DOMPoint(box.x+box.width/2,box.y+box.height/2)
          .matrixTransform(matrix);
        const screen=root.getBoundingClientRect();
        return {x:(p.x-screen.left)/screen.width,
          y:(p.y-screen.top)/screen.height,
          width:box.width,height:box.height,
          opacity:Number(path.getAttribute("opacity")),
          fill:path.getAttribute("fill")};
      },prefix);
      expect(center.x).toBeGreaterThan(.07);
      expect(center.x).toBeLessThan(.93);
      expect(center.y).toBeGreaterThan(.07);
      expect(center.y).toBeLessThan(.93);
      expect(center.width).toBeGreaterThan(4);
      expect(center.height).toBeGreaterThan(3);
      expect(center.opacity).toBeLessThan(.06);
      expect(center.fill).toBe("#ad8d70");
    }
    expect(new Set(cameras).size).toBe(2);
    await study.screenshot({animations:"disabled",
      path:info.outputPath("reader-native-near-far-frontal-ink-relief.png")});
    await page.getByRole("combobox",{name:"Face eyelids"}).selectOption("closed");
    await expect(study.locator('[data-ink-reader-part="pupil-left"]')).toHaveCount(0);
    await page.getByRole("combobox",{name:"Face eyelids"}).selectOption("open");
    await expect(study.locator('[data-ink-reader-part="pupil-left"]')).toHaveCount(2);
    const detail=page.getByRole("slider",{name:"Face craftsmanship"});
    await detail.focus();
    await detail.press("Home");
    await detail.press("ArrowRight");
    await detail.press("ArrowRight");
    await expect(detail).toHaveValue("0.1");
    await study.screenshot({animations:"disabled",
      path:info.outputPath("reader-native-near-far-frontal-low-detail.png")});
  });
