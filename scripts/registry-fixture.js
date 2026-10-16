// Prove that items installed from this registry actually compile inside an
// isolated consumer app. Unlike registry-smoke.js (which only stages files),
// this creates a fresh fixture in the OS temp dir, installs the declared
// dependencies, copies the registry sources to their declared targets and runs
// `tsc --noEmit` over a consumer file that exercises the public APIs.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  loadManifest,
  loadPackageJson,
  validateManifest,
  itemFiles,
  repoRoot,
} from "./registry-lib.js";

const args = process.argv.slice(2);
const keep = args.includes("--keep");
const itemArg = args.find((arg) => arg.startsWith("--item="));
const itemName = itemArg ? itemArg.slice("--item=".length) : null;

const INSTALL_TIMEOUT_MS = 300_000;
const TSC_TIMEOUT_MS = 180_000;

/**
 * Exact versions resolved by the repo's lockfile, falling back to the semver
 * ranges declared in package.json so the fixture never invents a version.
 */
function resolvedVersions() {
  const pkg = loadPackageJson();
  const ranges = { ...pkg.dependencies, ...pkg.devDependencies };
  const lockPath = path.join(repoRoot, "package-lock.json");
  const versions = { ...ranges };
  if (fs.existsSync(lockPath)) {
    const lock = JSON.parse(fs.readFileSync(lockPath, "utf8"));
    for (const [key, entry] of Object.entries(lock.packages ?? {})) {
      if (key.startsWith("node_modules/") && entry?.version) {
        versions[key.slice("node_modules/".length)] = entry.version;
      }
    }
  }
  return versions;
}

function pin(versions, name) {
  const version = versions[name];
  if (!version) throw new Error(`no version for dependency "${name}" in package.json/lockfile`);
  return version;
}

