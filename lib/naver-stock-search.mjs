const stockCode = /^\d{6}$/;

function isRecord(value) {
  return typeof value === "object" && value !== null;
}

export function parseNaverStockSearch(payload) {
  if (!isRecord(payload) || !isRecord(payload.result) || !Array.isArray(payload.result.items)) return [];

  const seen = new Set();
  const candidates = [];
  for (const item of payload.result.items) {
    if (!isRecord(item) || item.category !== "stock" || typeof item.code !== "string" || typeof item.name !== "string") continue;
    const name = item.name.trim();
    if (!stockCode.test(item.code) || name.length === 0 || seen.has(item.code)) continue;
    seen.add(item.code);
    candidates.push({ name, symbol: item.code });
  }
  return candidates;
}
