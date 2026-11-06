#!/usr/bin/env node
/** Generate registry/video/film-document.schema.json from the FilmDocument type, so the types stay the only source.
 * The TypeScript checker reads the source and nothing is evaluated. --check fails if the committed file is stale.
 * npm run film:schema [-- --check]
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = path.join(ROOT, "registry/video/film-document.ts");
const TARGET = path.join(ROOT, "registry/video/film-document.schema.json");
const config = ts.parseJsonConfigFileContent(ts.readConfigFile(path.join(ROOT, "tsconfig.json"), ts.sys.readFile).config, ts.sys, ROOT);
const program = ts.createProgram({ rootNames: [SOURCE], options: { ...config.options, noEmit: true } });
const checker = program.getTypeChecker();
const module = checker.getSymbolAtLocation(program.getSourceFile(SOURCE));
const symbol = checker.getExportsOfModule(module).find(item => item.getName() === "FilmDocument");
if (!symbol) throw Error("FilmDocument is not exported from " + SOURCE);

const defs = {}, names = new Map(), taken = new Map();
/** One def name for each named type, in traversal order, so the output is stable. */
function defName(type) {
  if (names.has(type)) return names.get(type);
  const base = (type.aliasSymbol ?? type.symbol)?.getName();
  const count = (taken.get(base) ?? 0) + 1;
  taken.set(base, count);
  const name = count === 1 ? base : base + count;
  names.set(type, name);
  return name;
}
const namedType = type => {
  const name = (type.aliasSymbol ?? type.symbol)?.getName();
  return Boolean(name) && !name.startsWith("__") && !type.aliasTypeArguments?.length && !type.typeArguments?.length;
};
const describe = symbol => ts.displayPartsToString(symbol.getDocumentationComment(checker)).replace(/\s+/g, " ").trim();
const isCallable = type => checker.getSignaturesOfType(type, ts.SignatureKind.Call).length > 0;

function convertObject(type, stack) {
  const properties = {}, required = [];
  for (const property of checker.getPropertiesOfType(type)) {
    const declaration = property.valueDeclaration ?? property.declarations?.[0];
    const propertyType = checker.getTypeOfSymbolAtLocation(property, declaration ?? program.getSourceFile(SOURCE));
    if (isCallable(propertyType)) continue;
    const key = property.getName();
    properties[key] = convert(propertyType, stack);
    const about = describe(property);
    if (about && !properties[key].$ref) properties[key] = { ...properties[key], description: about };
    if (!(property.flags & ts.SymbolFlags.Optional)) required.push(key);
  }
  const index = checker.getIndexInfoOfType(type, ts.IndexKind.String);
  return { type: "object", properties, required, additionalProperties: index ? convert(index.type, stack) : false };
}
function convertLiteral(type) {
  if (type.isStringLiteral() || type.isNumberLiteral()) return { const: type.value };
  if (type.flags & ts.TypeFlags.BooleanLiteral) return { const: checker.typeToString(type) === "true" };
  return undefined;
}
function convertUnion(type, stack) {
  const members = type.types.filter(item => !(item.flags & (ts.TypeFlags.Undefined | ts.TypeFlags.Void)));
  if (members.length === 1) return convert(members[0], stack);
  const literals = members.map(convertLiteral);
  if (literals.every(Boolean)) {
    const values = literals.map(item => item.const);
    return values.length === 2 && values.every(item => typeof item === "boolean") ? { type: "boolean" } : { enum: values };
  }
  // TypeScript splits `boolean` into its two literals inside a wider union.
  const booleans = members.filter(item => item.flags & ts.TypeFlags.BooleanLiteral);
  const rest = members.filter(item => !(item.flags & ts.TypeFlags.BooleanLiteral)).map(item => convert(item, stack));
  return { anyOf: booleans.length === 2 ? [...rest, { type: "boolean" }] : [...rest, ...booleans.map(convertLiteral)] };
}
function convertShape(type, stack) {
  if (checker.isTupleType(type)) {
    const items = checker.getTypeArguments(type).map(item => convert(item, stack));
    return { type: "array", prefixItems: items, minItems: type.target.minLength, maxItems: items.length };
  }
  if (checker.isArrayType(type)) return { type: "array", items: convert(checker.getTypeArguments(type)[0], stack) };
  return convertObject(type, stack);
}
function convert(type, stack = []) {
  if (type.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown)) return {};
  if (type.flags & ts.TypeFlags.String || type.flags & ts.TypeFlags.TemplateLiteral) return { type: "string" };
  if (type.flags & ts.TypeFlags.Number) return { type: "number" };
  if (type.flags & ts.TypeFlags.Boolean) return { type: "boolean" };
  if (type.flags & ts.TypeFlags.Null) return { type: "null" };
  const literal = convertLiteral(type);
  if (literal) return literal;
  const named = namedType(type) && !checker.isArrayType(type) && !checker.isTupleType(type);
  if (named) {
    const name = defName(type);
    if (!(name in defs)) {
      defs[name] = {};
      defs[name] = type.isUnion() ? convertUnion(type, stack) : convertShape(type, stack);
    }
    return { $ref: "#/$defs/" + name };
  }
  if (type.isUnion()) return convertUnion(type, stack);
  if (stack.includes(type)) throw Error("Anonymous recursive type: " + checker.typeToString(type));
  return convertShape(type, [...stack, type]);
}

const root = convert(checker.getDeclaredTypeOfSymbol(symbol));
const text = JSON.stringify({
  $schema: "https://json-schema.org/draft/2020-12/schema",
  title: "Kumiki FilmDocument", description: "Generated by npm run film:schema. Do not edit.", ...root, $defs: defs,
}, null, 1) + "\n";
if (process.argv.includes("--check")) {
  if (readFileSync(TARGET, "utf8") !== text) throw Error("film-document.schema.json is stale. Run npm run film:schema.");
  console.log("Film schema OK.");
} else {
  writeFileSync(TARGET, text);
  console.log("Wrote " + path.relative(ROOT, TARGET) + " (" + Math.round(text.length / 1024) + " KB, " + Object.keys(defs).length + " definitions).");
}
