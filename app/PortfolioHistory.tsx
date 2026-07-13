"use client";

type TimelinePoint = { readonly id: string; readonly label: string; readonly value: number };
type ChartRange = "1d" | "7d" | "all";

type PortfolioHistoryProps = {
  readonly points: readonly TimelinePoint[];
  readonly range: ChartRange;
  readonly onRangeChange: (range: ChartRange) => void;
  readonly onSnapshot: () => void;
  readonly formatKrw: (value: number) => string;
};

const ranges: readonly { readonly value: ChartRange; readonly label: string }[] = [{ value: "1d", label: "1일" }, { value: "7d", label: "7일" }, { value: "all", label: "전체" }];

export function PortfolioHistory({ points, range, onRangeChange, onSnapshot, formatKrw }: PortfolioHistoryProps) {
  const values = points.map((point) => point.value);
  const maximum = Math.max(...values, 1);
  const minimum = Math.min(...values, maximum);
  const valueRange = Math.max(maximum - minimum, 1);
  const chartPoints = points.map((point, index) => ({ ...point, x: 8 + (index / Math.max(points.length - 1, 1)) * 84, y: 92 - ((point.value - minimum) / valueRange) * 84 }));
  const linePoints = chartPoints.map((point) => `${point.x},${point.y}`).join(" ");
  return <section className="raoniHistory" aria-label="포트폴리오 가치 기록">
    <div className="raoniSectionHead"><div><p className="raoniEyebrow">PORTFOLIO VALUE</p><h2>포트폴리오 가치</h2></div><button type="button" className="snapshotButton" onClick={onSnapshot}>스냅샷 저장</button></div>
    <div className="historyControls" role="group" aria-label="차트 기간">{ranges.map((item) => <button key={item.value} type="button" className={range === item.value ? "active" : ""} onClick={() => onRangeChange(item.value)}>{item.label}</button>)}</div>
    <p className="historyLegend">일일 기준값과 직접 저장한 스냅샷을 함께 표시합니다.</p>
    {points.length === 0 ? <div className="raoniEmpty">가격이 준비되면 가치 기록이 표시됩니다.</div> : <div className="raoniChart"><svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="포트폴리오 가치 추이"><polyline className="chartLine" points={linePoints} />{chartPoints.map((point) => <circle key={point.id} className="chartPoint" cx={point.x} cy={point.y} r="1.8"><title>{`${point.label} · ${formatKrw(point.value)}`}</title></circle>)}</svg><div className="chartLabels">{points.map((point) => <small key={point.id}>{point.label} · {formatKrw(point.value)}</small>)}</div></div>}
  </section>;
}
