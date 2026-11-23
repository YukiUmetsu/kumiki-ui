#!/usr/bin/env node
/** Look up film document fields without reading the whole generated schema (490 KB).
 *   npm run -s film:fields                          the document, and the scene recipes
 *   npm run -s film:fields -- --recipe=cause-effect  what that recipe adds to a scene
 *   npm run -s film:fields -- --type=FilmTransition  one named type (several with commas)
 *   npm run -s film:fields -- --query=caption        which types have such a field
 */
import { readFileSync } from "node:fs";

const schema = JSON.parse(readFileSync(new URL("../registry/video/film-document.schema.json", import.meta.url), "utf8"));
const defs = schema.$defs, BUDGET = 4000;
const clip = (text, max) => text.length <= max ? text : text.slice(0, max - 1).trimEnd() + "…";
const name = node => node.$ref.split("/").pop();

function typeText(node, depth = 0) {
  if (node === true || !Object.keys(node).some(key => key !== "description")) return "any";
  if (node.$ref) return name(node);
  if (Object.hasOwn(node, "const")) return JSON.stringify(node.const);
  if (node.enum) return node.enum.map(value => JSON.stringify(value)).join(" | ");
  if (node.anyOf) return node.anyOf.map(item => typeText(item, depth)).join(" | ");
  if (node.prefixItems) return "[" + node.prefixItems.map(item => typeText(item, depth)).join(", ") + "]";
  if (node.type === "array") {
    const item = typeText(node.items ?? {}, depth);
    return (item.includes(" | ") ? `(${item})` : item) + "[]";
  }
  if (node.type !== "object") return String(node.type);
  if (node.additionalProperties && !Object.keys(node.properties ?? {}).length)
    return `Record<string, ${typeText(node.additionalProperties, depth)}>`;
  if (depth > 2) return "{…}";
  return "{ " + Object.entries(node.properties).map(([key, value]) =>
    key + (node.required?.includes(key) ? ": " : "?: ") + typeText(value, depth + 1)).join("; ") + " }";
}
const fields = (node, cut, skip = {}) => Object.entries(node.properties ?? {})
  .filter(([key, value]) => JSON.stringify(skip[key]) !== JSON.stringify(value))
  .map(([key, value]) => "  " + key + (node.required?.includes(key) ? ": " : "?: ") + clip(typeText(value), cut) +
    (value.description && cut > 100 ? "  // " + clip(value.description, cut) : ""));
function body(node, cut) {
  if (node.anyOf?.every(item => item.type === "object")) return node.anyOf.flatMap((item, index) => [`  — form ${index + 1}`, ...fields(item, cut)]);
  return node.type === "object" && Object.keys(node.properties ?? {}).length ? fields(node, cut) : ["  = " + clip(typeText(node), cut * 4)];
}
/** The most detail that fits: full comments, then shorter types, then a cut that says so. */
function print(make) {
  const text = [220, 140, 90].map(cut => make(cut).join("\n")).find(value => value.length <= BUDGET) ?? make(60).join("\n");
  console.log(text.length <= BUDGET ? text : clip(text, BUDGET) + "\nCut at 4 KB. Use --type= for one named type.");
}

const scenes = defs.FilmScene.anyOf.map(item => item.$ref ? defs[name(item)] : item);
const recipe = scene => scene.properties?.recipeId?.const;
/** The fields that more than half of the scenes declare the same way. */
const counts = new Map();
for (const scene of scenes) for (const [key, value] of Object.entries(scene.properties ?? {})) {
  const id = JSON.stringify([key, value]);
  counts.set(id, (counts.get(id) ?? 0) + 1);
}
const shared = { required: scenes[0].required, properties: Object.fromEntries([...counts]
  .filter(([, count]) => count * 2 > scenes.length).map(([id]) => JSON.parse(id))) };
const flags = {};
for (const arg of process.argv.slice(2)) {
  const match = /^--(type|recipe|query)=(.+)$/.exec(arg);
  if (!match) throw Error("Use --type=NAME, --recipe=ID or --query=WORD.");
  flags[match[1]] = match[2];
}
if (flags.recipe) {
  const scene = scenes.find(item => recipe(item) === flags.recipe);
  if (!scene) throw Error(`No scene recipe "${flags.recipe}". Recipes: ${scenes.map(recipe).filter(Boolean).join(", ")}.`);
  print(cut => [`scene "${flags.recipe}" adds these fields to the ones most scenes share (--type=FilmScene)`, ...fields(scene, cut, shared.properties)]);
} else if (flags.type) {
  const wanted = flags.type.split(",");
  for (const item of wanted) if (!defs[item]) throw Error(`No type "${item}". Find one with --query=.`);
  print(cut => wanted.flatMap(item => item === "FilmScene" ? ["FilmScene: fields that most scenes share; see --recipe= for the rest", ...fields(shared, cut)]
    : [item + (defs[item].description ? "  // " + clip(defs[item].description, cut) : ""), ...body(defs[item], cut)]));
} else if (flags.query) {
  const word = flags.query.toLowerCase(), hits = [];
  for (const [key, def] of Object.entries(defs)) {
    const found = new Set();
    for (const part of def.anyOf ?? [def]) for (const [field, value] of Object.entries(part.properties ?? {}))
      if (field.toLowerCase().includes(word) || value.description?.toLowerCase().includes(word)) found.add(field);
    if (found.size || key.toLowerCase().includes(word)) hits.push(key + ([...found].length ? ": " + [...found].join(", ") : ""));
  }
  console.log(hits.length ? clip(hits.map(hit => clip(hit, 160)).join("\n"), BUDGET) : `Nothing in the film document matches "${flags.query}".`);
} else print(cut => ["FilmDocument", ...fields(defs.FilmDocument, cut), "Scene recipes: " + scenes.map(recipe).filter(Boolean).join(", ")]);
