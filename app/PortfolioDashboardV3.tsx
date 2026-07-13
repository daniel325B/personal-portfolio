"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { captureSnapshot, parsePortfolioHistory, selectTimeline, upsertDailyValue } from "../lib/portfolio-history.mjs";
import { PortfolioAssetForm } from "./PortfolioAssetForm";
import { PortfolioHistory } from "./PortfolioHistory";
import { type Asset, type MarketSnapshot, type PositionForm, type StockCandidate, emptyMarket, isAsset, isRecord, quoteLabel } from "./portfolio-model";

const assetStorageKey = "portfolio-ledger-assets";
const historyStorageKey = "portfolio-ledger-history";
const formatKrw = (value: number) => new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW", maximumFractionDigits: 0 }).format(value);
const formatUsd = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value);
const formatNumber = (value: number) => new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 8 }).format(value);

function dayKey(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
}

async function requestJson(url: string, init?: RequestInit): Promise<unknown | null> {
  try {
    const response = await fetch(url, { ...init, signal: init?.signal ?? AbortSignal.timeout(8_000) });
    return response.ok ? await response.json() : null;
  } catch (error) {
    if (error instanceof Error) return null;
    throw error;
  }
}

function quoteText(asset: Asset): string {
  if (asset.quote === 0) return "—";
  return asset.kind === "crypto" ? formatUsd(asset.quote) : formatKrw(asset.quote);
}

function sourceText(asset: Asset): string {
  if (asset.kind === "crypto") return "Hyperliquid USD mid";
  if (asset.kind === "equity") return "Naver Finance KRW";
  if (asset.kind === "cash") return "직접 입력 KRW 현금";
  return "직접 입력 KRW 단가";
}

