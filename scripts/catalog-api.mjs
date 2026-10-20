#!/usr/bin/env node
/** Public Kumiki API inspector. Offline TypeScript checker; never executes components. */
import { prepareCatalog } from "./catalog-data.mjs";
import { inspectCatalogApi } from "./catalog-api-data.mjs";

function flags(args) {
  const options = {};
  for (const arg of args) {
    if (arg === "--help") { options.help = true; continue; }
    const match = /^--(id|export|format)=(.+)$/.exec(arg);
    if (!match || options[match[1]] !== undefined) throw Error("Unexpected argument: " + arg);
    options[match[1]] = match[2];
  }
  if (!options.help && !options.id) throw Error("Specify --id=pack:NAME (or --id=NAME).");
  if (options.format && !["json", "text"].includes(options.format))
    throw Error("Use --format=json or --format=text.");
  return options;
}
const options = flags(process.argv.slice(2));
if (options.help) {
  console.log("npm run catalog:api -- --id=diagram-stage [--export=DiagramStage] [--format=json]");
} else {
  const entries = prepareCatalog();
  const id = options.id.includes(":") ? options.id : "pack:" + options.id;
  const entry = entries.find(row => row.id === id);
  if (!entry) throw Error("Unknown catalog ID: " + id + ". Search with npm run catalog:find first.");
  const result = inspectCatalogApi(entry, { exportName: options.export });
  if (options.format === "json") console.log(JSON.stringify(result, null, 2));
  else {
    console.log(result.id + " [" + result.status + "]");
    console.log("  registry: " + result.registryItem);
    if (result.note) console.log("  note: " + result.note);
    console.log("  sources: " + result.sources.join(", "));
    for (const item of result.exports) {
      console.log("\n" + item.name + " [" + item.kind + "] — " + item.source);
      if (item.aliasOf) console.log("  alias of: " + item.aliasOf);
      if (item.description) console.log("  " + item.description);
      if (item.kind === "type") console.log("  type: " + item.declaration);
      if (item.kind === "value") console.log("  type: " + item.type);
      if (item.propsType) console.log("  props type: " + item.propsType);
      if (item.signatures?.length && item.kind === "function")
        for (const signature of item.signatures)
          console.log("  (" + signature.parameters.map(p => p.name +
            (p.required ? ": " : "?: ") + p.type).join(", ") +
            ") => " + signature.returns);
      for (const prop of item.properties ?? [])
        console.log("  " + prop.name + (prop.required ? " (required)" : " (optional)") +
          ": " + prop.type + (Object.hasOwn(prop, "default") ?
            " [default: " + JSON.stringify(prop.default) + "]" : "") +
          (prop.documentedDefault ? " [documented default: " + prop.documentedDefault + "]" : ""));
      if (item.inheritedPropertiesOmitted)
        console.log("  " + item.inheritedPropertiesOmitted +
          " inherited/external properties omitted; inspect props type for full surface.");
    }
  }
}
