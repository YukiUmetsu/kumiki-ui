/** Pure capture-plan validation. Importable without opening a browser or spawning a process. */
export function createCraftReviewPlan(args = []) {
  const options = {};
  for (const arg of args) {
    if (arg === "--plan") {
      if (options.plan) throw new Error(`Duplicate argument ${arg}.`);
      options.plan = true;
    } else {
      const match = /^--([a-z-]+)=(.*)$/.exec(arg);
      if (!match || options[match[1]] !== undefined) throw new Error(`Unexpected/duplicate argument ${arg}.`);
      options[match[1]] = match[2];
    }
  }
  const allowed = new Set(["plan", "port", "out", "seeds", "frames", "aspects", "scenes"]);
  for (const key of Object.keys(options)) if (!allowed.has(key)) throw new Error(`Unknown option --${key}.`);
  const csv = (key, defaults) => (options[key] ?? defaults).split(",").map(value => value.trim());
  const parseIntSet = (key, defaults, low, high) => {
    const raw = csv(key, defaults);
    if (raw.length < 1 || raw.length > 5 || raw.some(value => !/^(0|[1-9][0-9]*)$/.test(value)))
      throw new Error(`${key} must have 1–5 comma-separated integers.`);
    const values = raw.map(Number);
    if (values.some(value => value < low || value > high) || new Set(values).size !== values.length)
      throw new Error(`${key} must be distinct integers from ${low} to ${high}.`);
    return values;
  };
  const subset = (key, defaults, allowedValues) => {
    const list = csv(key, defaults);
    if (!list.length || list.some(value => !allowedValues.includes(value)) || new Set(list).size !== list.length)
      throw new Error(`${key} must be distinct entries from ${allowedValues.join(", ")}.`);
    return list;
  };
  const seeds = parseIntSet("seeds", "21", 1, 99);
  const frames = parseIntSet("frames", "0,58,120", 0, 120);
  const aspects = subset("aspects", "landscape,portrait", ["landscape", "portrait"]);
  const scenes = subset("scenes", "street,hillside,masonry,streetlamp", ["street", "hillside", "masonry", "streetlamp"]);
  const port = Number(options.port ?? 6006);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("port must be 1–65535.");
  const plan = [];
  const modes = { street: ["detailed", "no-rooms", "no-streetscape", "no-masonry", "baseline"],
    hillside: ["woodland"], masonry: ["bonded", "flat"], streetlamp: ["constructed"] };
  for (const scene of scenes) for (const mode of modes[scene])
    for (const aspect of aspects) for (const seed of seeds) for (const frame of frames)
      plan.push({ scene, mode, aspect, seed, frame });
  if (plan.length > 120) throw new Error("Capture plan exceeds 120 frames; reduce scenes, seeds or frames.");
  return { plan, port, out: options.out ?? "dist/craft-environment-review", dryRun: options.plan === true };
}
