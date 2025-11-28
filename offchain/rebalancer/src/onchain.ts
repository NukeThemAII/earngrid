import { type Hex, formatUnits } from "viem";
import { baseClient } from "./providers.js";
import { earngridVaultAbi } from "./abi/earngridVault.js";
import { erc4626Abi } from "./abi/erc4626.js";
import { erc20Abi } from "./abi/erc20.js";
import { StrategyObservation } from "./optimizer.js";
import { vaultConfig } from "./config.js";

export type VaultState = {
  asset: Hex;
  totalAssets: bigint;
  totalSupply: bigint;
  sharePriceAtomic: bigint;
  sharePrice: string;
  assetDecimals: number;
};

export async function fetchVaultState(vaultAddress: Hex): Promise<VaultState> {
  const [asset, totalAssets, totalSupply] = await baseClient.multicall({
    contracts: [
      { address: vaultAddress, abi: earngridVaultAbi, functionName: "asset" },
      { address: vaultAddress, abi: earngridVaultAbi, functionName: "totalAssets" },
      { address: vaultAddress, abi: earngridVaultAbi, functionName: "totalSupply" }
    ]
  });

  const assetAddress = (asset.result ?? "0x0000000000000000000000000000000000000000") as Hex;
  const assets = (totalAssets.result ?? 0n) as bigint;
  const supply = (totalSupply.result ?? 0n) as bigint;
  const sharePriceAtomic = supply === 0n ? 10n ** 18n : (assets * 10n ** 18n) / supply;
  const decimals = await baseClient.readContract({ address: assetAddress, abi: erc20Abi, functionName: "decimals" });

  return {
    asset: assetAddress,
    totalAssets: assets,
    totalSupply: supply,
    sharePriceAtomic,
    sharePrice: formatUnits(sharePriceAtomic, 18),
    assetDecimals: Number(decimals)
  };
}

export async function fetchObservations(strategies: { address: string; targetApy: number }[]): Promise<StrategyObservation[]> {
  if (strategies.length === 0) return [];

  // 1. Fetch assets for all strategies
  const assetResults = await baseClient.multicall({
    contracts: strategies.map((s) => ({
      address: s.address as Hex,
      abi: erc4626Abi,
      functionName: "asset"
    })),
    allowFailure: true
  });

  // 2. Prepare calls for totalAssets and decimals
  // We need to handle cases where asset fetch failed
  const calls: any[] = [];
  const strategyIndices: number[] = []; // Maps call index back to strategy index

  strategies.forEach((s, i) => {
    const assetResult = assetResults[i];
    if (assetResult.status === "success" && assetResult.result) {
      const asset = assetResult.result;
      // Call 1: Strategy totalAssets
      calls.push({ address: s.address as Hex, abi: erc4626Abi, functionName: "totalAssets" });
      // Call 2: Asset decimals
      calls.push({ address: asset, abi: erc20Abi, functionName: "decimals" });
      strategyIndices.push(i);
    }
  });

  const results = await baseClient.multicall({ contracts: calls, allowFailure: true });

  // 3. Map results back to observations
  const observations = strategies.map((s) => ({
    address: s.address,
    apy: s.targetApy,
    tvl: 0 // Default to 0
  }));

  for (let i = 0; i < strategyIndices.length; i++) {
    const strategyIndex = strategyIndices[i];
    const totalAssetsResult = results[i * 2];
    const decimalsResult = results[i * 2 + 1];

    if (totalAssetsResult.status === "success" && decimalsResult.status === "success") {
      const totalAssets = totalAssetsResult.result as bigint;
      const decimals = Number(decimalsResult.result);
      observations[strategyIndex].tvl = Number(formatUnits(totalAssets, decimals));
    }
  }

  return observations;
}

export function deriveObservations(vaultTotalAssets: bigint): StrategyObservation[] {
  // Fallback: return 0 TVL for all strategies
  // This prevents the rebalancer from acting on stale/mock data when the network is down
  return vaultConfig.strategies.map((s) => ({
    address: s.address,
    apy: s.targetApy,
    tvl: 0
  }));
}
