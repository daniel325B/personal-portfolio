"use client";

type AllocationItem = { readonly label: string; readonly value: number };

type PortfolioAllocationProps = {
  readonly positions: readonly AllocationItem[];
  readonly sectors: readonly AllocationItem[];
  readonly totalValue: number;
  readonly formatKrw: (value: number) => string;
};

function AllocationList({ items, totalValue, formatKrw }: { readonly items: readonly AllocationItem[]; readonly totalValue: number; readonly formatKrw: (value: number) => string }) {
  return <div className="allocationList">{items.length === 0 ? <p className="allocationEmpty">포지션을 추가하면 비중을 표시합니다.</p> : items.map((item) => {
    const percentage = totalValue === 0 ? 0 : (item.value / totalValue) * 100;
    return <div className="allocationRow" key={item.label}><div><b>{item.label}</b><span>{percentage.toFixed(1)}%</span></div><i><em style={{ width: `${percentage}%` }} /></i><small>{formatKrw(item.value)}</small></div>;
  })}</div>;
}

export function PortfolioAllocation({ positions, sectors, totalValue, formatKrw }: PortfolioAllocationProps) {
  return <section className="allocationGrid" aria-label="자산 비중"><article><p className="raoniEyebrow">POSITION WEIGHT</p><h2>포지션 비중</h2><AllocationList items={positions} totalValue={totalValue} formatKrw={formatKrw} /></article><article><p className="raoniEyebrow">SECTOR WEIGHT</p><h2>섹터 비중</h2><AllocationList items={sectors} totalValue={totalValue} formatKrw={formatKrw} /></article></section>;
}
