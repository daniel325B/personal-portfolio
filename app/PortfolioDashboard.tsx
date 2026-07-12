"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";

type AssetKind = "crypto" | "equity";
type Status = "live" | "manual" | "stale";
type Holding = { readonly id: string; readonly kind: AssetKind; readonly name: string; readonly symbol: string; readonly quantity: number; readonly price: number; readonly status: Status };
const money = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 0 });
const decimal = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 6 });
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;
const statusText = (status: Status): string => status === "live" ? "실시간 시세" : status === "manual" ? "수동 시세" : "저장된 시세";

export function PortfolioDashboard() {
  const [holdings, setHoldings] = useState<readonly Holding[]>([]);
  const [kind, setKind] = useState<AssetKind>("crypto");
  const [name, setName] = useState(""); const [symbol, setSymbol] = useState(""); const [quantity, setQuantity] = useState(""); const [price, setPrice] = useState("");
  const [fx, setFx] = useState(1380); const [usdt, setUsdt] = useState(1382); const [notice, setNotice] = useState("가격 데이터를 불러올 준비가 됐습니다."); const [history, setHistory] = useState<readonly number[]>([]);
  useEffect(() => { const raw = localStorage.getItem("portfolio-holdings"); if (raw) { try { const parsed: unknown = JSON.parse(raw); if (Array.isArray(parsed)) setHoldings(parsed.filter((item): item is Holding => isRecord(item) && typeof item.id === "string" && (item.kind === "crypto" || item.kind === "equity") && typeof item.name === "string" && typeof item.symbol === "string" && typeof item.quantity === "number" && typeof item.price === "number" && (item.status === "live" || item.status === "manual" || item.status === "stale"))); } catch { setNotice("저장된 보유 자산을 읽지 못했습니다."); } } }, []);
  useEffect(() => { localStorage.setItem("portfolio-holdings", JSON.stringify(holdings)); }, [holdings]);
  const total = useMemo(() => holdings.reduce((sum, holding) => sum + holding.quantity * holding.price, 0), [holdings]);
  async function refresh(): Promise<void> { setNotice("가격 데이터를 업데이트하고 있습니다."); try { const [midsRes, fxRes, usdtRes] = await Promise.all([fetch("https://api.hyperliquid.xyz/info", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type: "allMids" }) }), fetch("https://open.er-api.com/v6/latest/USD"), fetch("https://api.upbit.com/v1/ticker?markets=KRW-USDT")]); const mids: unknown = await midsRes.json(); const fxData: unknown = await fxRes.json(); const usdtData: unknown = await usdtRes.json(); const midMap = isRecord(mids) ? mids : {}; const rateMap = isRecord(fxData) && isRecord(fxData.rates) ? fxData.rates : {}; const nextFx = typeof rateMap.KRW === "number" ? rateMap.KRW : fx; const first = Array.isArray(usdtData) ? usdtData[0] : undefined; const nextUsdt = isRecord(first) && typeof first.trade_price === "number" ? first.trade_price : usdt; setFx(nextFx); setUsdt(nextUsdt); setHoldings((items) => items.map((holding) => { const raw = midMap[holding.symbol]; const usd = typeof raw === "string" ? Number(raw) : Number.NaN; return holding.kind === "crypto" && Number.isFinite(usd) ? { ...holding, price: usd * nextFx, status: "live" } : holding; })); setNotice("Hyperliquid, USD/KRW, USDT/KRW 데이터를 업데이트했습니다."); } catch { setHoldings((items) => items.map((holding) => holding.status === "live" ? { ...holding, status: "stale" } : holding)); setNotice("일부 데이터에 연결하지 못했습니다. 마지막 저장 가격을 표시합니다."); } }
  function add(event: FormEvent<HTMLFormElement>): void { event.preventDefault(); const nextQuantity = Number(quantity); const nextPrice = Number(price); if (!name.trim() || !symbol.trim() || !Number.isFinite(nextQuantity) || nextQuantity < 0 || (kind === "equity" && (!Number.isFinite(nextPrice) || nextPrice < 0))) { setNotice("이름, 코드, 0 이상의 수량과 국내주식 수동 시세를 확인하세요."); return; } setHoldings((items) => [...items, { id: crypto.randomUUID(), kind, name: name.trim(), symbol: symbol.trim().toUpperCase(), quantity: nextQuantity, price: kind === "equity" ? nextPrice : 0, status: kind === "equity" ? "manual" : "stale" }]); setName(""); setSymbol(""); setQuantity(""); setPrice(""); setNotice("포지션을 추가했습니다. 가격 새로고침으로 갱신하세요."); }
  useEffect(() => {
    const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
    try {
      const parsed: unknown = JSON.parse(localStorage.getItem("portfolio-history") ?? "{}");
      const historyByDate = isRecord(parsed) ? parsed : {};
      historyByDate[date] = total;
      const values = Object.entries(historyByDate)
        .filter((entry): entry is [string, number] => typeof entry[1] === "number")
        .sort(([left], [right]) => left.localeCompare(right))
        .slice(-365);
      localStorage.setItem("portfolio-history", JSON.stringify(Object.fromEntries(values)));
      setHistory(values.map(([, value]) => value));
    } catch {
      setNotice("일별 포트폴리오 기록을 저장하지 못했습니다.");
    }
  }, [total]);

  useEffect(() => {
    const equities = holdings.filter((holding) => holding.kind === "equity");
    if (equities.length === 0) return;
    void (async () => {
      try {
        const response = await fetch(`https://polling.finance.naver.com/api/realtime?query=${equities.map((holding) => `SERVICE_ITEM:${holding.symbol}`).join(",")}`);
        const payload: unknown = await response.json();
        const result = isRecord(payload) && isRecord(payload.result) ? payload.result : undefined;
        const areas = result && Array.isArray(result.areas) ? result.areas : [];
        const data = areas.flatMap((area) => isRecord(area) && Array.isArray(area.datas) ? area.datas : []);
        setHoldings((items) => items.map((holding) => {
          const match = data.find((item) => isRecord(item) && item.cd === holding.symbol);
          return isRecord(match) && typeof match.nv === "number" ? { ...holding, price: match.nv, status: "live" } : holding;
        }));
      } catch {
        setHoldings((items) => items.map((holding) => holding.kind === "equity" && holding.status === "live" ? { ...holding, status: "stale" } : holding));
      }
    })();
  }, [holdings.length]);

  return <main className="shell"><header className="top"><div><p className="eyebrow">PRIVATE ASSET LEDGER</p><h1>나의 자산 현황</h1><p className="muted">보유 수량은 이 브라우저에만 저장됩니다.</p></div><button className="primary" onClick={refresh}>가격 새로고침</button></header><section className="hero"><div><p className="label">총 평가액</p><strong>₩{money.format(total)}</strong><p className="muted">암호화폐 실시간가와 국내 주식 수동 또는 저장된 시세를 합산합니다.</p></div><div className="market"><span><b>USD/KRW</b> ₩{money.format(fx)}</span><span><b>USDT/KRW</b> ₩{money.format(usdt)}</span></div></section><p className="status" role="status">{notice}</p><section className="grid"><form className="panel form" onSubmit={add}><div><p className="eyebrow">ADD POSITION</p><h2>보유 자산 추가</h2></div><label>자산 유형<select value={kind} onChange={(event) => setKind(event.target.value === "equity" ? "equity" : "crypto")}><option value="crypto">코인</option><option value="equity">국내 주식</option></select></label><label>이름<input value={name} onChange={(event) => setName(event.target.value)} placeholder="예: 비트코인 또는 삼성전자" /></label><label>종목 코드<input value={symbol} onChange={(event) => setSymbol(event.target.value)} placeholder={kind === "crypto" ? "BTC" : "005930"} /></label><label>보유 수량<input inputMode="decimal" value={quantity} onChange={(event) => setQuantity(event.target.value)} placeholder="0" /></label>{kind === "equity" && <label>수동 현재가 (KRW)<input inputMode="decimal" value={price} onChange={(event) => setPrice(event.target.value)} placeholder="예: 82000" /></label>}<button className="primary" type="submit">포지션 추가</button></form><section className="panel"><div className="section-head"><div><p className="eyebrow">POSITIONS</p><h2>보유 포지션</h2></div><button className="plain" onClick={() => setHistory((items) => [...items.slice(-6), total])}>오늘 기록</button></div>{holdings.length === 0 ? <div className="empty">아직 보유 자산이 없습니다. 왼쪽에서 첫 포지션을 추가하세요.</div> : <div className="rows">{holdings.map((holding) => <article className="row" key={holding.id}><div><b>{holding.name}</b><small>{holding.symbol} · {holding.kind === "crypto" ? "코인" : "국내 주식"}</small></div><div><b>₩{money.format(holding.quantity * holding.price)}</b><small>{decimal.format(holding.quantity)} 보유 · {statusText(holding.status)}</small></div><button className="delete" onClick={() => setHoldings((items) => items.filter((item) => item.id !== holding.id))}>삭제</button></article>)}</div>}</section></section><section className="panel history"><div className="section-head"><div><p className="eyebrow">DAILY VALUE</p><h2>일별 포트폴리오 가치</h2></div><span>{history.length}개 기록</span></div>{history.length === 0 ? <div className="empty">오늘 기록 버튼을 누르면 일별 평가액 흐름을 이곳에서 확인할 수 있습니다.</div> : <div className="bars">{history.map((value, index) => <div key={`${value}-${index}`}><i style={{ height: `${Math.max(12, (value / Math.max(...history)) * 100)}%` }} /><small>₩{money.format(value)}</small></div>)}</div>}</section><footer><span>가격 출처: Hyperliquid · Naver Finance · ExchangeRate API · Upbit</span><span>국내 주식은 Naver 시세를 우선 사용하고 실패하면 수동 또는 저장된 시세를 표시합니다.</span></footer></main>;
}
