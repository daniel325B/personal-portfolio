import { parseNaverPrice } from "../../../lib/naver-price.mjs";

const stockCode = /^\d{6}$/;
const maxSymbolsPerRequest = 20;
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
  const symbols = [...new Set((new URL(request.url).searchParams.get("symbols") ?? "")
    .split(",")
    .filter((symbol) => stockCode.test(symbol)))].slice(0, maxSymbolsPerRequest);

  if (symbols.length === 0) return Response.json({ error: "A six-digit KRX symbol is required." }, { status: 400 });
  if (isRateLimited(request)) return Response.json({ error: "Too many stock quote requests. Try again shortly." }, { status: 429, headers: { "retry-after": "60" } });

  try {
    const quotes = await Promise.all(symbols.map(async (symbol) => {
      const response = await fetch(`https://finance.naver.com/item/main.naver?code=${symbol}`, {
        headers: { accept: "text/html", "user-agent": "Mozilla/5.0" },
        signal: AbortSignal.timeout(8_000),
      });
      const quote = response.ok ? parseNaverPrice(await response.text()) : null;

      return quote === null ? null : { cd: symbol, nv: quote };
    }));
    const datas = quotes.filter((quote): quote is { cd: string; nv: number } => quote !== null);

    if (datas.length === 0) return Response.json({ error: "Stock quote is unavailable." }, { status: 502 });
    return Response.json({ result: { areas: [{ datas }] } }, { headers: { "cache-control": "public, s-maxage=15, stale-while-revalidate=30" } });
  } catch (error) { // no-excuse-ok: catch - upstream quote failures are surfaced as a bounded gateway error
    if (error instanceof Error) return Response.json({ error: "Stock quote request failed." }, { status: 502 });
    throw error;
  }
}
