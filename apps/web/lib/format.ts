import { formatUnits } from "viem";

export function formatUsd(value: bigint | string, decimals = 6, maximumFractionDigits = 2): string {
  const amount = typeof value === "string" ? BigInt(value) : value;
  const asNumber = Number(formatUnits(amount, decimals));
  if (!Number.isFinite(asNumber)) {
    return "--";
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits,
  }).format(asNumber);
}

export function formatNumber(value: bigint | string, decimals = 6, maximumFractionDigits = 4): string {
  const amount = typeof value === "string" ? BigInt(value) : value;
  const asNumber = Number(formatUnits(amount, decimals));
  if (!Number.isFinite(asNumber)) {
    return "--";
  }
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits,
  }).format(asNumber);
}

export function formatPercent(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "--";
  }
  return `${(value * 100).toFixed(2)}%`;
}

export function shortenAddress(address: string): string {
  if (!address) {
    return "--";
  }
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