/** Run a command in the fixture, capturing output; throw with output on failure. */
function run(command, commandArgs, cwd, timeout) {
  const result = spawnSync(command, commandArgs, {
    cwd,
    encoding: "utf8",
    timeout,
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.error) {
    throw new Error(`${command} failed to start in ${cwd}: ${result.error.message}`);
  }
  if (result.status !== 0) {
    const output = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
    throw new Error(`${command} ${commandArgs.join(" ")} exited with code ${result.status}\n${output}`);
  }
  return result;
}

/** Resolve a manifest target inside the fixture, rejecting absolute/escaping paths. */
function safeTarget(fixtureDir, target) {
  if (path.isAbsolute(target) || target.split(/[\\/]+/).includes("..")) {
    throw new Error(`unsafe registry target "${target}" (absolute or contains "..")`);
  }
  const root = path.resolve(fixtureDir);
  const destination = path.resolve(root, target);
  if (destination !== root && !destination.startsWith(root + path.sep)) {
    throw new Error(`registry target "${target}" escapes the fixture directory`);
  }
  return destination;
}

/** Import specifier from the fixture's `src/` to an installed target file. */
function importSpecifier(fixtureDir, target) {
  const absolute = path.resolve(fixtureDir, target);
  let relative = path.relative(path.join(fixtureDir, "src"), absolute);
  relative = relative.replace(/\.(tsx?|jsx?)$/, "");
  if (!relative.startsWith(".")) relative = `./${relative}`;
  return relative.split(path.sep).join("/");
}

// Consumer usage templates keyed by registry item name. Each exercises the
// public API surface so a broken or missing export fails the typecheck.
const USAGE = {
  button: (specifier) => ({
    imports: [`import { Button } from "${specifier}";`],
    componentName: "ButtonExample",
    component: `export function ButtonExample() {
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  return (
    <div>
      <Button
        ref={ref}
        variant="destructive"
        size="sm"
        isLoading={busy}
        loadingText="Deleting…"
        icon={<span aria-hidden="true">+</span>}
        onClick={() => setBusy((value) => !value)}
      >
        Delete
      </Button>
      <Button variant="outline" size="icon" aria-label="More" onClick={() => ref.current?.focus()}>
        …
      </Button>
    </div>
  );
}`,
  }),
  input: (specifier) => ({
    imports: [`import { Field, Input } from "${specifier}";`],
    componentName: "InputExample",
    component: `export function InputExample() {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div>
      <Field
        ref={ref}
        label="Email"
        hint="We never share your address."
        error="That email is already registered."
        type="email"
        placeholder="you@example.com"
      />
      <Input aria-label="Search" placeholder="Search" defaultValue="" />
    </div>
  );
}`,
  }),
  "field-input": (specifier) => ({
    imports: [`import { Field, Input } from "${specifier}";`],
    componentName: "FieldInputExample",
    component: `export function FieldInputExample() {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div>
      <Field
        ref={ref}
        label="Email"
        hint="We never share your address."
        description="Use a work address."
        error="That email is already registered."
        autoResize
        maxLength={80}
        type="email"
        placeholder="you@example.com"
      />
      <Input aria-label="Search" placeholder="Search" defaultValue="" />
    </div>
  );
}`,
  }),
  dialog: (specifier) => ({
    imports: [`import { Dialog } from "${specifier}";`],
    componentName: "DialogExample",
    component: `export function DialogExample() {
  const [open, setOpen] = useState(true);
  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
      onClose={() => setOpen(false)}
      title="Confirm changes"
      description="This updates every linked record."
      size="lg"
      placement="center"
      modal
      closeLabel="Close dialog"
    >
      <p>Dialog body content.</p>
    </Dialog>
  );
}`,
  }),
};

function buildConsumerSource(sections) {
  const importLines = [
    'import { useRef, useState } from "react";',
    ...sections.flatMap((section) => section.imports),
  ];
  const bodies = sections.map((section) => section.component).join("\n\n");
  const rendered = sections.map((section) => `      <${section.componentName} />`).join("\n");
  return `${importLines.join("\n")}\n\n${bodies}\n\nexport function FixtureApp() {\n  return (\n    <main>\n${rendered}\n    </main>\n  );\n}\n`;
}

let fixtureDir = null;

try {
  const manifest = loadManifest();
  const { errors, warnings } = validateManifest(manifest);
  for (const warning of warnings) console.warn(`registry:fixture warning — ${warning}`);
  if (errors.length) {
    console.error(`registry:fixture FAILED — manifest invalid:\n  - ${errors.join("\n  - ")}`);
    process.exitCode = 1;
  } else {
    const allItems = manifest.items;
    const items = itemName ? allItems.filter((item) => item.name === itemName) : allItems;
    if (itemName && items.length === 0) {
      const available = allItems.map((item) => item.name).join(", ");
      throw new Error(`unknown item "${itemName}" (available: ${available})`);
    }

    const versions = resolvedVersions();
    fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), "kumiki-fixture-"));
    const srcDir = path.join(fixtureDir, "src");
    fs.mkdirSync(srcDir, { recursive: true });

    // Fixture manifests: dependency union + React, pinned to resolved versions.
    const dependencyNames = new Set(["react", "react-dom"]);
    for (const item of items) {
      for (const dep of item.dependencies ?? []) dependencyNames.add(dep);
    }
    const dependencies = {};
    for (const name of [...dependencyNames].sort()) dependencies[name] = pin(versions, name);
    const devDependencies = {};
    for (const name of ["@types/react", "@types/react-dom", "typescript"]) {
      devDependencies[name] = pin(versions, name);
    }
    fs.writeFileSync(
      path.join(fixtureDir, "package.json"),
      `${JSON.stringify(
        {
          name: "kumiki-fixture",
          version: "0.0.0",
          private: true,
          type: "module",
          dependencies,
          devDependencies,
        },
        null,
        2
      )}\n`,
      "utf8"
    );
    fs.writeFileSync(
      path.join(fixtureDir, "tsconfig.json"),
      `${JSON.stringify(
        {
          compilerOptions: {
            target: "ES2022",
            lib: ["ES2022", "DOM", "DOM.Iterable"],
            module: "ESNext",
            moduleResolution: "bundler",
            jsx: "react-jsx",
            strict: true,
            noEmit: true,
            skipLibCheck: true,
            types: [],
          },
          include: ["src", "components"],
        },
        null,
        2
      )}\n`,
      "utf8"
    );

    // Copy every file to its declared target and verify it is self-contained.
    let fileCount = 0;
    const sections = [];
    for (const item of items) {
      for (const file of itemFiles(item)) {
        if (!fs.existsSync(file.absolute)) {
          throw new Error(`item "${item.name}" references missing file "${file.path}"`);
        }
        const contents = fs.readFileSync(file.absolute, "utf8");
        if (!contents.trim()) throw new Error(`item "${item.name}" file "${file.path}" is empty`);
        if (/\.\.\/src|@\/lib/.test(contents)) {
          throw new Error(`item "${item.name}" file "${file.path}" references the private workspace`);
        }
        const destination = safeTarget(fixtureDir, file.target);
        fs.mkdirSync(path.dirname(destination), { recursive: true });
        fs.writeFileSync(destination, contents, "utf8");
        fileCount += 1;
      }

      const template = USAGE[item.name];
      if (template) {
        sections.push(template(importSpecifier(fixtureDir, item.files[0].target)));
      } else {
        console.warn(`registry:fixture warning — no consumer usage template for item "${item.name}"`);
      }
    }

    fs.writeFileSync(path.join(srcDir, "app.tsx"), buildConsumerSource(sections), "utf8");

    run("npm", ["install", "--no-audit", "--no-fund", "--progress=false"], fixtureDir, INSTALL_TIMEOUT_MS);
    run("npx", ["--no-install", "tsc", "--noEmit"], fixtureDir, TSC_TIMEOUT_MS);

    // Registry sources plus the generated consumer file are what tsc compiled.
    const compiledFiles = fileCount + 1;
    const location = keep ? `at ${fixtureDir}` : "in a temporary fixture (removed)";
    console.log(
      `registry:fixture OK — ${items.length} item(s), ${compiledFiles} file(s) compiled ${location}`
    );
  }
} catch (error) {
  console.error(`registry:fixture FAILED — ${error.message}`);
  process.exitCode = 1;
} finally {
  if (fixtureDir) {
    if (keep) {
      console.log(`registry:fixture kept fixture at ${fixtureDir}`);
    } else {
      fs.rmSync(fixtureDir, { recursive: true, force: true });
    }
  }
}
