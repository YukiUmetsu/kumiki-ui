/** Source parser for the local discovery CLI and parity validation.
 * Parses public declaration literals; does NOT execute 3D meshes, JSX,
 * Storybook or any code from the domain modules. Node 24 + existing TypeScript.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { buildCatalog, searchCatalog } from "../src/catalog/catalog-core.ts";
import { CATALOG_DOCS, previewsForKinds } from "../src/catalog/catalog-metadata.ts";
import { CATALOG_HERO_SUMMARIES } from "../src/catalog/catalog-hero-summaries.ts";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const read=relative=>fs.readFileSync(path.join(root,relative),"utf8");
const parse=(relative)=>ts.createSourceFile(relative,read(relative),ts.ScriptTarget.Latest,true,
  relative.endsWith(".tsx")?ts.ScriptKind.TSX:ts.ScriptKind.TS);
function literal(node){
  if(ts.isStringLiteral(node)||ts.isNoSubstitutionTemplateLiteral(node))return node.text;
  return undefined;
}
function unwrap(node){
  let v=node;
  while(v&&(ts.isAsExpression(v)||ts.isSatisfiesExpression(v)||
    ts.isParenthesizedExpression(v)))v=v.expression;
  return v;
}
function property(object,name){
  for(const prop of object.properties){
    if(!ts.isPropertyAssignment(prop))continue;
    if(prop.name.getText(object.getSourceFile()).replaceAll(/["']/g,"")===name)
      return literal(unwrap(prop.initializer));
  }
  return undefined;
}
function namedArray(file,variable){
  const source=parse(file);
  let found;
  function visit(node){
    if(ts.isVariableDeclaration(node)&&node.name.getText(source)===variable)
      found=unwrap(node.initializer);
    ts.forEachChild(node,visit);
  }
  visit(source);
  if(!found||!ts.isArrayLiteralExpression(found))
    throw Error(file+" does not declare a literal "+variable+" array.");
  return found.elements;
}
function vocabulary(file,name){
  return namedArray(file,name).map(node=>{
    if(!ts.isObjectLiteralExpression(node))throw Error(file+" must contain literal object kinds.");
    const kind=property(node,"kind"),title=property(node,"title"),archetype=property(node,"archetype");
    if(!kind||!title||!archetype)throw Error(file+" has invalid object vocabulary metadata.");
    return {kind,title,archetype};
  });
}
function financeHeroes(){
  return namedArray("registry/domains/hero-catalog.ts","entries")
    .filter(n=>ts.isCallExpression(n)&&ts.isIdentifier(n.expression)&&n.expression.text==="finance")
    .map(n=>({kind:literal(n.arguments[0]),title:literal(n.arguments[1]),
      meaning:literal(n.arguments[2]),domain:"finance"}))
    .map(n=>{
      if(!n.kind||!n.title||!n.meaning)throw Error("Hero catalog must have literal public metadata.");
      return n;
    });
}
function walk(dir){
  return fs.readdirSync(path.join(root,dir),{withFileTypes:true}).flatMap(file=>{
    const relative=path.posix.join(dir,file.name);
    if(file.isDirectory())return walk(relative);
    return relative.endsWith(".stories.tsx")||relative.endsWith(".stories.ts")?[relative]:[];
  });
}
function slug(value){
  return value.replace(/([a-z])([0-9])/g,"$1-$2")
    .replace(/([0-9])([A-Z])/g,"$1-$2")
    .replace(/([a-z])([A-Z])/g,"$1-$2")
    .toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
}
function sanitize(value){
  return value.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
}
function storyIds(){
  const output=new Map();
  for(const file of walk("src")){
    const source=parse(file);
    let title;
    for(const stmt of source.statements){
      if(!ts.isVariableStatement(stmt))continue;
      for(const d of stmt.declarationList.declarations){
        if(d.name.getText(source)!=="meta")continue;
        const v=unwrap(d.initializer);
        if(v&&ts.isObjectLiteralExpression(v))title=property(v,"title");
      }
    }
    if(!title)continue;
    for(const stmt of source.statements){
      if(!ts.isVariableStatement(stmt)||
        !stmt.modifiers?.some(m=>m.kind===ts.SyntaxKind.ExportKeyword))continue;
      for(const d of stmt.declarationList.declarations){
        if(!ts.isIdentifier(d.name)||!d.name.text||d.name.text==="meta")continue;
        // Storybook sanitizes titles as written but start-cases export names ("Bank3D" → "bank-3-d").
        const id=sanitize(title)+"--"+slug(d.name.text);
        if(output.has(id))throw Error("Duplicate Storybook ID "+id);
        output.set(id,file);
      }
    }
  }
  return output;
}
export function prepareCatalog(){
  const manifest=JSON.parse(read("registry.json"));
  const finance=vocabulary("registry/domains/finance-object-model.ts","FINANCE_OBJECTS");
  const business=vocabulary("registry/domains/business-object-model.ts","BUSINESS_OBJECTS");
  const technology=vocabulary("registry/domains/technology-object-model.ts","TECHNOLOGY_OBJECTS");
  const heroes=financeHeroes();
  const byKind=new Map(heroes.map(x=>[x.kind,x]));
  for(const expected of CATALOG_HERO_SUMMARIES){
    const actual=byKind.get(expected.kind);
    if(!actual||actual.title!==expected.title||actual.meaning!==expected.meaning)
      throw Error("Hero summary drift: "+expected.kind);
  }
  if(heroes.length!==CATALOG_HERO_SUMMARIES.length)
    throw Error("Hero summary count drift: "+heroes.length+" vs "+CATALOG_HERO_SUMMARIES.length);
  const approvalManifest=JSON.parse(read("docs/verification/hero-approvals.json"));
  if(!Array.isArray(approvalManifest.approvals))throw Error("Missing hero review ledger.");
  return buildCatalog({items:manifest.items,
    vocabularies:{finance,business,technology},heroes:CATALOG_HERO_SUMMARIES,
    approvedHeroKinds:approvalManifest.approvals.map(x=>x.kind),
    previews:previewsForKinds(finance,business,technology,CATALOG_HERO_SUMMARIES),
    docs:CATALOG_DOCS});
}
export function validateCatalog(){
  const entries=prepareCatalog(),stories=storyIds();
  const errors=[],previewErrors=[];
  const byId=new Map(entries.map(e=>[e.id,e]));
  const previews=previewsForKinds(
    vocabulary("registry/domains/finance-object-model.ts","FINANCE_OBJECTS"),
    vocabulary("registry/domains/business-object-model.ts","BUSINESS_OBJECTS"),
    vocabulary("registry/domains/technology-object-model.ts","TECHNOLOGY_OBJECTS"),
    CATALOG_HERO_SUMMARIES);
  for(const [id,info] of Object.entries(previews)){
    if(!byId.has(id))previewErrors.push("Unknown preview catalog ID: "+id);
    if(!stories.has(info.storyId))previewErrors.push("Nonexistent Storybook ID "+info.storyId+" for "+id);
  }
  errors.push(...previewErrors);
  for(const [item,doc] of Object.entries(CATALOG_DOCS)){
    if(!entries.some(e=>e.registryItem===item))errors.push("Docs map unknown pack "+item);
    if(!fs.existsSync(path.join(root,doc)))errors.push("Missing catalog docs "+doc);
  }
  for(const entry of entries){
    if(!entry.files.length)errors.push("Missing source files "+entry.id);
    for(const src of entry.files)
      if(!fs.existsSync(path.join(root,src)))errors.push("Catalog entry missing "+src);
    if(entry.installOrder.at(-1)!==entry.registryItem)
      errors.push("Invalid install closure for "+entry.id);
    if(entry.type==="object"&&entry.renderer==="three"&&entry.review!=="not-reviewed")
      errors.push("Unapproved physical 3D object: "+entry.id);
  }
  const result=searchCatalog(entries,{query:"ATM",type:"object",renderer:"three"});
  if(!result.some(e=>e.name==="atm"))errors.push("Cannot discover ATM 3D by intent.");
  const quality=searchCatalog(entries,{query:"bull market",type:"hero"});
  if(!quality.some(e=>e.name==="bull-market"))errors.push("Cannot discover semantic hero.");
  return {entries,stories,errors};
}
