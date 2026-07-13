import { parseNaverStockSearch } from "../../../../lib/naver-stock-search.mjs";

const autocompleteTarget = "stock,index,marketindicator,coin,ipo";
const maxCandidates = 12;
const rateWindowMs = 60_000;
const maxRequestsPerWindow = 20;
const requestCounts = new Map<string, { count: number; startedAt: number }>();

function isRateLimited(request: Request): boolean {
  const key = request.headers.get("cf-connecting-ip") ?? "anonymous";
  const now = Date.now();
  const entry = requestCounts.get(key);
  if (!entry || now - entry.startedAt >= rateWindowMs) {
    if (requestCounts.size > 1_000) requestCounts.clear();
    requestCounts.set(key, { count: 1, startedAt: now });
    return false;
  }
  entry.count += 1;
  return entry.count > maxRequestsPerWindow;
}

export async function GET(request: Request): Promise<Response> {
  const query = (new URL(request.url).searchParams.get("query") ?? "").trim();
  if (query.length === 0 || query.length > 40) return Response.json({ error: "A stock name query is required." }, { status: 400 });
  if (isRateLimited(request)) return Response.json({ error: "Too many stock search requests. Try again shortly." }, { status: 429, headers: { "retry-after": "60" } });

  try {
    const url = new URL("https://m.stock.naver.com/front-api/search/autoComplete");
    url.searchParams.set("query", query);
    url.searchParams.set("target", autocompleteTarget);
    const response = await fetch(url, {
      headers: { accept: "application/json", "user-agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return Response.json({ error: "Stock search is unavailable." }, { status: 502 });

    return Response.json(
      { candidates: parseNaverStockSearch(await response.json()).slice(0, maxCandidates) },
      { headers: { "cache-control": "public, s-maxage=30, stale-while-revalidate=60" } },
    );
  } catch (error) { // no-excuse-ok: catch - third-party search errors become a bounded gateway error
    if (error instanceof Error) return Response.json({ error: "Stock search request failed." }, { status: 502 });
    throw error;
  }
}
