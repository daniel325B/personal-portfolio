import assert from "node:assert/strict";
import test from "node:test";
import { selectExposureAssets, selectSpotAssets } from "../lib/portfolio-allocation.mjs";

test("uses only spot assets for allocation denominators", () => {
  const assets = [
    { id: "cash", account: "spot" },
    { id: "bitcoin", account: "spot" },
    { id: "skhynix-perp", account: "futures" },
  ];

  const allocationAssets = selectSpotAssets(assets);

  assert.deepEqual(allocationAssets.map((asset) => asset.id), ["cash", "bitcoin"]);
});

test("includes futures in exposure rows while preserving the spot denominator", () => {
  const assets = [
    { id: "cash", account: "spot" },
    { id: "bitcoin", account: "spot" },
    { id: "skhynix-perp", account: "futures" },
  ];

  const denominatorAssets = selectSpotAssets(assets);
  const exposureAssets = selectExposureAssets(assets);

  assert.deepEqual(denominatorAssets.map((asset) => asset.id), ["cash", "bitcoin"]);
  assert.deepEqual(exposureAssets.map((asset) => asset.id), ["cash", "bitcoin", "skhynix-perp"]);
});
