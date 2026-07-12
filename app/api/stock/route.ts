import { parseNaverPrice } from "../../../lib/naver-price.mjs";

const stockCode = /^\d{6}$/;

export async function GET(request: Request): Promise<Response> {
  const symbols = (new URL(request.url).searchParams.get("symbols") ?? "")
    .split(",")
    .filter((symbol) => stockCode.test(symbol));

  if (symbols.length === 0) return Response.json({ error: "A six-digit KRX symbol is required." }, { status: 400 });

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
    return Response.json({ result: { areas: [{ datas }] } }, { headers: { "cache-control": "no-store" } });
  } catch (error) { // no-excuse-ok: catch - upstream quote failures are surfaced as a bounded gateway error
    if (error instanceof Error) return Response.json({ error: "Stock quote request failed." }, { status: 502 });
    throw error;
  }
}
