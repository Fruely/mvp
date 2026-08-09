import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { registerHooks } from "node:module";

export function registerPartnerTestHooks() {
  registerHooks({
    resolve(specifier, context, nextResolve) {
      if (specifier.startsWith("@/")) {
        let abs = path.join(process.cwd(), specifier.slice(2));
        if (!path.extname(abs)) abs = `${abs}.ts`;
        return nextResolve(pathToFileURL(abs).href, context);
      }
      if (
        (specifier.startsWith("./") || specifier.startsWith("../")) &&
        !path.extname(specifier)
      ) {
        const parent = fileURLToPath(context.parentURL);
        if (!parent.includes(`${path.sep}node_modules${path.sep}`)) {
          let abs = path.resolve(path.dirname(parent), specifier);
          if (!path.extname(abs)) abs = `${abs}.ts`;
          if (abs.startsWith(process.cwd())) {
            return nextResolve(pathToFileURL(abs).href, context);
          }
        }
      }
      return nextResolve(specifier, context);
    },
  });
}
