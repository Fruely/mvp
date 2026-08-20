import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ts = createRequire(import.meta.url)("typescript");
const root = process.cwd();
const rootPrefix = root.endsWith(path.sep) ? root : `${root}${path.sep}`;

function isProjectFile(abs) {
  return abs === root || abs.startsWith(rootPrefix);
}

function resolveProjectSpecifier(abs) {
  if (path.extname(abs)) return abs;
  for (const ext of [".ts", ".tsx", ".mjs", ".js"]) {
    const candidate = `${abs}${ext}`;
    if (fs.existsSync(candidate)) return candidate;
  }
  return `${abs}.ts`;
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const abs = resolveProjectSpecifier(path.join(root, specifier.slice(2)));
    return nextResolve(pathToFileURL(abs).href, context);
  }

  // Next subpath imports are extensionless in app code; Node ESM needs .js.
  if (specifier.startsWith("next/") && !path.extname(specifier)) {
    return nextResolve(`${specifier}.js`, context);
  }

  if (
    (specifier.startsWith("./") || specifier.startsWith("../")) &&
    !path.extname(specifier) &&
    context.parentURL
  ) {
    const parent = fileURLToPath(context.parentURL);
    if (!parent.includes(`${path.sep}node_modules${path.sep}`)) {
      const abs = resolveProjectSpecifier(path.resolve(path.dirname(parent), specifier));
      if (isProjectFile(abs)) {
        return nextResolve(pathToFileURL(abs).href, context);
      }
    }
  }

  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  const fileUrl = url.split("?")[0];
  if (
    !fileUrl.startsWith("file:") ||
    !/\.tsx?$/.test(fileUrl) ||
    fileUrl.includes("/node_modules/")
  ) {
    return nextLoad(url, context);
  }

  const filename = fileURLToPath(fileUrl);
  if (!isProjectFile(filename)) {
    return nextLoad(url, context);
  }

  const source = fs.readFileSync(filename, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
      jsx: filename.endsWith(".tsx") ? ts.JsxEmit.ReactJSX : ts.JsxEmit.Preserve,
    },
    fileName: filename,
  });

  return {
    format: "module",
    source: transpiled.outputText,
    shortCircuit: true,
  };
}
