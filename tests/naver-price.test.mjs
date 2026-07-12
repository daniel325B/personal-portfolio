import assert from "node:assert/strict";
import test from "node:test";
import { parseNaverPrice } from "../lib/naver-price.mjs";

test("parses the current KRW quote from a Naver Finance public stock page", () => {
  const html = '<p class="no_today"><span class="blind">285,000</span></p>';

  assert.equal(parseNaverPrice(html), 285000);
});

test("rejects a Naver page without a numeric current quote", () => {
  assert.equal(parseNaverPrice('<p class="no_today"><span class="blind">—</span></p>'), null);
});
