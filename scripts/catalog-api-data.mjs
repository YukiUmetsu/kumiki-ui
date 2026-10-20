/**
 * Offline TypeScript API introspection for source-distributed Kumiki registry packs.
 * The TypeScript checker is the source of truth; no component code is evaluated.
 * This is Node-only tooling, not a runtime/browser dependency.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const relative = file => path.relative(ROOT, file).split(path.sep).join("/");
const local = file => !relative(file).startsWith("..") && !path.isAbsolute(relative(file));
const registryLocal = file => local(file) && relative(file).startsWith("registry/");
const cut = (value, max = 900) => {
  if (value.length <= max) return { value, truncated: false };
  return { value: value.slice(0, max) + "…", truncated: true };
};
const unwrap = node => {
  let item = node;
  while (item && (ts.isAsExpression(item) || ts.isSatisfiesExpression(item) ||
    ts.isParenthesizedExpression(item) || ts.isNonNullExpression(item))) item = item.expression;
  return item;
};
function literal(node) {
  const v = unwrap(node);
  if (!v) return undefined;
  if (ts.isStringLiteral(v) || ts.isNoSubstitutionTemplateLiteral(v)) return v.text;
  if (ts.isNumericLiteral(v)) return Number(v.text);
  if (v.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (v.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (v.kind === ts.SyntaxKind.NullKeyword) return null;
  if (ts.isPrefixUnaryExpression(v) && v.operator === ts.SyntaxKind.MinusToken &&
    ts.isNumericLiteral(v.operand)) return -Number(v.operand.text);
  return undefined; // Dynamic expressions are intentionally not guessed.
}
function declaredDefaults(declaration) {
  let fn = declaration;
  if (ts.isVariableDeclaration(fn)) fn = unwrap(fn.initializer);
  // Most forwardRef/memo declarations wrap a function in one or two calls.
  for (let i = 0; i < 3 && fn && ts.isCallExpression(fn); i++) {
    fn = unwrap(fn.arguments.find(arg => ts.isFunctionExpression(unwrap(arg)) ||
      ts.isArrowFunction(unwrap(arg)) || ts.isCallExpression(unwrap(arg))));
  }
  if (!fn || !(ts.isArrowFunction(fn) || ts.isFunctionExpression(fn) ||
    ts.isFunctionDeclaration(fn))) return {};
  const first = fn.parameters[0]?.name;
  if (!first || !ts.isObjectBindingPattern(first)) return {};
  const defaults = {};
  for (const el of first.elements) {
    const key = el.propertyName ?? el.name;
    if (!ts.isIdentifier(key) && !ts.isStringLiteral(key)) continue;
    if (!el.initializer) continue;
    const value = literal(el.initializer);
    if (value !== undefined) defaults[key.text] = value;
  }
  return defaults;
}
const comments = (symbol, checker) => ts.displayPartsToString(symbol.getDocumentationComment(checker)).trim();
function defaultTag(symbol) {
  const tag = symbol.getJsDocTags().find(t => t.name === "default" || t.name === "defaultValue");
  return tag?.text ? (typeof tag.text === "string" ? tag.text :
    ts.displayPartsToString(tag.text)).trim() : undefined;
}
function propertyList(type, checker, node, defaults = {}) {
  if (!type || !node) return { properties: [], inheritedPropertiesOmitted: 0 };
  const all = checker.getPropertiesOfType(type);
  const properties = [];
  let omitted = 0;
  for (const property of all) {
    const declarations = property.getDeclarations() ?? [];
    if (!declarations.some(d => registryLocal(d.getSourceFile().fileName))) {
      omitted++; // Usually React DOM or third-party inherited props.
      continue;
    }
    const context = declarations[0] ?? node;
    const kind = checker.getTypeOfSymbolAtLocation(property, context);
    const rendered = cut(checker.typeToString(kind, context,
      ts.TypeFormatFlags.NoTruncation), 750);
    const p = {
      name: property.getName(),
      type: rendered.value,
      required: !(property.flags & ts.SymbolFlags.Optional),
      source: relative(context.getSourceFile().fileName),
    };
    if (rendered.truncated) p.typeTruncated = true;
    const doc = comments(property, checker);
    if (doc) p.description = cut(doc, 360).value;
    if (Object.hasOwn(defaults, p.name)) p.default = defaults[p.name];
    const documentedDefault = defaultTag(property);
    if (documentedDefault && !Object.hasOwn(defaults, p.name))
      p.documentedDefault = documentedDefault;
    properties.push(p);
  }
  return { properties: properties.sort((a, b) => a.name.localeCompare(b.name, "en")),
    inheritedPropertiesOmitted: omitted };
}
function symbolInfo(symbol, name, checker, fallback) {
  const resolved = symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
  const declaration = resolved.valueDeclaration ?? resolved.declarations?.[0] ?? fallback;
  const source = relative(declaration.getSourceFile().fileName);
  const base = { name, source };
  const documentation = comments(resolved, checker);
  if (documentation) base.description = cut(documentation, 450).value;
  if (resolved.flags & (ts.SymbolFlags.Interface | ts.SymbolFlags.TypeAlias |
    ts.SymbolFlags.Enum | ts.SymbolFlags.TypeParameter)) {
    const declarationType = checker.getDeclaredTypeOfSymbol(resolved);
    const decl = resolved.declarations?.find(d => ts.isTypeAliasDeclaration(d) ||
      ts.isInterfaceDeclaration(d)) ?? declaration;
    const text = ts.isTypeAliasDeclaration(decl) ? decl.type.getText() :
      checker.typeToString(declarationType, decl, ts.TypeFormatFlags.NoTruncation);
    const trimmed = cut(text, 900);
    return { ...base, kind: "type", declaration: trimmed.value,
      ...(trimmed.truncated ? { declarationTruncated: true } : {}),
      ...propertyList(declarationType, checker, decl) };
  }
  const type = checker.getTypeOfSymbolAtLocation(resolved, declaration);
  const signatures = checker.getSignaturesOfType(type, ts.SignatureKind.Call);
  if (!signatures.length) {
    const rendered = cut(checker.typeToString(type, declaration,
      ts.TypeFormatFlags.NoTruncation), 900);
    return { ...base, kind: "value", type: rendered.value,
      ...(rendered.truncated ? { typeTruncated: true } : {}) };
  }
  const component = /^[A-Z]/.test(name) && source.endsWith(".tsx");
  const signaturesOut = signatures.slice(0, 6).map(signature => {
    const args = signature.getParameters().map(parameter => {
      const decl = parameter.valueDeclaration ?? declaration;
      const paramType = checker.getTypeOfSymbolAtLocation(parameter, decl);
      const formatted = cut(checker.typeToString(paramType, decl,
        ts.TypeFormatFlags.NoTruncation), 900);
      return { name: parameter.getName(), type: formatted.value,
        required: !(parameter.flags & ts.SymbolFlags.Optional) &&
          !parameter.declarations?.some(d => d.dotDotDotToken || d.questionToken || d.initializer),
        ...(formatted.truncated ? { typeTruncated: true } : {}) };
    });
    const ret = cut(checker.typeToString(checker.getReturnTypeOfSignature(signature),
      declaration, ts.TypeFormatFlags.NoTruncation), 750);
    return { parameters: args, returns: ret.value,
      ...(ret.truncated ? { returnTypeTruncated: true } : {}) };
  });
  const result = { ...base, kind: component ? "component" : "function",
    signatures: signaturesOut, totalSignatures: signatures.length };
  if (component) {
    const signature = signatures[0];
    const props = signature.getParameters()[0];
    if (props) {
      const node = props.valueDeclaration ?? declaration;
      const propsType = checker.getTypeOfSymbolAtLocation(props, node);
      const typeName = cut(checker.typeToString(propsType, node,
        ts.TypeFormatFlags.NoTruncation), 700);
      result.propsType = typeName.value;
      if (typeName.truncated) result.propsTypeTruncated = true;
      Object.assign(result, propertyList(propsType, checker, node,
        declaredDefaults(declaration)));
    }
  }
  if (signatures.length > signaturesOut.length) result.signaturesTruncated = true;
  return result;
}
function programFor(sources) {
  const configPath = path.join(ROOT, "tsconfig.json");
  const config = ts.readConfigFile(configPath, ts.sys.readFile);
  if (config.error) throw Error(ts.flattenDiagnosticMessageText(config.error.messageText, "\n"));
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, ROOT);
  if (parsed.errors.length) throw Error(parsed.errors.map(d =>
    ts.flattenDiagnosticMessageText(d.messageText, "\n")).join("; "));
  return ts.createProgram({
    rootNames: sources.map(file => path.join(ROOT, file)),
    options: parsed.options,
  });
}
/**
 * Inspect one *existing catalog entry*. Object/hero entries expose their
 * containing installable pack's public exports, never fabricated object APIs.
 */
