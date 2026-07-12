"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type AssetKind = "crypto" | "equity";
type QuoteState = "live" | "manual" | "stale" | "pending";

type Asset = {
  readonly id: string;
  readonly kind: AssetKind;
  readonly name: string;
  readonly symbol: string;
  readonly quantity: number;
  readonly averageCost: number;
  readonly quote: number;
  readonly quoteState: QuoteState;
};

type PositionForm = {
  readonly kind: AssetKind;
  readonly name: string;
  readonly symbol: string;
  readonly quantity: string;
  readonly averageCost: string;
};

type MarketSnapshot = {
  readonly usdKrw: number | null;
  readonly usdtKrw: number | null;
  readonly refreshedAt: string | null;
};

const emptyForm: PositionForm = { kind: "crypto", name: "", symbol: "", quantity: "", averageCost: "" };
const emptyMarket: MarketSnapshot = { usdKrw: null, usdtKrw: null, refreshedAt: null };
const assetStorageKey = "portfolio-ledger-assets";
const historyStorageKey = "portfolio-ledger-history";

const formatKrw = (value: number) => new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW", maximumFractionDigits: 0 }).format(value);
const formatUsd = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value);
const formatNumber = (value: number) => new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 8 }).format(value);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isAsset(value: unknown): value is Asset {
  return isRecord(value)
    && typeof value.id === "string"
    && (value.kind === "crypto" || value.kind === "equity")
    && typeof value.name === "string"
    && typeof value.symbol === "string"
    && typeof value.quantity === "number"
    && typeof value.averageCost === "number"
    && typeof value.quote === "number"
    && (value.quoteState === "live" || value.quoteState === "manual" || value.quoteState === "stale" || value.quoteState === "pending");
}

async function requestJson(url: string, init?: RequestInit): Promise<unknown | null> {
  try {
    const response = await fetch(url, { ...init, signal: init?.signal ?? AbortSignal.timeout(8_000) });
    return response.ok ? await response.json() : null;
  } catch (error) { // no-excuse-ok: catch - browser network boundary has a last-known-value fallback
    if (error instanceof Error) return null;
    throw error;
  }
}

function dayKey(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
}

function quoteLabel(asset: Asset): string {
  if (asset.quoteState === "live") return "LIVE";
  if (asset.quoteState === "manual") return "MANUAL";
  if (asset.quoteState === "stale") return "LAST QUOTE";
  return "WAITING";
}

