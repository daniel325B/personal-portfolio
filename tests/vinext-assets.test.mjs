import assert from "node:assert/strict";
import { readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { StaticFileCache } from "../node_modules/vinext/dist/server/static-file-cache.js";

test("Vinext serves the built client entry through a URL path", async () => {
  const assetDirectory = path.resolve("dist/client/assets");
  const entry = (await readdir(assetDirectory)).find((file) => file.startsWith("index-") && file.endsWith(".js"));

  assert.ok(entry, "the Vinext client entry must exist after a production build");
  const cache = await StaticFileCache.create(path.resolve("dist/client"));
  assert.ok(cache.lookup(`/assets/${entry}`), "the browser URL path must resolve in Vinext's static cache");
});