export function inspectCatalogApi(entry, { exportName } = {}) {
  if (!entry?.id || !entry.registryItem || !Array.isArray(entry.files))
    throw Error("Expected an existing indexed catalog entry.");
  const files = [...new Set(entry.files)].filter(f => /^registry\/.*\.tsx?$/.test(f));
  for (const file of files)
    if (!fs.existsSync(path.join(ROOT, file))) throw Error("Registry source missing: " + file);
  const result = {
    schemaVersion: 1,
    id: entry.id,
    registryItem: entry.registryItem,
    apiScope: "registry-pack",
    sources: files,
    installOrder: entry.installOrder,
    dependencies: entry.dependencies,
    exports: [],
  };
  if (entry.type !== "pack") result.note =
    "This entry is an object/hero. Showing containing registry pack exports, not a per-object API.";
  if (!files.length) {
    result.status = "no-typescript-source";
    return result;
  }
  const program = programFor(files);
  const errors = ts.getPreEmitDiagnostics(program).filter(d =>
    d.category === ts.DiagnosticCategory.Error &&
    (!d.file || files.includes(relative(d.file.fileName))));
  if (errors.length) throw Error("TypeScript API could not be verified: " +
    errors.slice(0, 5).map(d => ts.flattenDiagnosticMessageText(d.messageText, " ")).join("; "));
  const checker = program.getTypeChecker();
  const found = new Map();
  for (const file of files) {
    const source = program.getSourceFile(path.join(ROOT, file));
    if (!source) throw Error("TypeScript did not load " + file);
    const moduleSymbol = checker.getSymbolAtLocation(source);
    if (!moduleSymbol) continue;
    for (const symbol of checker.getExportsOfModule(moduleSymbol)) {
      const name = symbol.getName();
      const resolved = symbol.flags & ts.SymbolFlags.Alias ?
        checker.getAliasedSymbol(symbol) : symbol;
      const declaration = resolved.valueDeclaration ?? resolved.declarations?.[0];
      if (!declaration || !registryLocal(declaration.getSourceFile().fileName)) continue;
      const prior = found.get(name);
      if (prior && prior.resolved !== resolved)
        throw Error("Ambiguous export '" + name + "' across registry pack " + entry.registryItem);
      if (!prior) found.set(name, { symbol, resolved, source });
    }
  }
  if (exportName && !found.has(exportName))
    throw Error("Export '" + exportName + "' not found in " + entry.registryItem +
      ". Available: " + [...found.keys()].sort().join(", "));
  const selected = exportName ? [exportName] : [...found.keys()].sort((a, b) =>
    a === "default" ? 1 : b === "default" ? -1 : a.localeCompare(b, "en"));
  for (const name of selected) {
    const { symbol, resolved, source } = found.get(name);
    const named = [...found].find(([other, value]) => other !== "default" &&
      other !== name && value.resolved === resolved)?.[0];
    if (name === "default" && named)
      result.exports.push({ name: "default", kind: "alias", aliasOf: named,
        source: relative((resolved.valueDeclaration ??
          resolved.declarations?.[0] ?? source).getSourceFile().fileName) });
    else result.exports.push(symbolInfo(symbol, name, checker, source));
  }
  result.status = "verified";
  return result;
}
