import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const target = path.join(root, "node_modules", "vinext", "dist", "server", "static-file-cache.js");
const source = await readFile(target, "utf8");
const before = "relativePath: path.relative(base, batch[j]),";
const after = "relativePath: path.relative(base, batch[j]).split(path.sep).join(\"/\"),";

if (!source.includes(after)) {
  if (!source.includes(before)) throw new Error("Unsupported Vinext static-file-cache layout.");
  await writeFile(target, source.replace(before, after));
}
