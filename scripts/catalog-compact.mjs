/** Small output for agents. A compact view never invents: it shortens verified data and names what it left out. */
export const API_BUDGET = 4000;
const KIND_ORDER = { component: 0, function: 1, value: 2, type: 3 };
const clip = (text, max) => text.length <= max ? text : text.slice(0, max - 1).trimEnd() + "…";
const flat = text => text.replace(/\s+/g, " ").trim();

/** The first sentence, or as much of it as fits. */
export function summary(text, max = 160) {
  const value = flat(text ?? "");
  const end = value.search(/[.;:](\s|$)/);
  return clip(end > 20 ? value.slice(0, end + 1) : value, max);
}

function propText(prop, cut, describe) {
  const fallback = Object.hasOwn(prop, "default") ? " = " + JSON.stringify(prop.default)
    : prop.documentedDefault ? " = " + prop.documentedDefault : "";
  const type = prop.required ? flat(prop.type) : flat(prop.type).replace(/ \| undefined$/, "");
  return prop.name + (prop.required ? ": " : "?: ") + clip(type, cut) + fallback +
    (describe && prop.description ? "  // " + summary(prop.description, 120) : "");
}
function exportText(item, cut, describe) {
  const head = `${item.kind} ${item.name}`;
  if (item.kind === "type" && !item.properties.length) return `${head} = ${clip(flat(item.declaration), cut * 2)}`;
  if (item.kind === "value") return `${head}: ${clip(flat(item.type), cut * 2)}`;
  if (item.kind === "function") return item.signatures.slice(0, 2).map(call => `${head}(` +
    call.parameters.map(p => p.name + (p.required ? ": " : "?: ") + clip(flat(p.type), cut)).join(", ") +
    `) => ${clip(flat(call.returns), cut)}`).join("\n");
  const own = item.properties ?? [];
  return [head, ...own.map(prop => "  " + propText(prop, cut, describe)),
    ...(item.inheritedPropertiesOmitted ? [`  + ${item.inheritedPropertiesOmitted} inherited props`] : [])].join("\n");
}

/** The lines above an API. A long list is shortened: `catalog:find --id=` has the complete install order. */
export function apiHeader(result, entry) {
  const install = [...result.installOrder, ...result.dependencies];
  return [`${result.id} [${result.status}]`, ...(result.note ? ["note: " + result.note] : []),
    "sources: " + clip(result.sources.join(", "), 400),
    "install: " + clip(install.join(", "), 240) + (install.length > 8 ? ` (${install.length} in all)` : ""),
    ...(entry.docs ? ["spec: " + entry.docs] : []), ...(entry.storyId ? ["story: " + entry.storyId] : [])];
}

/**
 * Shorten a verified API to `budget` characters. Required detail goes last: long types, then type bodies, then whole
 * exports. Whatever is left out is named in `omitted` or counted in `omittedCount`, so a reader can ask for it.
 */
export function compactApi(result, { budget = API_BUDGET, chosen = false } = {}) {
  const words = result.id.split(":").pop().split("-");
  const near = item => words.filter(word => item.name.toLowerCase().includes(word)).length;
  // A component already prints its props, so its own props type would only repeat them.
  const shown = new Set(result.exports.filter(item => item.kind === "component").map(item => item.propsType?.split(" ")[0]));
  const items = result.exports.filter(item => item.kind !== "alias" && (chosen || item.kind !== "type" || !shown.has(item.name))).sort((a, b) =>
    KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || near(b) - near(a) || a.name.localeCompare(b.name, "en"));
  const size = list => list.reduce((total, row) => total + row.text.length + 1, 0);
  const render = (cut, describe, bodies) => items.filter(item => bodies || item.kind !== "type")
    .map(item => ({ name: item.name, text: exportText(item, cut, describe) }));
  let rows = [[160, true, true], [160, false, true], [160, false, false], [80, false, false]]
    .slice(chosen ? 0 : 1).map(level => render(...level)).find(list => size(list) <= budget * .8);
  if (!rows) {
    rows = [];
    let used = 0;
    for (const row of render(80, false, chosen)) {
      const room = budget * .7 - used;
      if (row.text.length > room && rows.length) continue;
      rows.push(row.text.length > room ? { name: row.name, text: clip(row.text, Math.floor(room)) } : row);
      used += rows.at(-1).text.length + 1;
    }
  }
  const left = items.map(item => item.name).filter(name => !rows.some(row => row.name === name));
  const omitted = [];
  let room = budget - size(rows) - 400;
  for (const name of left) { if ((room -= name.length + 4) < 0) break; omitted.push(name); }
  return { exports: rows.map(row => row.text), omitted, omittedCount: left.length };
}

/** One search row: enough to choose an entry, and nothing that only `--id=` needs. */
export const compactEntry = entry => ({
  id: entry.id, title: entry.title, renderer: entry.renderer, summary: summary(entry.description),
  ...(entry.id === "pack:" + entry.registryItem ? {} : { pack: entry.registryItem }),
  ...(entry.docs ? { docs: entry.docs } : {}),
  ...(entry.storyId ? { story: entry.storyId } : {}),
  ...(entry.review === "not-reviewed" ? { review: entry.renderer === "three" ? "3D NOT visually approved" : "pending" } : {}),
});
