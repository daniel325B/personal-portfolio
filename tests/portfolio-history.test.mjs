import assert from "node:assert/strict";
import test from "node:test";
import { captureSnapshot, parsePortfolioHistory, selectTimeline, upsertDailyValue } from "../lib/portfolio-history.mjs";

test("migrates the original daily value map into the current history shape", () => {
  const history = parsePortfolioHistory({ "2026-07-10": 100_000, "2026-07-11": 120_000 });

  assert.deepEqual(history.daily, { "2026-07-10": 100_000, "2026-07-11": 120_000 });
  assert.deepEqual(history.snapshots, []);
});

test("keeps a manual snapshot and selects only today's points for the one-day chart", () => {
  const base = upsertDailyValue(parsePortfolioHistory({ "2026-07-06": 90_000 }), "2026-07-13", 140_000);
  const history = captureSnapshot(base, "2026-07-13T03:05:00.000Z", 145_000, "snapshot-1");

  assert.deepEqual(selectTimeline(history, "1d", "2026-07-13"), [
    { id: "daily-2026-07-13", label: "7/13", value: 140_000 },
    { id: "snapshot-1", label: "12:05", value: 145_000 },
  ]);
});

test("orders the Korea daily baseline before an early-morning Korea snapshot", () => {
  const base = upsertDailyValue(parsePortfolioHistory({}), "2026-07-13", 140_000);
  const history = captureSnapshot(base, "2026-07-12T15:01:00.000Z", 141_000, "snapshot-early");

  assert.deepEqual(selectTimeline(history, "1d", "2026-07-13").map((point) => point.id), ["daily-2026-07-13", "snapshot-early"]);
});

test("limits the seven-day chart while the all range retains earlier daily values", () => {
  const history = parsePortfolioHistory({ "2026-07-01": 10, "2026-07-07": 20, "2026-07-13": 30 });

  assert.deepEqual(selectTimeline(history, "7d", "2026-07-13").map((point) => point.value), [20, 30]);
  assert.deepEqual(selectTimeline(history, "all", "2026-07-13").map((point) => point.value), [10, 20, 30]);
});
