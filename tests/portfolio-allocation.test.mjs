import assert from "node:assert/strict";
import test from "node:test";
import { selectSpotAssets } from "../lib/portfolio-allocation.mjs";

test("uses only spot assets for allocation denominators", () => {
  const assets = [
    { id: "cash", account: "spot" },
    { id: "bitcoin", account: "spot" },
    { id: "skhynix-perp", account: "futures" },
  ];

  const allocationAssets = selectSpotAssets(assets);

  assert.deepEqual(allocationAssets.map((asset) => asset.id), ["cash", "bitcoin"]);
});