export function PortfolioDashboardV3() {
  const [assets, setAssets] = useState<readonly Asset[]>([]);
  const [form, setForm] = useState<PositionForm>(emptyForm);
  const [market, setMarket] = useState<MarketSnapshot>(emptyMarket);
  const [notice, setNotice] = useState("보유 수량을 입력하면 원통화 시세와 KRW 환산가를 함께 표시합니다.");
  const [history, setHistory] = useState<readonly number[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const positionValue = useCallback((asset: Asset) => asset.quantity * asset.quote * (asset.kind === "crypto" ? (market.usdKrw ?? 0) : 1), [market.usdKrw]);
  const totalValue = useMemo(() => assets.reduce((sum, asset) => sum + positionValue(asset), 0), [assets, positionValue]);
  const totalCost = useMemo(() => assets.reduce((sum, asset) => sum + asset.quantity * asset.averageCost * (asset.kind === "crypto" ? (market.usdKrw ?? 0) : 1), 0), [assets, market.usdKrw]);
  const holdingsKey = useMemo(() => assets.map((asset) => `${asset.id}:${asset.symbol}`).join("|"), [assets]);
  const hasReadyValuation = assets.length > 0 && assets.every((asset) => asset.quote > 0 && (asset.kind === "equity" || market.usdKrw !== null));

  const refresh = useCallback(async (targetAssets: readonly Asset[]) => {
    setRefreshing(true);
    setNotice("Hyperliquid, 환율, Upbit 시세를 갱신하고 있습니다.");

    const [midsPayload, fxPayload, usdtPayload] = await Promise.all([
      requestJson("https://api.hyperliquid.xyz/info", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type: "allMids" }) }),
      requestJson("https://open.er-api.com/v6/latest/USD"),
      requestJson("https://api.upbit.com/v1/ticker?markets=KRW-USDT"),
    ]);

    const mids = isRecord(midsPayload) ? midsPayload : {};
    const fx = isRecord(fxPayload) && fxPayload.result === "success" && isRecord(fxPayload.rates) ? fxPayload.rates : {};
    const usdt = Array.isArray(usdtPayload) && isRecord(usdtPayload[0]) ? usdtPayload[0] : {};
    const usdKrw = typeof fx.KRW === "number" ? fx.KRW : null;
    const usdtKrw = typeof usdt.trade_price === "number" ? usdt.trade_price : null;
    const equities = targetAssets.filter((asset) => asset.kind === "equity");
    const naverQuery = equities.map((asset) => asset.symbol).join(",");
    const naverPayload = naverQuery.length > 0 ? await requestJson(`/api/stock?symbols=${naverQuery}`) : null;
    const naverResult = isRecord(naverPayload) && isRecord(naverPayload.result) ? naverPayload.result : {};
    const areas = Array.isArray(naverResult.areas) ? naverResult.areas : [];
    const stockRows = areas.flatMap((area) => isRecord(area) && Array.isArray(area.datas) ? area.datas : []);

    setMarket({ usdKrw, usdtKrw, refreshedAt: new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short" }).format(new Date()) });
    setAssets((currentAssets) => currentAssets.map((asset) => {
      const cryptoQuote = mids[asset.symbol];
      const stock = stockRows.find((row) => isRecord(row) && row.cd === asset.symbol);
      if (asset.kind === "crypto" && typeof cryptoQuote === "string" && Number.isFinite(Number(cryptoQuote))) {
        return { ...asset, quote: Number(cryptoQuote), quoteState: "live" };
      }
      if (asset.kind === "equity" && isRecord(stock) && typeof stock.nv === "number") {
        return { ...asset, quote: stock.nv, quoteState: "live" };
      }
      return asset.quote > 0 ? { ...asset, quoteState: "stale" } : asset;
    }));
    const unavailable = [usdKrw, usdtKrw].filter((value) => value === null).length;
    setNotice(unavailable === 0 ? "시세를 갱신했습니다. 코인은 USD, 주식은 KRW 원통화로 표시됩니다." : "일부 시세를 받지 못했습니다. 마지막 확인 값을 유지합니다.");
    setRefreshing(false);
  }, []);

  useEffect(() => {
    const raw = localStorage.getItem(assetStorageKey);
    if (raw !== null) {
      try {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) setAssets(parsed.filter(isAsset));
      } catch (error) { // no-excuse-ok: catch - device-local storage can contain malformed user data
        if (error instanceof SyntaxError) setNotice("저장된 포트폴리오를 읽지 못했습니다. 새 포지션부터 다시 저장합니다.");
        else throw error;
      }
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(assetStorageKey, JSON.stringify(assets));
  }, [assets, hydrated]);

  useEffect(() => {
    if (hydrated) void refresh(assets);
  }, [holdingsKey, hydrated, refresh]);

  useEffect(() => {
    if (!hydrated || !hasReadyValuation) return;
    const raw = localStorage.getItem(historyStorageKey);
    const existing: Record<string, number> = {};
    if (raw !== null) {
      try {
        const parsed: unknown = JSON.parse(raw);
        if (isRecord(parsed)) {
          for (const [date, value] of Object.entries(parsed)) if (typeof value === "number") existing[date] = value;
        }
      } catch (error) { // no-excuse-ok: catch - malformed local history is safely replaced
        if (!(error instanceof SyntaxError)) throw error;
      }
    }
    const next = { ...existing, [dayKey()]: totalValue };
    const values = Object.entries(next).sort(([left], [right]) => left.localeCompare(right)).slice(-30);
    localStorage.setItem(historyStorageKey, JSON.stringify(Object.fromEntries(values)));
    setHistory(values.map(([, value]) => value));
  }, [hasReadyValuation, hydrated, totalValue]);

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const quantity = Number(form.quantity);
    const averageCost = Number(form.averageCost);
    if (form.name.trim().length === 0 || form.symbol.trim().length === 0 || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(averageCost) || averageCost < 0) {
      setNotice("이름, 종목 코드, 양수 수량, 평균 매입가를 확인해 주세요.");
      return;
    }

    const position: Asset = { id: crypto.randomUUID(), kind: form.kind, name: form.name.trim(), symbol: form.symbol.trim().toUpperCase(), quantity, averageCost, quote: 0, quoteState: "pending" };
    setAssets((current) => [...current, position]);
    setForm(emptyForm);
    setNotice("포지션을 추가했습니다. 시장가를 자동으로 조회합니다.");
  }

  const historyMaximum = Math.max(...history, 1);
  const valuationPending = assets.some((asset) => asset.kind === "crypto") && market.usdKrw === null;

  return (
    <main className="raoniPortfolio">
      <header className="raoniHeader">
        <div><p className="raoniEyebrow">PORTFOLIO LEDGER / KRW BASE</p><h1>내 자산</h1><p>코인은 Hyperliquid USD, 국내 주식은 KRW로 유지하고 KRW 평가액을 별도로 계산합니다.</p></div>
        <button type="button" onClick={() => void refresh(assets)} disabled={refreshing}>{refreshing ? "시장가 갱신 중" : "시장가 갱신"}</button>
      </header>

      <section className="marketStrip" aria-label="시장 요약">
        <article><span>PORTFOLIO VALUE</span><strong>{valuationPending ? "USD/KRW 대기" : formatKrw(totalValue)}</strong><small>평가손익 {valuationPending ? "—" : formatKrw(totalValue - totalCost)}</small></article>
        <article><span>USD / KRW</span><b>{market.usdKrw === null ? "—" : formatKrw(market.usdKrw)}</b><small>ExchangeRate API · 일일 기준</small></article>
        <article><span>USDT / KRW</span><b>{market.usdtKrw === null ? "—" : formatKrw(market.usdtKrw)}</b><small>Upbit KRW-USDT</small></article>
      </section>
      <p className="raoniNotice" role="status">{notice}{market.refreshedAt === null ? "" : ` · 마지막 갱신 ${market.refreshedAt}`}</p>

      <section className="raoniGrid">
        <form className="raoniForm" onSubmit={submit}>
          <p className="raoniEyebrow">ADD POSITION</p><h2>자산 추가</h2>
          <label>자산 유형<select value={form.kind} onChange={(event) => setForm({ ...form, kind: event.target.value === "equity" ? "equity" : "crypto" })}><option value="crypto">코인 / USD</option><option value="equity">국내 주식 / KRW</option></select></label>
          <label>이름<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="비트코인 또는 삼성전자" /></label>
          <label>종목 코드<input value={form.symbol} onChange={(event) => setForm({ ...form, symbol: event.target.value })} placeholder={form.kind === "crypto" ? "BTC" : "005930"} /></label>
          <label>보유 수량<input inputMode="decimal" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} /></label>
          <label>평균 매입가 ({form.kind === "crypto" ? "USD" : "KRW"})<input inputMode="decimal" value={form.averageCost} onChange={(event) => setForm({ ...form, averageCost: event.target.value })} /></label>
          <button type="submit">포지션 추가</button>
        </form>

        <section className="raoniPositions" aria-label="보유 포지션">
          <div className="raoniSectionHead"><div><p className="raoniEyebrow">HOLDINGS</p><h2>보유 포지션</h2></div><span>{assets.length} assets</span></div>
          {assets.length === 0 ? <div className="raoniEmpty">포지션을 추가하면 Hyperliquid USD 시세와 Naver KRW 시세를 자동으로 연결합니다.</div> : assets.map((asset) => <article className="raoniRow" key={asset.id}>
            <div><b>{asset.name}</b><small>{asset.symbol} · {asset.kind === "crypto" ? "Hyperliquid USD mid" : "Naver Finance public page KRW"} · {quoteLabel(asset)}</small></div>
            <div><span>{asset.quote === 0 ? "—" : asset.kind === "crypto" ? formatUsd(asset.quote) : formatKrw(asset.quote)}</span><small>원통화 현재가</small></div>
            <div><b>{asset.kind === "crypto" && market.usdKrw === null ? "USD/KRW 대기" : formatKrw(positionValue(asset))}</b><small>{formatNumber(asset.quantity)} 보유</small></div>
            <button className="delete" type="button" onClick={() => setAssets((current) => current.filter((item) => item.id !== asset.id))}>삭제</button>
          </article>)}
        </section>
      </section>

      <section className="raoniHistory" aria-label="일별 KRW 가치">
        <div className="raoniSectionHead"><div><p className="raoniEyebrow">DAILY VALUE</p><h2>일별 KRW 가치</h2></div><span>{history.length} days</span></div>
        <div className="raoniChart">{history.map((value, index) => <div key={`${index}-${value}`}><i style={{ height: `${Math.max(8, (value / historyMaximum) * 100)}%` }} /><small>{formatKrw(value)}</small></div>)}</div>
      </section>
      <footer>Hyperliquid mid는 USD 기준입니다. 국내 주식은 Naver Finance 공개 종목 페이지의 KRW 시세를 서버에서 조회하며, 실패 시 마지막 확인 값을 유지합니다.</footer>
    </main>
  );
}
