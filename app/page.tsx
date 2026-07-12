import type { Metadata } from "next";
import { PortfolioDashboardV3 } from "./PortfolioDashboardV3";

export const metadata: Metadata = {
  title: "Portfolio Ledger | 내 자산",
  description: "Hyperliquid USD와 국내 주식 KRW를 함께 추적하는 개인 포트폴리오",
};

export default function Home() {
  return <PortfolioDashboardV3 />;
}
