export const assetKinds = ["crypto", "equity", "cash", "other"] as const;
export type AssetKind = (typeof assetKinds)[number];
export const accountKinds = ["spot", "futures"] as const;
export type AccountKind = (typeof accountKinds)[number];
export type QuoteState = "live" | "manual" | "stale" | "pending";

export type Asset = {
  readonly id: string;
  readonly kind: AssetKind;
  readonly name: string;
  readonly symbol: string;
  readonly quantity: number;
  readonly averageCost: number;
  readonly quote: number;
  readonly quoteState: QuoteState;
  readonly account?: AccountKind;
  readonly sector?: string;
};

export type PositionForm = {
  readonly kind: AssetKind;
  readonly name: string;
  readonly symbol: string;
  readonly quantity: string;
  readonly averageCost: string;
  readonly manualQuote: string;
  readonly account: AccountKind;
  readonly sector: string;
};

export type MarketSnapshot = {
  readonly usdKrw: number | null;
  readonly usdtKrw: number | null;
  readonly refreshedAt: string | null;
};

export type StockCandidate = {
  readonly name: string;
  readonly symbol: string;
};

export const emptyMarket: MarketSnapshot = { usdKrw: null, usdtKrw: null, refreshedAt: null };
export const emptyForm: PositionForm = { kind: "crypto", name: "", symbol: "", quantity: "", averageCost: "", manualQuote: "", account: "spot", sector: "가상자산" };

export function isAssetKind(value: string): value is AssetKind {
  return assetKinds.some((kind) => kind === value);
}

export function isAccountKind(value: string): value is AccountKind {
  return accountKinds.some((account) => account === value);
}

export function formForKind(kind: AssetKind): PositionForm {
  if (kind === "cash") return { ...emptyForm, kind, name: "KRW 현금", symbol: "KRW", manualQuote: "1", sector: "현금" };
  if (kind === "equity") return { ...emptyForm, kind, sector: "국내 주식" };
  if (kind === "other") return { ...emptyForm, kind, symbol: "OTHER", sector: "기타" };
  return { ...emptyForm, kind, sector: "가상자산" };
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function isAsset(value: unknown): value is Asset {
  return isRecord(value)
    && (value.kind === "crypto" || value.kind === "equity" || value.kind === "cash" || value.kind === "other")
    && typeof value.id === "string"
    && typeof value.name === "string"
    && typeof value.symbol === "string"
    && typeof value.quantity === "number"
    && typeof value.averageCost === "number"
    && typeof value.quote === "number"
    && (value.quoteState === "live" || value.quoteState === "manual" || value.quoteState === "stale" || value.quoteState === "pending");
}

export function quoteLabel(asset: Asset): string {
  if (asset.quoteState === "live") return "LIVE";
  if (asset.quoteState === "manual") return "MANUAL";
  if (asset.quoteState === "stale") return "LAST QUOTE";
  return "WAITING";
}
