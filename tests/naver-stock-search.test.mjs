import assert from "node:assert/strict";
import test from "node:test";
import { parseNaverStockSearch } from "../lib/naver-stock-search.mjs";

test("returns KRX stock candidates from Naver autocomplete JSON", () => {
  const payload = {
    isSuccess: true,
    result: { items: [
      { category: "stock", code: "005930", name: "삼성전자" },
      { category: "stock", code: "005935", name: "삼성전자우" },
    ] },
  };

  assert.deepEqual(parseNaverStockSearch(payload), [
    { name: "삼성전자", symbol: "005930" },
    { name: "삼성전자우", symbol: "005935" },
  ]);
});

test("deduplicates and ignores non-stock or malformed autocomplete items", () => {
  const payload = {
    result: { items: [
      { category: "stock", code: "005930", name: "삼성전자" },
      { category: "stock", code: "005930", name: "삼성전자" },
      { category: "stock", code: "0162Z0", name: "잘못된 종목" },
      { category: "coin", code: "BTC", name: "Bitcoin" },
      { category: "stock", code: "000660", name: "" },
    ] },
  };

  assert.deepEqual(parseNaverStockSearch(payload), [{ name: "삼성전자", symbol: "005930" }]);
});
