import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const starterPreviewMeta = /<meta(?=[^>]*\bname=["']codex-preview["'])[^>]*>/i;

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server renders the portfolio command center without starter metadata", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /Portfolio Ledger/i);
  assert.match(html, /PORTFOLIO LEDGER \/ KRW BASE/);
  assert.match(html, /ADD POSITION/);
  assert.doesNotMatch(html, starterPreviewMeta);
});

test("source contains only product metadata and no starter skeleton dependency", async () => {
  const [page, layout, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(page, /PortfolioDashboardV3/);
  assert.doesNotMatch(page, /codex-preview/);
  assert.match(layout, /Portfolio Ledger/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
});
