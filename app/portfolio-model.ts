export const assetKinds = ["crypto", "equity", "cash", "other"] as const;
export type AssetKind = (typeof assetKinds)[number];
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
};

export type PositionForm = {
  readonly kind: AssetKind;
  readonly name: string;
  readonly symbol: string;
  readonly quantity: string;
  readonly averageCost: string;
  readonly manualQuote: string;
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
export const emptyForm: PositionForm = { kind: "crypto", name: "", symbol: "", quantity: "", averageCost: "", manualQuote: "" };

export function isAssetKind(value: string): value is AssetKind {
  return assetKinds.some((kind) => kind === value);
}

export function formForKind(kind: AssetKind): PositionForm {
  if (kind === "cash") return { ...emptyForm, kind, name: "KRW 현금", symbol: "KRW", manualQuote: "1" };
  if (kind === "other") return { ...emptyForm, kind, symbol: "OTHER" };
  return { ...emptyForm, kind };
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
