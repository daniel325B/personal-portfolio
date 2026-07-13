"use client";

import { type FormEvent, useEffect, useState } from "react";
import { type AssetKind, type PositionForm, type StockCandidate, formForKind, isAccountKind, isAssetKind, isRecord } from "./portfolio-model";

type PortfolioAssetFormProps = {
  readonly onAdd: (form: PositionForm, candidate: StockCandidate | null) => boolean;
};

function isCandidate(value: unknown): value is StockCandidate {
  return isRecord(value) && typeof value.name === "string" && typeof value.symbol === "string";
}

export function PortfolioAssetForm({ onAdd }: PortfolioAssetFormProps) {
  const [form, setForm] = useState<PositionForm>(formForKind("crypto"));
  const [candidates, setCandidates] = useState<readonly StockCandidate[]>([]);
  const [selected, setSelected] = useState<StockCandidate | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchMessage, setSearchMessage] = useState("");

  useEffect(() => {
    if (form.kind !== "equity" || form.name.trim().length < 2) {
      return undefined;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const response = await fetch(`/api/stock/search?query=${encodeURIComponent(form.name.trim())}`, { signal: controller.signal });
        const payload: unknown = response.ok ? await response.json() : null;
        const next = isRecord(payload) && Array.isArray(payload.candidates) ? payload.candidates.filter(isCandidate) : [];
        setCandidates(next);
        setSearchMessage(response.ok ? (next.length === 0 ? "검색 결과가 없습니다." : "") : "종목 검색을 잠시 사용할 수 없습니다.");
      } catch (error) {
        if (!(error instanceof Error)) throw error;
        if (error.name !== "AbortError") { setCandidates([]); setSearchMessage("종목 검색을 잠시 사용할 수 없습니다."); }
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 300);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [form.kind, form.name]);

  function updateKind(value: string): void {
    if (!isAssetKind(value)) return;
    const kind: AssetKind = value;
    setForm(formForKind(kind));
    setCandidates([]);
    setSelected(null);
    setSearchMessage("");
    setSearching(false);
  }

  function updateAccount(value: string): void {
    if (!isAccountKind(value)) return;
    setForm((current) => ({ ...current, account: value }));
  }

  function updateName(name: string): void {
    setForm((current) => ({ ...current, name }));
    setSelected(null);
    setSearchMessage("");
    if (name.trim().length < 2) { setCandidates([]); setSearching(false); }
  }

  function choose(candidate: StockCandidate): void {
    setForm((current) => ({ ...current, name: candidate.name, symbol: candidate.symbol }));
    setSelected(candidate);
    setCandidates([]);
    setSearchMessage("");
    setSearching(false);
  }

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (onAdd(form, selected)) {
      setForm({ ...formForKind(form.kind), account: form.account });
      setCandidates([]);
      setSelected(null);
      setSearchMessage("");
      setSearching(false);
    }
  }

  const showManualQuote = form.kind === "other";
  const showAverageCost = form.kind === "crypto" || form.kind === "equity" || form.kind === "other";

  return <form className="raoniForm" onSubmit={submit}>
    <p className="raoniEyebrow">ADD POSITION</p><h2>자산 추가</h2>
    <label>계정 구분<select value={form.account} onChange={(event) => updateAccount(event.target.value)}><option value="spot">현물</option><option value="futures">선물</option></select></label>
    <label>자산 유형<select value={form.kind} onChange={(event) => updateKind(event.target.value)}><option value="crypto">코인 / USD</option><option value="equity">국내 주식 / KRW</option><option value="cash">현금 / KRW</option><option value="other">기타 자산 / KRW</option></select></label>
    <label>{form.kind === "equity" ? "종목명 검색" : "이름"}<input value={form.name} onChange={(event) => updateName(event.target.value)} placeholder={form.kind === "equity" ? "예: 삼성전자" : "예: 비트코인 또는 예금"} /></label>
    {form.kind === "equity" ? <div className="stockSearch" aria-live="polite">
      {searching ? <small>종목을 찾고 있습니다.</small> : null}
      {searchMessage.length > 0 ? <small>{searchMessage}</small> : null}
      {form.name.trim().length >= 2 ? candidates.map((candidate) => <button key={candidate.symbol} type="button" onClick={() => choose(candidate)}>{candidate.name}<small>{candidate.symbol}</small></button>) : null}
    </div> : null}
    {form.kind !== "cash" ? <label>{form.kind === "equity" ? "매칭 종목코드" : "식별 코드"}<input value={form.symbol} onChange={(event) => setForm((current) => ({ ...current, symbol: event.target.value }))} placeholder={form.kind === "crypto" ? "BTC 또는 USDT" : "선택 사항"} />{form.kind === "crypto" ? <small>바이비트 USDT는 현물 · 코드 USDT로 입력하면 KRW-USDT 시세를 자동 반영합니다.</small> : null}</label> : null}
    <label>{form.kind === "cash" ? "보유 현금 (KRW)" : "보유 수량"}<input inputMode="decimal" value={form.quantity} onChange={(event) => setForm((current) => ({ ...current, quantity: event.target.value }))} /></label>
    {showManualQuote ? <label>현재 단가 (KRW)<input inputMode="decimal" value={form.manualQuote} onChange={(event) => setForm((current) => ({ ...current, manualQuote: event.target.value }))} /></label> : null}
    {showAverageCost ? <label>평균 매입가 ({form.kind === "crypto" ? "USD" : "KRW"})<input inputMode="decimal" value={form.averageCost} onChange={(event) => setForm((current) => ({ ...current, averageCost: event.target.value }))} /></label> : null}
    <label>섹터<input value={form.sector} onChange={(event) => setForm((current) => ({ ...current, sector: event.target.value }))} placeholder="예: 가상자산, 국내 주식" /></label>
    <button type="submit">포지션 추가</button>
  </form>;
}
