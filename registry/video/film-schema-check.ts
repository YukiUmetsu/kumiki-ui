/** Check a JSON value against the JSON Schema subset that `npm run film:schema` generates.
 * Every problem is returned with a JSON Pointer and a hint, so an author can fix all of them in one pass.
 * An `anyOf` with a shared constant field, such as `recipeId` or `kind`, is checked against the one branch that the
 * value names, which keeps the problems specific to what the author wrote.
 */
export interface JsonSchema {
  $ref?: string;
  type?: "object" | "array" | "string" | "number" | "boolean" | "null";
  const?: string | number | boolean;
  enum?: readonly (string | number | boolean)[];
  properties?: Readonly<Record<string, JsonSchema>>;
  required?: readonly string[];
  additionalProperties?: boolean | JsonSchema;
  items?: JsonSchema;
  prefixItems?: readonly JsonSchema[];
  minItems?: number;
  maxItems?: number;
  anyOf?: readonly JsonSchema[];
  description?: string;
  $defs?: Readonly<Record<string, JsonSchema>>;
}
export interface SchemaProblem { path: string; code: "schema-required" | "schema-type" | "schema-value" | "schema-unknown-key" | "schema-length"; message: string; hint: string }

const jsonType = (value: unknown) => value === null ? "null" : Array.isArray(value) ? "array" : typeof value;
const pointer = (path: string, key: string | number) => path + "/" + String(key).replace(/~/g, "~0").replace(/\//g, "~1");

/** Edit distance, for "did you mean". Bounded inputs: property names and enum values. */
function distance(a: string, b: string): number {
  let row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    const next = [i];
    for (let j = 1; j <= b.length; j += 1) next[j] = Math.min(row[j] + 1, next[j - 1] + 1, row[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    row = next;
  }
  return row[b.length];
}
function closest(value: string, options: readonly string[]): string | undefined {
  const lower = value.toLowerCase();
  const best = options.map(option => ({ option, cost: distance(lower, option.toLowerCase()) })).sort((a, b) => a.cost - b.cost)[0];
  return best && best.cost <= Math.max(2, Math.floor(value.length / 3)) ? best.option : undefined;
}
const describe = (schema: JsonSchema): string => schema.type ?? (schema.anyOf ? "one of several shapes" : "a value");
const list = (values: readonly unknown[]) => values.map(value => JSON.stringify(value)).join(", ");

export function checkJsonSchema(value: unknown, root: JsonSchema): SchemaProblem[] {
  const resolve = (schema: JsonSchema): JsonSchema => {
    if (!schema.$ref) return schema;
    const name = schema.$ref.replace("#/$defs/", ""), found = root.$defs?.[name];
    if (!found) throw new Error("The film schema has no definition for " + schema.$ref + ". Run npm run film:schema.");
    return resolve(found);
  };
  const constantOf = (schema: JsonSchema, key: string) => {
    const property = schema.properties?.[key];
    return property ? resolve(property).const : undefined;
  };
  /** The field that names a branch: every object branch has a different constant in it. */
  const discriminant = (branches: readonly JsonSchema[]) => {
    const first = branches[0];
    return Object.keys(first.properties ?? {}).find(key => {
      const seen = branches.map(branch => constantOf(branch, key));
      return seen.every(item => item !== undefined) && new Set(seen).size === seen.length;
    });
  };
  const walk = (item: unknown, raw: JsonSchema, path: string): SchemaProblem[] => {
    const schema = resolve(raw);
    if (schema.anyOf) return walkUnion(item, schema.anyOf.map(resolve), path);
    if (schema.const !== undefined && item !== schema.const)
      return [{ path, code: "schema-value", message: `Expected ${JSON.stringify(schema.const)}.`, hint: `Set this value to ${JSON.stringify(schema.const)}.` }];
    if (schema.enum && !schema.enum.includes(item as string)) {
      const near = typeof item === "string" ? closest(item, schema.enum.filter(option => typeof option === "string") as string[]) : undefined;
      return [{ path, code: "schema-value", message: `${JSON.stringify(item)} is not an allowed value.`, hint: (near ? `Did you mean ${JSON.stringify(near)}? ` : "") + `Allowed: ${list(schema.enum)}.` }];
    }
    if (schema.type && jsonType(item) !== schema.type)
      return [{ path, code: "schema-type", message: `Expected ${schema.type}, found ${jsonType(item)}.`, hint: schema.description ?? `Change this value to ${schema.type}.` }];
    if (Array.isArray(item)) return walkArray(item, schema, path);
    if (jsonType(item) === "object" && (schema.properties || schema.additionalProperties !== undefined)) return walkObject(item as Record<string, unknown>, schema, path);
    return [];
  };
  const walkArray = (item: readonly unknown[], schema: JsonSchema, path: string): SchemaProblem[] => {
    const problems: SchemaProblem[] = [];
    if ((schema.minItems !== undefined && item.length < schema.minItems) || (schema.maxItems !== undefined && item.length > schema.maxItems))
      problems.push({ path, code: "schema-length", message: `Found ${item.length} items.`, hint: `This array needs ${schema.minItems === schema.maxItems ? `exactly ${schema.minItems}` : `${schema.minItems ?? 0} to ${schema.maxItems ?? "any number of"}`} items.` });
    item.forEach((entry, index) => {
      const next = schema.prefixItems?.[index] ?? schema.items;
      if (next) problems.push(...walk(entry, next, pointer(path, index)));
    });
    return problems;
  };
  const walkObject = (item: Record<string, unknown>, schema: JsonSchema, path: string): SchemaProblem[] => {
    const problems: SchemaProblem[] = [], known = Object.keys(schema.properties ?? {});
    for (const key of schema.required ?? []) if (item[key] === undefined) {
      const property = schema.properties?.[key], about = property ? resolve(property) : undefined;
      problems.push({ path: pointer(path, key), code: "schema-required", message: `Missing required field "${key}".`, hint: about?.description ?? `Add "${key}" (${about ? describe(about) : "a value"}).` });
    }
    for (const [key, entry] of Object.entries(item)) {
      if (entry === undefined) continue;
      const property = schema.properties?.[key];
      if (property) problems.push(...walk(entry, property, pointer(path, key)));
      else if (typeof schema.additionalProperties === "object") problems.push(...walk(entry, schema.additionalProperties, pointer(path, key)));
      else if (schema.additionalProperties === false) {
        const near = closest(key, known);
        problems.push({ path: pointer(path, key), code: "schema-unknown-key", message: `Unknown field "${key}".`, hint: (near ? `Did you mean "${near}"? ` : "") + `Known fields: ${known.join(", ")}.` });
      }
    }
    return problems;
  };
  const walkUnion = (item: unknown, branches: readonly JsonSchema[], path: string): SchemaProblem[] => {
    const objects = branches.filter(branch => branch.properties);
    if (jsonType(item) === "object" && objects.length > 1) {
      const key = discriminant(objects);
      if (key) {
        const chosen = objects.find(branch => constantOf(branch, key) === (item as Record<string, unknown>)[key]);
        if (chosen) return walk(item, chosen, path);
        const names = objects.map(branch => constantOf(branch, key)!), given = (item as Record<string, unknown>)[key];
        const near = typeof given === "string" ? closest(given, names.filter(name => typeof name === "string") as string[]) : undefined;
        return [{ path: pointer(path, key), code: given === undefined ? "schema-required" : "schema-value", message: given === undefined ? `Missing required field "${key}".` : `${JSON.stringify(given)} is not an allowed value.`, hint: (near ? `Did you mean ${JSON.stringify(near)}? ` : "") + `Allowed: ${list(names)}.` }];
      }
    }
    const attempts = branches.map(branch => walk(item, branch, path)).sort((a, b) => a.length - b.length);
    if (!attempts[0].length) return [];
    // A wrong JSON type in every branch is one problem, not one per branch.
    const sameType = branches.filter(branch => branch.type ? branch.type === jsonType(item) : branch.enum?.some(option => jsonType(option) === jsonType(item)) || branch.const !== undefined && jsonType(branch.const) === jsonType(item));
    if (!sameType.length) return [{ path, code: "schema-type", message: `Found ${jsonType(item)}, which no allowed shape accepts.`, hint: `Allowed: ${[...new Set(branches.map(describe))].join(", ")}.` }];
    return attempts[0];
  };
  return walk(value, root, "");
}
