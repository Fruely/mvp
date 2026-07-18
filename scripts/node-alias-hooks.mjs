import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    let abs = path.join(root, specifier.slice(2));
    if (!path.extname(abs)) {
      // Prefer .ts for --experimental-strip-types unit tests.
      abs = `${abs}.ts`;
    }
    return nextResolve(pathToFileURL(abs).href, context);
  }
  return nextResolve(specifier, context);
}
