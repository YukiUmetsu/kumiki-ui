import { describe, expect, it } from "vitest";
import { Box3, InstancedMesh, Mesh, MeshPhysicalMaterial, NoColorSpace, PerspectiveCamera, Raycaster, RepeatWrapping, SRGBColorSpace, Vector3 } from "three";
import { createBookHero3D, createBookOnDesk3D, evaluateBookCamera } from "../src/components/video/scene-book-3d";
import { DEMO_SCENES } from "../src/components/video/scene-template-fixtures";
import { evaluateEverydayCamera } from "../registry/video/everyday-scenes-3d";
import { surfaceDetailOf } from "../registry/craft/surface-detail";
import { createLeatherBoardReliefGeometry, leatherBoardRelief, bookToolImpression,
  createBookCoverBoardGeometry,createBookPastedownGeometry } from "../registry/craft/book-binding-geometry";
import type { EverydaySceneSpec } from "../registry/video/everyday-scenes-3d";

describe("cinematic physical book craft", () => {
  it("uses the same book lens for the public scene and the standalone hero", () => {
    for (const [width, height] of [[960, 540], [540, 960]]) {
      const spec: EverydaySceneSpec = { schemaVersion: 1, id: "book-lens", recipeId: "epic-book-storytelling",
        durationFrames: 300, fps: { num: 30, den: 1 }, width, height,
        content: { title: "Atlas", pages: [
          { heading: "A", text: "First" }, { heading: "B", text: "Second" },
        ] },
      };
      for (const frame of [0, 54, 85, 150, 299]) {
        expect(evaluateEverydayCamera(spec, frame)).toEqual(evaluateBookCamera(frame, 300, width, height));
      }
    }
  });

  it("composes the actual visible hardcover inside both film frames with meaningful screen presence", () => {
    const book = createBookOnDesk3D({...DEMO_SCENES["page-turn-story"],durationFrames:300});
    try {
      const holder = book.group.getObjectByName("item-book");
      expect(holder).toBeDefined();
      for (const [width, height] of [[960, 540], [540, 960]]) for (const frame of [0, 54, 85, 150, 299]) {
        book.pose?.({ id: "turn-pages", frame, fps: 30 });
        book.group.updateMatrixWorld(true);
        const extent = new Box3().makeEmpty();
        holder!.traverseVisible(node => { if ((node as Mesh).isMesh) extent.expandByObject(node, true); });
        const cameraPose = evaluateBookCamera(frame, 300, width, height);
        const camera = new PerspectiveCamera(cameraPose.fov, width / height, .1, 200);
        camera.position.set(...cameraPose.position);
        camera.lookAt(new Vector3(...cameraPose.target));
        camera.updateMatrixWorld(true);
        const corners = [extent.min.x, extent.max.x].flatMap(x =>
          [extent.min.y, extent.max.y].flatMap(y =>
            [extent.min.z, extent.max.z].map(z => new Vector3(x,y,z).project(camera))));
        const xs = corners.map(p => p.x), ys = corners.map(p => p.y);
        const normalizedHeight = Math.max(...ys) - Math.min(...ys);
        expect(Math.min(...xs), `${width}x${height} frame ${frame}: left`).toBeGreaterThan(-.97);
        expect(Math.max(...xs), `${width}x${height} frame ${frame}: right`).toBeLessThan(.97);
        expect(Math.min(...ys), `${width}x${height} frame ${frame}: bottom`).toBeGreaterThan(-.97);
        expect(Math.max(...ys), `${width}x${height} frame ${frame}: top`).toBeLessThan(.97);
        if (frame === 0 || frame === 299)
          expect(normalizedHeight, `${width}x${height} frame ${frame}: small book`)
            .toBeGreaterThan(height > width ? (frame === 0 ? .85 : .66) : .80);
      }
    } finally { book.dispose(); }
  });
  it("models its binding and leaf strata instead of relying on a cover box", () => {
    const book = createBookHero3D(DEMO_SCENES["page-turn-story"]);
    try {
      for (const name of ["book-leather-spine", "book-headband-head", "book-headband-tail",
        "book-gilt-raised-ribs", "book-page-signatures", "book-silk-ribbon", "cover-gilt-ornament"])
        expect(book.parts.has(name), `${name} is a physical detail`).toBe(true);
      const strata = book.parts.get("book-page-signatures") as InstancedMesh;
      expect(strata).toBeInstanceOf(InstancedMesh);
      expect(strata.count).toBeGreaterThanOrEqual(64);
      const board = book.parts.get("front-hardcover-board") as Mesh;
      expect(board.geometry.attributes.position.count).toBeGreaterThan(24);
      const spine = book.parts.get("book-leather-spine") as Mesh;
      const rightPage = book.parts.get("open-right-page") as Mesh;
      spine.geometry.computeBoundingBox();rightPage.geometry.computeBoundingBox();
      // The outer spine must not sit proud of the open sheet and look like a
      // giant gold clasp dividing both leaves in the movie.
      expect(spine.position.z + spine.geometry.boundingBox!.max.z)
        .toBeLessThan(rightPage.position.z + rightPage.geometry.boundingBox!.min.z);
    } finally { book.dispose(); }
  });

  it("has a sculpted paper gutter and an arched, solid-backed leather spine", () => {
    const book=createBookHero3D(DEMO_SCENES["page-turn-story"]);
    try {
      const right=book.parts.get("open-right-page") as Mesh;
      const position=right.geometry.attributes.position;
      const centerY=0;
      const nearest=(x:number)=>{
        let distance=Infinity,z=0;
        for(let i=0;i<position.count;i++){
          const d=Math.abs(position.getX(i)-x)+Math.abs(position.getY(i)-centerY);
          if(d<distance){distance=d;z=position.getZ(i);}
        }
        return z;
      };
      expect(nearest(.24)).toBeGreaterThan(nearest(0)+.03);
      expect(nearest(.24)).toBeGreaterThan(nearest(.95)+.025);
      const spine=book.parts.get("book-leather-spine") as Mesh;
      expect(spine.geometry.attributes.position.count).toBeGreaterThan(180);
      const band=book.parts.get("book-gilt-raised-ribs") as InstancedMesh;
      expect(band.geometry.attributes.position.count).toBeGreaterThan(180);
    } finally {book.dispose();}
  });

  it("supports its printed leaves on genuinely curved, mirrored paper strata", () => {
    const book=createBookHero3D(DEMO_SCENES["page-turn-story"]);
    try{
      const right=book.parts.get("book-page-signatures") as InstancedMesh;
      const left=book.parts.get("book-page-signatures-left") as InstancedMesh;
      const sample=(mesh:InstancedMesh,targetX:number)=>{
        const vertices=mesh.geometry.attributes.position;
        let closest=Infinity,highest=-Infinity;
        for(let i=0;i<vertices.count;i++){
          const d=Math.abs(vertices.getX(i)-targetX)+Math.abs(vertices.getY(i));
          if(d<closest-.00001){closest=d;highest=vertices.getZ(i);}
          else if(Math.abs(d-closest)<.00001)highest=Math.max(highest,vertices.getZ(i));
        }
        return highest;
      };
      // Hand-checkable shape test, independent of the geometry builder:
      // the sewn shoulder rises above both the center fold and free edge.
      // Stack geometry is centered on its instance origin; local x = world
      // distance from gutter - 0.83 (half the 1.66-wide textblock).
      expect(sample(right,-.59)-sample(right,.57)).toBeGreaterThan(.035);
      expect(sample(left,.59)-sample(left,-.57)).toBeGreaterThan(.035);
      expect(sample(right,-.59)).toBeCloseTo(sample(left,.59),4);
      // A volume, not a zero-thickness warped plane; it must cast genuine
      // edge and shoulder shadows from the low grazing-light inspection.
      expect(right.geometry.attributes.position.count).toBeGreaterThan(100);
      expect(right.geometry.index!.count).toBeGreaterThan(300);
    }finally{book.dispose();}
  });

  it("keeps the printed sheets above the paper shoulders in the actual 3D stack", () => {
    const book=createBookHero3D({...DEMO_SCENES["page-turn-story"],durationFrames:300});
    try{
      const right=book.parts.get("open-right-page") as Mesh;
      const stack=book.parts.get("book-page-signatures") as InstancedMesh;
      const ray=new Raycaster();
      // Grazing-light films amplify even a tiny collision; a small but real
      // gap is essential at the shoulder and on its falling outer slope.
      for(const frame of [55,164,299]){
        book.pose?.({id:"turn-pages",frame,fps:30});
        book.group.updateMatrixWorld(true);
        for(const x of [.12,.24,.36,.48,.7,.95,1.3,1.6]){
          ray.set(new Vector3(x,0,1),new Vector3(0,0,-1));
          const printed=ray.intersectObject(right,false)[0];
          const underlying=ray.intersectObject(stack,false)[0];
          expect(printed,`frame ${frame}, x=${x}: printed face`).toBeDefined();
          expect(underlying,`frame ${frame}, x=${x}: textblock`).toBeDefined();
          expect(printed.point.z-underlying.point.z,
            `frame ${frame}, x=${x}: stack must not pierce ink`).toBeGreaterThan(.001);
        }
      }
    }finally{book.dispose();}
  });

  it("articulates a recessed French groove with the moving leather board", () => {
    const book=createBookHero3D({...DEMO_SCENES["page-turn-story"],durationFrames:300});
    try{
      const joint=book.parts.get("book-french-groove") as Mesh|undefined;
      expect(joint,"a leather joint at the board/spine transition").toBeInstanceOf(Mesh);
      expect(joint!.parent?.name).toBe("front-cover-hinge");
      expect(joint!.geometry.attributes.position.count).toBeGreaterThan(24);
      const origin=new Vector3();
      book.pose?.({id:"turn-pages",frame:0,fps:30});
      book.group.updateMatrixWorld(true);
      joint!.getWorldPosition(origin);
      expect(origin.x).toBeGreaterThan(.06);
      book.pose?.({id:"turn-pages",frame:55,fps:30});
      book.group.updateMatrixWorld(true);
      joint!.getWorldPosition(origin);
      expect(origin.x).toBeLessThan(-.06);
    }finally{book.dispose();}
  });

  it("transfers paper strata across the fold while preserving the textblock mass and edge depth", () => {
    const book=createBookHero3D({...DEMO_SCENES["page-turn-story"],durationFrames:300});
    try {
      const right=book.parts.get("book-page-signatures") as InstancedMesh;
      const left=book.parts.get("book-page-signatures-left") as InstancedMesh;
      const leftEdge=book.parts.get("book-left-fore-edge-gilding") as Mesh;
      const rightEdge=book.parts.get("book-fore-edge-gilding") as Mesh;
      for(const frame of [55,120,164,215,299]){
        book.pose?.({id:"turn-pages",frame,fps:30});
        expect(left.count+right.count).toBe(96);
        expect(left.count).toBeGreaterThanOrEqual(0);
        expect(right.count).toBeGreaterThanOrEqual(20);
        expect(leftEdge.scale.z).toBeCloseTo(left.count*.00079,4);
        expect(rightEdge.scale.z).toBeCloseTo(right.count*.00079,4);
      }
      book.pose?.({id:"turn-pages",frame:55,fps:30});
      expect(left.count).toBe(0);
      book.pose?.({id:"turn-pages",frame:299,fps:30});
      expect(left.count).toBeGreaterThan(60);
      const final=left.count;
      book.pose?.({id:"turn-pages",frame:120,fps:30});
      book.pose?.({id:"turn-pages",frame:299,fps:30});
      expect(left.count).toBe(final);
    } finally {book.dispose();}
  });

  it("shows the cover pastedown only until the first printed leaf has settled", () => {
    const book=createBookHero3D({...DEMO_SCENES["page-turn-story"],durationFrames:300});
    try {
      const left=book.parts.get("open-left-page") as Mesh;
      const pastedown=book.parts.get("cloth-bound-endpaper") as Mesh;
      const hinge=book.parts.get("front-cover-hinge");
      expect(pastedown.parent).toBe(hinge);
      expect(left.parent).toBe(book.group);
      expect(left.material).not.toBe(pastedown.material);
      const leftStack=book.parts.get("book-page-signatures-left") as InstancedMesh;
      for(const frame of [0,34,55,60,85,120,155]){
        book.pose?.({id:"turn-pages",frame,fps:30});
        expect(left.visible,`frame ${frame}: no duplicate pastedown or floating left sheet`).toBe(false);
        if(frame<=55)expect(leftStack.count).toBe(0);
      }
      book.pose?.({id:"turn-pages",frame:164,fps:30});
      expect(left.visible).toBe(true);
      expect(left.material).not.toBe(pastedown.material);
      book.pose?.({id:"turn-pages",frame:299,fps:30});
      expect(left.visible).toBe(true);
      book.pose?.({id:"turn-pages",frame:60,fps:30});
      expect(left.visible).toBe(false);
    }finally{book.dispose();}
  });

  it("creates softly cambered boards and die-cut, UV-correct pastedowns",()=>{
    const board=createBookCoverBoardGeometry(1.87,2.59,.14);
    const pastedown=createBookPastedownGeometry(1.635,2.29);
    try{
      expect(board.attributes.position.count).toBeGreaterThan(100);
      // RoundedBoxGeometry does not guarantee vertices at arbitrary
      // intermediate X samples. Its back face is cambered inward more than
      // the edge: compare the actual mesh bounds, not guessed sample points.
      board.computeBoundingBox();
      expect(board.boundingBox).not.toBeNull();
      expect(board.boundingBox!.min.z).toBeLessThan(-.072);
      expect(board.boundingBox!.max.z).toBeGreaterThan(.069);
      const uv=pastedown.attributes.uv;
      for(let i=0;i<uv.count;i++){
        expect(uv.getX(i)).toBeGreaterThanOrEqual(-.001);
        expect(uv.getX(i)).toBeLessThanOrEqual(1.001);
        expect(uv.getY(i)).toBeGreaterThanOrEqual(-.001);
        expect(uv.getY(i)).toBeLessThanOrEqual(1.001);
      }
      expect(pastedown.attributes.position.count).toBeGreaterThan(20);
      expect(()=>createBookCoverBoardGeometry(1,1,0)).toThrow();
    }finally{board.dispose();pastedown.dispose();}
  });

  it("gives the visible leather, tooling and page edges distinct physical surfaces", () => {
    const book = createBookHero3D(DEMO_SCENES["page-turn-story"]);
    try {
      const foilHorizontal = book.parts.get("cover-foil-horizontal") as InstancedMesh;
      const foilVertical = book.parts.get("cover-foil-vertical") as InstancedMesh;
      expect(foilHorizontal).toBeInstanceOf(InstancedMesh);
      expect(foilVertical).toBeInstanceOf(InstancedMesh);
      expect(foilHorizontal.count).toBe(4);
      expect(foilVertical.count).toBe(4);
      const coverPrint = book.parts.get("embossed-cover-print") as Mesh;
      expect(surfaceDetailOf(coverPrint.material as MeshPhysicalMaterial)?.kind).toBe("fabric");
      for(const name of ["book-fore-edge-gilding", "book-head-edge-gilding", "book-tail-edge-gilding"]){
        const edge = book.parts.get(name) as Mesh;
        expect(edge).toBeInstanceOf(Mesh);
        expect((edge.material as MeshPhysicalMaterial).roughness).toBeGreaterThan(.6);
        expect((edge.material as MeshPhysicalMaterial).metalness).toBeLessThan(.4);
      }
    } finally { book.dispose(); }
  });

  it("uses bundled photograph maps for the calf binding, lacquered walnut and mat when decoded", () => {
    const source=document.createElement("img");
    const trio=[source,source,source] as const;
    const photoBook=createBookOnDesk3D(DEMO_SCENES["page-turn-story"],undefined,undefined,
      {calf:trio,walnut:trio,mat:trio,paper:trio});
    try{
      const get=(name:string)=>{
        const node=photoBook.group.getObjectByName(name);
        expect(node,`${name} exists`).toBeInstanceOf(Mesh);
        return (node as Mesh).material as MeshPhysicalMaterial;
      };
      for(const name of ["front-hardcover-board","embossed-cover-print",
        "desk-walnut-top","desk-leather-mat"]){
        const material=get(name);
        expect(material.map,`${name} gets photographic albedo`).toBeTruthy();
        expect(material.normalMap,`${name} gets photographed surface relief`).toBeTruthy();
        expect(material.roughnessMap,`${name} gets scan-derived roughness`).toBeTruthy();
        expect(material.map!.colorSpace).toBe(SRGBColorSpace);
        expect(material.normalMap!.colorSpace).not.toBe(SRGBColorSpace);
      }
      const foil=get("cover-metallic-foil-stamp");
      expect(foil.metalness).toBeGreaterThan(.7);
      expect(foil.transparent).toBe(true);
      expect(foil.alphaTest).toBeGreaterThan(0);
      for(const name of ["book-fore-edge-gilding","book-head-edge-gilding"]){
        const edge=get(name);
        expect(edge.map,`${name}: photographed cut paper`).toBeTruthy();
        expect(edge.normalMap,`${name}: page-fibre grooves`).toBeTruthy();
        expect(edge.roughnessMap,`${name}: paper roughness`).toBeTruthy();
        expect(edge.map!.colorSpace).toBe(SRGBColorSpace);
      }
    }finally{photoBook.dispose();}
  });

  it("finishes the exterior as scaled calf, separately burnished spine and localized cover patina", () => {
    const image=document.createElement("img");
    const trio=[image,image,image] as const;
    const scene=createBookOnDesk3D(DEMO_SCENES["page-turn-story"],undefined,undefined,
      {calf:trio,walnut:trio,mat:trio,paper:trio});
    try{
      const get=(name:string)=>(scene.group.getObjectByName(name) as Mesh).material as MeshPhysicalMaterial;
      const board=get("front-hardcover-board");
      const spine=get("book-leather-spine");
      const cover=get("embossed-cover-print");
      // The photos are applied to the physical board, not painted again
      // inside a separate opaque and visibly rectangular title panel.
      expect(cover.transparent).toBe(true);
      expect(cover.depthWrite).toBe(false);
      expect(cover.alphaTest).toBeGreaterThan(0);
      expect(board.map?.wrapS).toBe(RepeatWrapping);
      expect(board.normalMap?.repeat.x).toBeGreaterThan(1.4);
      expect(board.roughnessMap?.repeat.y).toBeGreaterThan(1.4);
      expect(spine).not.toBe(board);
      expect(spine.roughness).toBeLessThan(board.roughness);
      expect(cover.roughnessMap).toBeDefined();
      expect(cover.roughnessMap).not.toBe(board.roughnessMap);
      expect(cover.roughnessMap?.colorSpace).toBe(NoColorSpace);
      expect(scene.group.getObjectByName("book-leather-turn-in")).toBeDefined();
    }finally{scene.dispose();}
  });

  it("resolves desk wood at furniture scale and stitches the blotter with small saddle passes", () => {
    const image=document.createElement("img");
    const trio=[image,image,image] as const;
    const scene=createBookOnDesk3D(DEMO_SCENES["page-turn-story"],undefined,undefined,
      {calf:trio,walnut:trio,mat:trio,paper:trio});
    try{
      const desk=scene.group.getObjectByName("desk-walnut-top") as Mesh;
      const wood=desk.material as MeshPhysicalMaterial;
      expect(wood.map?.wrapS).toBe(RepeatWrapping);
      expect(wood.map?.repeat.x).toBeGreaterThan(1.5);
      expect(wood.normalMap?.repeat.y).toBeGreaterThan(1.2);
      const original=scene.group.getObjectByName("desk-mat-stitching") as InstancedMesh;
      const stitch=scene.group.getObjectByName("desk-mat-saddle-stitches") as InstancedMesh;
      expect(original.visible).toBe(false);
      expect(stitch).toBeInstanceOf(InstancedMesh);
      expect(stitch.count).toBeGreaterThan(230);
      stitch.geometry.computeBoundingBox();
      expect(stitch.geometry.boundingBox!.max.x).toBeLessThan(.07);
    }finally{scene.dispose();}
  });



  it("aligns impressed gilt lines to measured cover art rather than floating frame geometry",()=>{
    const w=1.57,h=2.20;
    const borderX=(45/1024-.5)*w;
    const borderY=0;
    const blankX=.25*w;
    expect(bookToolImpression(borderX,borderY,w,h)).toBeGreaterThan(.0012);
    expect(bookToolImpression(blankX,borderY,w,h)).toBeLessThan(.00001);
    const compassY=-(.525-.5)*h;
    const compassX=117/1024*w;
    expect(bookToolImpression(compassX,compassY,w,h)).toBeGreaterThan(.0004);
    const lowered=leatherBoardRelief(borderX,borderY,w,h);
    const untouched=leatherBoardRelief(blankX,borderY,w,h);
    expect(lowered).toBeLessThan(untouched-.0007);
    expect(()=>bookToolImpression(0,0,w,0)).toThrow();
  });

  it("sculpts leather compression near the binding joint with bounded repeatable relief",()=>{
    const width=1.57,height=2.20;
    const geo=createLeatherBoardReliefGeometry(width,height);
    try{
      expect(geo.attributes.position.count).toBeGreaterThan(70000);
      const hinge=leatherBoardRelief(-width*.445,0,width,height);
      const center=leatherBoardRelief(0,0,width,height);
      expect(hinge).toBeLessThan(center-.0007);
      const points=geo.attributes.position;
      let min=Infinity,max=-Infinity;
      for(let i=0;i<points.count;i++){
        const z=points.getZ(i);
        expect(Number.isFinite(z)).toBe(true);
        min=Math.min(min,z);max=Math.max(max,z);
      }
      expect(max-min).toBeGreaterThan(.001);
      expect(max).toBeLessThan(.003);
      expect(min).toBeGreaterThan(-.004);
      expect(()=>createLeatherBoardReliefGeometry(-1,2)).toThrow();
      expect(()=>leatherBoardRelief(0,0,0,1)).toThrow();
    }finally{geo.dispose();}
  });

  it("shares the physically deformed leather mesh between the printed ink and gold foil",()=>{
    const image=document.createElement("img");
    const trio=[image,image,image] as const;
    const book=createBookOnDesk3D(DEMO_SCENES["page-turn-story"],undefined,undefined,
      {calf:trio,walnut:trio,mat:trio,paper:trio});
    try{
      const ink=book.group.getObjectByName("embossed-cover-print") as Mesh;
      const foil=book.group.getObjectByName("cover-metallic-foil-stamp") as Mesh;
      expect(ink).toBeInstanceOf(Mesh);
      expect(foil).toBeInstanceOf(Mesh);
      expect(ink.geometry).toBe(foil.geometry);
      expect(ink.geometry.attributes.position.count).toBeGreaterThan(14000);
      expect(foil.position.z-ink.position.z).toBeGreaterThan(.001);
      expect(foil.position.z-ink.position.z).toBeLessThan(.002);
      const wood=(book.group.getObjectByName("desk-walnut-top") as Mesh).material as MeshPhysicalMaterial;
      expect(wood.clearcoat).toBeGreaterThan(.1);
      expect(wood.clearcoatRoughness).toBeGreaterThan(.6);
    }finally{book.dispose();}
  });


  it("orients photographed walnut with the solid legs and builds actual stitched mat edge returns",()=>{
    const image=document.createElement("img");
    const trio=[image,image,image] as const;
    const scene=createBookOnDesk3D(DEMO_SCENES["page-turn-story"],undefined,undefined,
      {calf:trio,walnut:trio,mat:trio,paper:trio});
    try{
      const desk=scene.group.getObjectByName("desk-walnut-top") as Mesh;
      const leg=scene.group.getObjectByName("desk-heritage-tapered-walnut-leg") as Mesh;
      const deskWood=desk.material as MeshPhysicalMaterial;
      const legWood=leg.material as MeshPhysicalMaterial;
      expect(deskWood).not.toBe(legWood);
      expect(deskWood.map?.rotation).toBeCloseTo(Math.PI/2);
      expect(legWood.map?.rotation).toBe(0);
      expect(legWood.map?.repeat.y).toBeGreaterThan(1);
      expect(legWood.normalMap?.repeat).toEqual(legWood.map?.repeat);
      for(const name of ["near","far","left","right"]){
        const edge=scene.group.getObjectByName(`desk-mat-rolled-edge-${name}`) as Mesh;
        expect(edge).toBeInstanceOf(Mesh);
        expect((edge.material as MeshPhysicalMaterial).roughness).toBeGreaterThan(.8);
      }
      const holes=scene.group.getObjectByName("desk-mat-stitch-perforations") as InstancedMesh;
      const stitches=scene.group.getObjectByName("desk-mat-saddle-stitches") as InstancedMesh;
      expect(holes).toBeInstanceOf(InstancedMesh);
      expect(holes.count).toBe(stitches.count);
      for(const index of [0,1]){
        const joint=scene.group.getObjectByName(`desk-walnut-plank-joint-${index}`) as Mesh;
        expect(joint).toBeInstanceOf(Mesh);
        expect((joint.material as MeshPhysicalMaterial).opacity).toBeLessThan(.4);
      }
    }finally{scene.dispose();}
  });

  it("retains the exact bending leaf after out-of-order film seeks", () => {
    const book = createBookHero3D(DEMO_SCENES["page-turn-story"]);
    try {
      const turning = book.parts.get("turning-front-page") as Mesh;
      book.pose?.({ id: "turn-pages", frame: 54, fps: 30 });
      const first = new Float32Array(turning.geometry.attributes.position.array);
      book.pose?.({ id: "turn-pages", frame: 5, fps: 30 });
      book.pose?.({ id: "turn-pages", frame: 54, fps: 30 });
      expect(new Float32Array(turning.geometry.attributes.position.array)).toEqual(first);
    } finally { book.dispose(); }
  });

  it("keeps the turned verso and underlying next chapter continuous across the settle beat", () => {
    const film={...DEMO_SCENES["page-turn-story"],durationFrames:300};
    const book=createBookHero3D(film);
    try{
      const front=book.parts.get("turning-front-page") as Mesh;
      const rear=book.parts.get("turning-back-page") as Mesh;
      const left=book.parts.get("open-left-page") as Mesh;
      const right=book.parts.get("open-right-page") as Mesh;
      book.pose?.({id:"turn-pages",frame:150,fps:30});
      const current=(front.material as MeshPhysicalMaterial).map!;
      const verso=(rear.material as MeshPhysicalMaterial).map!;
      const next=right.material;
      expect(verso.image,"a sheet keeps its own chapter on both faces").toBe(current.image);
      expect(next,"the next sheet is already visible below the curling leaf").not.toBe(front.material);
      book.pose?.({id:"turn-pages",frame:164,fps:30});
      expect(left.material).toBe(front.material);
      expect(right.material).toBe(next);
    }finally{book.dispose();}
  });

  it("prints legible verso lettering rather than mirrored type during the turn", () => {
    const book=createBookHero3D(DEMO_SCENES["page-turn-story"]);
    try{
      const back=book.parts.get("turning-back-page") as Mesh;
      const printed=(back.material as MeshPhysicalMaterial).map!;
      const front=book.parts.get("turning-front-page") as Mesh;
      const recto=(front.material as MeshPhysicalMaterial).map!;
      expect(printed.repeat.x).toBe(-1);
      expect(printed.offset.x).toBe(1);
      expect(printed.flipY).toBe(recto.flipY);
    }finally{book.dispose();}
  });

  it("opens a single authored sheet safely without indexing a nonexistent second page", () => {
    const template = DEMO_SCENES["page-turn-story"];
    const only = { ...template, content: {
      ...template.content, pages: template.content.pages?.slice(0, 1),
    } };
    const book = createBookHero3D(only);
    try {
      const leaf = book.parts.get("turning-front-page") as Mesh;
      const right = book.parts.get("open-right-page") as Mesh;
      for(const frame of [0, 55, 120, only.durationFrames - 1]){
        book.pose?.({id:"turn-pages",frame,fps:30});
        expect(right.material).toBeDefined();
        expect(leaf.parent?.visible).toBe(false);
      }
    } finally { book.dispose(); }
  });

  it("authors independent landscape and portrait camera motion", () => {
    const base: EverydaySceneSpec = {
      schemaVersion: 1, id: "book-film", recipeId: "epic-book-storytelling",
      durationFrames: 300, fps: { num: 30, den: 1 }, width: 960, height: 540,
      content: { title: "The story", pages: [
        { heading: "First", text: "First chapter" },
        { heading: "Second", text: "Second chapter" },
        { heading: "Third", text: "Third chapter" },
      ] },
    };
    const wideStart = evaluateEverydayCamera(base, 0);
    const wideEnd = evaluateEverydayCamera(base, 299);
    const portrait = evaluateEverydayCamera({ ...base, width: 540, height: 960 }, 299);
    const portraitClosed = evaluateEverydayCamera({ ...base, width: 540, height: 960 }, 0);
    const portraitOpened = evaluateEverydayCamera({ ...base, width: 540, height: 960 }, 70);
    expect(wideEnd.position).not.toEqual(wideStart.position);
    expect(portrait.position).not.toEqual(wideEnd.position);
    expect(wideEnd.target).not.toEqual(wideStart.target);
    expect(portraitOpened.target[0]).toBeLessThan(portraitClosed.target[0]);
    expect(portraitOpened.target).toEqual(portrait.target);
  });

  it("frames the book deliberately in portrait without a jump at the opening beat", () => {
    const opening=evaluateBookCamera(0,300,540,960);
    const before=evaluateBookCamera(69,300,540,960);
    const after=evaluateBookCamera(70,300,540,960);
    const end=evaluateBookCamera(299,300,540,960);
    const wide=evaluateBookCamera(0,300,960,540);
    expect(opening.position).not.toEqual(wide.position);
    // The opening board nearly doubles the bound book's width: the portrait
    // camera pulls BACK in sync with that hinge, preserving the full spread.
    expect(end.position[2]).toBeGreaterThan(opening.position[2]);
    expect(end.target[0]).toBeLessThan(opening.target[0]);
    expect(Math.abs(after.target[0]-before.target[0])).toBeLessThan(.005);
    for(const sample of [opening,before,after,end])
      expect([...sample.position,...sample.target,sample.fov].every(Number.isFinite)).toBe(true);
  });
});
