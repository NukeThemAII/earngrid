import type { Address } from "viem";

export type VaultState = {
  asset: Address;
  totalAssets: bigint;
  totalSupply: bigint;
  assetsPerShare: bigint;
  feeRecipient: Address;
  highWatermarkAssetsPerShare: bigint;
  pausedDeposits: boolean;
  pausedWithdrawals: boolean;
  idleLiquidityBps: number;
  minInitialDeposit: bigint;
  minHarvestInterval: bigint;
  tierMaxBps: [number, number, number];
  decimals: number;
};

export type StrategyConfig = {
  registered: boolean;
  enabled: boolean;
  tier: number;
  capAssets: bigint;
  isSynchronous: boolean;
};

export type StrategyAllocation = StrategyConfig & {
  strategy: Address;
  assets: bigint;
};

export type VaultQueues = {
  depositQueue: Address[];
  withdrawQueue: Address[];
};

export type UserPosition = {
  shares: bigint;
  maxWithdraw: bigint;
  maxRedeem: bigint;
};
