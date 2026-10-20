import { describe,expect,it } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { componentCatalog } from "../src/catalog/catalog-sources";
import { ComponentCatalog } from "../src/catalog/component-catalog";
import { buildCatalog, catalogStoryUrl, searchCatalog } from "../src/catalog/catalog-core";
import type { CatalogSources } from "../src/catalog/catalog-core";
import registry from "../registry.json";
import { FINANCE_OBJECTS } from "../registry/domains/finance-object-model";
import { BUSINESS_OBJECTS } from "../registry/domains/business-object-model";
import { TECHNOLOGY_OBJECTS } from "../registry/domains/technology-object-model";

describe("one truthful catalog for developer UI and agents",()=>{
  it("indexes every source-distributed pack and every typed domain kind by rendering mode",()=>{
    expect(componentCatalog.filter(e=>e.type==="pack")).toHaveLength(registry.items.length);
    expect(componentCatalog.filter(e=>e.type==="object"&&e.domain==="finance"))
      .toHaveLength(FINANCE_OBJECTS.length*2);
    expect(componentCatalog.filter(e=>e.type==="object"&&e.domain==="business"))
      .toHaveLength(BUSINESS_OBJECTS.length);
    expect(componentCatalog.filter(e=>e.type==="object"&&e.domain==="technology"))
      .toHaveLength(TECHNOLOGY_OBJECTS.length);
    expect(new Set(componentCatalog.map(e=>e.id)).size).toBe(componentCatalog.length);
  });
  it("returns correct source-backed 2D / 3D ATM results with true dependency closure",()=>{
    const results=searchCatalog(componentCatalog,{query:"cash machine",type:"object"});
    const atm=results.filter(e=>e.name==="atm");
    expect(atm).toHaveLength(2);
    expect(atm.map(e=>e.renderer).sort()).toEqual(["svg","three"]);
    const svg=atm.find(e=>e.renderer==="svg")!;
    expect(svg.registryItem).toBe("domain-finance-objects-2d");
    expect(svg.installOrder).toContain("domain-illustration-2d");
    expect(svg.installOrder.at(-1)).toBe(svg.registryItem);
    expect(svg.dependencies).not.toContain("three");
    const three=atm.find(e=>e.renderer==="three")!;
    expect(three.registryItem).toBe("domain-finance-objects-3d");
    expect(three.installOrder).toContain("domain-finance-hero-3d");
    expect(three.dependencies).toContain("three");
    expect(three.review).toBe("not-reviewed");
  });
  it("discovers charts, hero scenes, subscriptions, and UI with predictable filters",()=>{
    expect(searchCatalog(componentCatalog,{query:"cheque",domain:"finance"})
      .some(e=>e.name==="bank-check")).toBe(true);
    expect(searchCatalog(componentCatalog,{query:"org chart",type:"object"})
      .some(e=>e.name==="org-chart")).toBe(true);
    expect(searchCatalog(componentCatalog,{query:"money bag",type:"hero"})
      .some(e=>e.name==="money-bag")).toBe(true);
    expect(searchCatalog(componentCatalog,{query:"video export",type:"pack"})
      .some(e=>e.name==="video-export-stage")).toBe(true);
    expect(searchCatalog(componentCatalog,{query:"button",domain:"ui",type:"pack"})
      .some(e=>e.name==="button")).toBe(true);
  });
  it("doesn't fabricate Storybook entry points, returns a stable query",()=>{
    const atm=componentCatalog.find(e=>e.id==="object:finance:atm:3d")!;
    expect(catalogStoryUrl(atm)).toContain("id=domains-finance-objects--bank-3-d");
    expect(catalogStoryUrl(atm)).toContain("kmAsset=atm");
    const input=componentCatalog.find(e=>e.id==="pack:input")!;
    expect(catalogStoryUrl(input)).toBe(null);
  });
  it("doesn't silently introduce unknown or cyclic registry dependencies",()=>{
    const sample:CatalogSources={
      items:[{name:"a",title:"A",description:"A",files:[{path:"registry/ui/a.tsx",target:"components/ui/a.tsx"}],
        registryDependencies:["b"]},
        {name:"b",title:"B",description:"B",files:[{path:"registry/ui/b.tsx",target:"components/ui/b.tsx"}],
          registryDependencies:["a"]}],
      vocabularies:{finance:[],business:[],technology:[]},heroes:[],
    };
    expect(()=>buildCatalog(sample)).toThrow(/cycle/);
  });
  it("keeps the catalog browsing UI keyboard-searchable without loading WebGL",()=>{
    render(<ComponentCatalog/>);
    expect(screen.getByRole("heading",{name:/find the right building block/i})).toBeVisible();
    const search=screen.getByRole("searchbox");
    fireEvent.change(search,{target:{value:"cash machine"}});
    const results=screen.getByRole("region",{name:"Catalog results"});
    expect(within(results).getAllByText(/ATM/i).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/matching components/)).toBeVisible();
    fireEvent.change(screen.getByRole("combobox",{name:"Filter renderer"}),
      {target:{value:"three"}});
    const items=results.querySelectorAll("[data-km-catalog-entry]");
    expect(items.length).toBeGreaterThan(0);
    expect([...items].every(e=>e.textContent?.includes("3D"))).toBe(true);
  });
});
