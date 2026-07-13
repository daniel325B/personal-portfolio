"use client";

import { type FormEvent, useEffect, useState } from "react";
import { type Asset, type AssetKind, type PositionForm, type StockCandidate, formForAsset, formForKind, isAccountKind, isAssetKind, isRecord } from "./portfolio-model";

type PortfolioAssetFormProps = {
  readonly onAdd: (form: PositionForm, candidate: StockCandidate | null) => boolean;
  readonly onUpdate: (id: string, form: PositionForm, candidate: StockCandidate | null) => boolean;
  readonly editingAsset: Asset | null;
  readonly onCancelEdit: () => void;
};

function isCandidate(value: unknown): value is StockCandidate {
  return isRecord(value) && typeof value.name === "string" && typeof value.symbol === "string";
}

export function PortfolioAssetForm({ onAdd, onUpdate, editingAsset, onCancelEdit }: PortfolioAssetFormProps) {
  const [form, setForm] = useState<PositionForm>(() => editingAsset === null ? formForKind("crypto") : formForAsset(editingAsset));
  const [candidates, setCandidates] = useState<readonly StockCandidate[]>([]);
  const [selected, setSelected] = useState<StockCandidate | null>(() => editingAsset?.kind === "equity" ? { name: editingAsset.name, symbol: editingAsset.symbol } : null);
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
    const saved = editingAsset === null ? onAdd(form, selected) : onUpdate(editingAsset.id, form, selected);
    if (saved) {
      setForm({ ...formForKind(form.kind), account: form.account });
      setCandidates([]);
      setSelected(null);
      setSearchMessage("");
      setSearching(false);
    }
  }

  function cancelEdit(): void {
    setForm(formForKind("crypto"));
    setCandidates([]);
    setSelected(null);
    setSearchMessage("");
    setSearching(false);
    onCancelEdit();
  }

  const showManualQuote = form.kind === "other";
  const showAverageCost = form.kind === "crypto" || form.kind === "equity" || form.kind === "other";

  return <form className="raoniForm" onSubmit={submit}>
    <p className="raoniEyebrow">{editingAsset === null ? "ADD POSITION" : "EDIT POSITION"}</p><h2>{editingAsset === null ? "자산 추가" : "자산 수정"}</h2>
    <label>계정 구분<select value={form.account} onChange={(event) => updateAccount(event.target.value)}><option value="spot">현물</option><option value="futures">선물</option></select></label>
    <label>자산 유형<select value={form.kind} onChange={(event) => updateKind(event.target.value)}><option value="crypto">코인 / USD</option><option value="equity">국내 주식 / KRW</option><option value="cash">현금 / KRW</option><option value="other">기타 자산 / KRW</option></select></label>
    <label>{form.kind === "equity" ? "종목명 검색" : "이름"}<input value={form.name} onChange={(event) => updateName(event.target.value)} placeholder={form.kind === "equity" ? "예: 삼성전자" : "예: 비트코인 또는 예금"} /></label>
    {form.kind === "equity" ? <div className="stockSearch" aria-live="polite">
      {searching ? <small>종목을 찾고 있습니다.</small> : null}
      {searchMessage.length > 0 ? <small>{searchMessage}</small> : null}
      {form.name.trim().length >= 2 ? candidates.map((candidate) => <button key={candidate.symbol} type="button" onClick={() => choose(candidate)}>{candidate.name}<small>{candidate.symbol}</small></button>) : null}
    </div> : null}
    {form.kind !== "cash" ? <label>{form.kind === "equity" ? "매칭 종목코드" : "식별 코드"}<input value={form.symbol} onChange={(event) => setForm((current) => ({ ...current, symbol: event.target.value }))} placeholder={form.kind === "crypto" ? "BTC, USDT, USDC 또는 SKHX" : "선택 사항"} />{form.kind === "crypto" ? <small>바이비트 USDT, Hyperliquid USDC와 Stock 선물 티커 SKHX를 자동으로 조회합니다.</small> : null}</label> : null}
    <label>{form.kind === "cash" ? "보유 현금 (KRW)" : "보유 수량"}<input inputMode="decimal" value={form.quantity} onChange={(event) => setForm((current) => ({ ...current, quantity: event.target.value }))} /></label>
    {showManualQuote ? <label>현재 단가 (KRW)<input inputMode="decimal" value={form.manualQuote} onChange={(event) => setForm((current) => ({ ...current, manualQuote: event.target.value }))} /></label> : null}
    {showAverageCost ? <label>평균 매입가 ({form.kind === "crypto" ? "USD" : "KRW"})<input inputMode="decimal" value={form.averageCost} onChange={(event) => setForm((current) => ({ ...current, averageCost: event.target.value }))} /></label> : null}
    <label>섹터<input value={form.sector} onChange={(event) => setForm((current) => ({ ...current, sector: event.target.value }))} placeholder="예: 가상자산, 국내 주식" /></label>
    <button type="submit">{editingAsset === null ? "포지션 추가" : "수정 저장"}</button>
    {editingAsset === null ? null : <button className="cancelEdit" type="button" onClick={cancelEdit}>수정 취소</button>}
  </form>;
}