export function PortfolioDashboardV3() {
  const [assets, setAssets] = useState<readonly Asset[]>([]);
  const [market, setMarket] = useState<MarketSnapshot>(emptyMarket);
  const [history, setHistory] = useState(() => parsePortfolioHistory(null));
  const [range, setRange] = useState<"1d" | "7d" | "all">("1d");
  const [notice, setNotice] = useState("보유 자산을 추가하면 현재가와 KRW 환산 가치를 확인할 수 있습니다.");
  const [hydrated, setHydrated] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const positionValue = useCallback((asset: Asset) => asset.quantity * asset.quote * (asset.kind === "crypto" ? (market.usdKrw ?? 0) : 1), [market.usdKrw]);
  const totalValue = useMemo(() => assets.reduce((sum, asset) => sum + positionValue(asset), 0), [assets, positionValue]);
  const totalUsdValue = market.usdKrw === null ? null : totalValue / market.usdKrw;
  const totalCost = useMemo(() => assets.reduce((sum, asset) => sum + asset.quantity * asset.averageCost * (asset.kind === "crypto" ? (market.usdKrw ?? 0) : 1), 0), [assets, market.usdKrw]);
  const marketAssetsKey = useMemo(() => assets.filter((asset) => asset.kind === "crypto" || asset.kind === "equity").map((asset) => `${asset.kind}:${asset.symbol}`).join("|"), [assets]);
  const hasReadyValuation = assets.length > 0 && assets.every((asset) => asset.quote > 0 && (asset.kind !== "crypto" || market.usdKrw !== null));
  const timeline = useMemo(() => selectTimeline(history, range, dayKey()), [history, range]);

  const refresh = useCallback(async (assetKey: string) => {
    if (assetKey.length === 0) return;
    setRefreshing(true);
    setNotice("Hyperliquid, 환율, Upbit, 네이버 시세를 갱신하고 있습니다.");
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
    const symbols = assetKey.split("|").filter((entry) => entry.startsWith("equity:")).map((entry) => entry.slice("equity:".length)).join(",");
    const naverPayload = symbols.length > 0 ? await requestJson(`/api/stock?symbols=${symbols}`) : null;
    const result = isRecord(naverPayload) && isRecord(naverPayload.result) ? naverPayload.result : {};
    const areas = Array.isArray(result.areas) ? result.areas : [];
    const rows = areas.flatMap((area) => isRecord(area) && Array.isArray(area.datas) ? area.datas : []);
    setMarket({ usdKrw, usdtKrw, refreshedAt: new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short" }).format(new Date()) });
    setAssets((current) => current.map((asset) => {
      const cryptoQuote = mids[asset.symbol];
      const stock = rows.find((row) => isRecord(row) && row.cd === asset.symbol);
      if (asset.kind === "crypto" && typeof cryptoQuote === "string" && Number.isFinite(Number(cryptoQuote))) return { ...asset, quote: Number(cryptoQuote), quoteState: "live" };
      if (asset.kind === "equity" && isRecord(stock) && typeof stock.nv === "number") return { ...asset, quote: stock.nv, quoteState: "live" };
      if ((asset.kind === "crypto" || asset.kind === "equity") && asset.quote > 0) return { ...asset, quoteState: "stale" };
      return asset;
    }));
    setNotice(usdKrw !== null && usdtKrw !== null ? "시세를 갱신했습니다. 코인은 USD, 주식·현금·기타 자산은 KRW 기준입니다." : "일부 시세를 받지 못했습니다. 마지막 확인 값을 유지합니다.");
    setRefreshing(false);
  }, []);

  useEffect(() => {
    const rawAssets = localStorage.getItem(assetStorageKey);
    const rawHistory = localStorage.getItem(historyStorageKey);
    try {
      const parsedAssets: unknown = rawAssets === null ? [] : JSON.parse(rawAssets);
      const parsedHistory: unknown = rawHistory === null ? null : JSON.parse(rawHistory);
      queueMicrotask(() => {
        if (Array.isArray(parsedAssets)) setAssets(parsedAssets.filter(isAsset));
        setHistory(parsePortfolioHistory(parsedHistory));
      });
    } catch (error) {
      if (error instanceof SyntaxError) queueMicrotask(() => setNotice("저장된 포트폴리오 데이터를 읽지 못했습니다. 새 기록으로 다시 시작합니다."));
      else throw error;
    }
    queueMicrotask(() => setHydrated(true));
  }, []);

  useEffect(() => { if (hydrated) localStorage.setItem(assetStorageKey, JSON.stringify(assets)); }, [assets, hydrated]);
  useEffect(() => { if (hydrated) localStorage.setItem(historyStorageKey, JSON.stringify(history)); }, [history, hydrated]);
  useEffect(() => { if (hydrated && marketAssetsKey.length > 0) queueMicrotask(() => void refresh(marketAssetsKey)); }, [hydrated, marketAssetsKey, refresh]);
  useEffect(() => { if (hydrated && hasReadyValuation) queueMicrotask(() => setHistory((current) => upsertDailyValue(current, dayKey(), totalValue))); }, [hasReadyValuation, hydrated, totalValue]);

  function addAsset(form: PositionForm, candidate: StockCandidate | null): boolean {
    const quantity = Number(form.quantity);
    const averageCost = form.kind === "cash" ? 1 : Number(form.averageCost);
    const manualQuote = form.kind === "cash" ? 1 : Number(form.manualQuote);
    const symbol = form.kind === "cash" ? "KRW" : form.symbol.trim().toUpperCase();
    const validStock = candidate !== null && candidate.name === form.name.trim() && candidate.symbol === symbol;
    const requiresQuote = form.kind === "other";
    if (form.name.trim().length === 0 || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(averageCost) || averageCost < 0 || (form.kind !== "cash" && symbol.length === 0) || (form.kind === "equity" && !validStock) || (requiresQuote && (!Number.isFinite(manualQuote) || manualQuote <= 0))) {
      setNotice(form.kind === "equity" ? "국내 주식은 검색 결과에서 종목을 선택해 주세요." : "이름, 수량, 평균 매입가와 직접 입력 단가를 확인해 주세요.");
      return false;
    }
    const quote = form.kind === "cash" ? 1 : form.kind === "other" ? manualQuote : 0;
    const quoteState = form.kind === "cash" || form.kind === "other" ? "manual" : "pending";
    setAssets((current) => [...current, { id: crypto.randomUUID(), kind: form.kind, name: form.name.trim(), symbol, quantity, averageCost, quote, quoteState }]);
    setNotice(form.kind === "cash" || form.kind === "other" ? "직접 입력 자산을 추가했습니다." : "포지션을 추가했습니다. 시장가를 자동으로 조회합니다.");
    return true;
  }

  function saveSnapshot(): void {
    if (!hasReadyValuation) { setNotice("현재가가 준비된 뒤 스냅샷을 저장할 수 있습니다."); return; }
    setHistory((current) => captureSnapshot(current, new Date().toISOString(), totalValue, crypto.randomUUID()));
    setNotice("현재 포트폴리오 가치를 스냅샷으로 저장했습니다.");
  }

  const pending = assets.some((asset) => asset.kind === "crypto") && market.usdKrw === null;
  return <main className="raoniPortfolio">
    <header className="raoniHeader"><div><p className="raoniEyebrow">PORTFOLIO LEDGER / KRW BASE</p><h1>개인 자산</h1><p>코인은 Hyperliquid USD, 국내 주식은 KRW로 조회하고 현금·기타 자산은 직접 추가할 수 있습니다.</p></div><button type="button" onClick={() => void refresh(marketAssetsKey)} disabled={refreshing || marketAssetsKey.length === 0}>{refreshing ? "시장가 갱신 중" : "시장가 갱신"}</button></header>
    <section className="marketStrip" aria-label="시장 요약"><article><span>PORTFOLIO VALUE / KRW</span><strong>{pending ? "USD/KRW 대기" : formatKrw(totalValue)}</strong><small>평가 손익 {pending ? "—" : formatKrw(totalValue - totalCost)}</small></article><article><span>PORTFOLIO VALUE / USD</span><b>{totalUsdValue === null ? "USD/KRW 대기" : formatUsd(totalUsdValue)}</b><small>현재 USD/KRW 환율 기준 환산값</small></article><article><span>USD / KRW</span><b>{market.usdKrw === null ? "—" : formatKrw(market.usdKrw)}</b><small>ExchangeRate API 일일 기준</small></article><article><span>USDT / KRW</span><b>{market.usdtKrw === null ? "—" : formatKrw(market.usdtKrw)}</b><small>Upbit KRW-USDT</small></article></section>
    <p className="raoniNotice" role="status">{notice}{market.refreshedAt === null ? "" : ` · 마지막 갱신 ${market.refreshedAt}`}</p>
    <section className="raoniGrid"><PortfolioAssetForm onAdd={addAsset} /><section className="raoniPositions" aria-label="보유 포지션"><div className="raoniSectionHead"><div><p className="raoniEyebrow">HOLDINGS</p><h2>보유 포지션</h2></div><span>{assets.length} assets</span></div>{assets.length === 0 ? <div className="raoniEmpty">자산을 추가하면 가격과 KRW 환산 가치를 확인할 수 있습니다.</div> : assets.map((asset) => <article className="raoniRow" key={asset.id}>{asset.kind === "cash" ? <><div><b>{asset.name}</b><small>직접 입력 · {quoteLabel(asset)}</small></div><div><b>{formatKrw(positionValue(asset))}</b><small>보유 현금</small></div></> : <><div><b>{asset.name}</b><small>{asset.symbol} · {sourceText(asset)} · {quoteLabel(asset)}</small></div><div><span>{quoteText(asset)}</span><small>현재 단가</small></div><div><b>{asset.kind === "crypto" && market.usdKrw === null ? "USD/KRW 대기" : formatKrw(positionValue(asset))}</b><small>{formatNumber(asset.quantity)} 보유</small></div></>}<button className="delete" type="button" onClick={() => setAssets((current) => current.filter((item) => item.id !== asset.id))}>삭제</button></article>)}</section></section>
    <PortfolioHistory points={timeline} range={range} onRangeChange={setRange} onSnapshot={saveSnapshot} formatKrw={formatKrw} />
    <footer>Hyperliquid mid는 USD 기준입니다. 국내 주식은 네이버 금융 공개 페이지의 KRW 시세를 서버에서 조회하며, 실패 시 마지막 확인 값을 유지합니다.</footer>
  </main>;
}
