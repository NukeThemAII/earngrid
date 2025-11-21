"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Address } from "@scaffold-ui/components";
import type { Abi } from "abitype";
import type { NextPage } from "next";
import { erc20Abi, formatUnits, parseUnits, zeroAddress } from "viem";
import { useAccount, useBalance, useReadContract, useWriteContract } from "wagmi";
import {
  ArrowTrendingUpIcon,
  BanknotesIcon,
  BoltIcon,
  ChartBarIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import vaultAbi from "~~/../foundry/out/EarnGridVault4626.sol/EarnGridVault4626.json";
import strategyAbi from "~~/../foundry/out/StrategyERC4626.sol/StrategyERC4626.json";
import { useDeployedContractInfo, useTargetNetwork } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth/notification";

type MetricCardProps = {
  title: string;
  value: string;
  caption?: string;
  icon?: React.ReactNode;
};

const MetricCard = ({ title, value, caption, icon }: MetricCardProps) => (
  <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-lg shadow-black/30 hover:shadow-indigo-500/10 transition">
    <div className="flex items-center justify-between mb-2">
      <p className="text-sm text-slate-300">{title}</p>
      {icon}
    </div>
    <p className="text-2xl font-semibold text-slate-50">{value}</p>
    {caption && <p className="text-xs text-slate-400 mt-1">{caption}</p>}
  </div>
);

const formatTokenAmount = (value?: bigint, decimals = 18, maxFraction = 4) => {
  if (value === undefined) return "—";
  const num = Number(formatUnits(value, decimals));
  return num.toLocaleString("en-US", { maximumFractionDigits: maxFraction });
};

const formatPercentFromBps = (bps?: bigint) => {
  if (bps === undefined) return "—";
  return `${Number(bps) / 100}%`;
};

const isNonZeroAddress = (addr?: string | `0x${string}`) => !!addr && addr !== zeroAddress;

const Home: NextPage = () => {
  const { address: connectedAddress, chain: walletChain } = useAccount();
  const { targetNetwork } = useTargetNetwork();
  const envVaultAddress = process.env.NEXT_PUBLIC_EARNGRID_VAULT_ADDRESS as `0x${string}` | undefined;
  const envStrategyAddress = process.env.NEXT_PUBLIC_EULER_STRATEGY_ADDRESS as `0x${string}` | undefined;
  const { data: vaultContract } = useDeployedContractInfo({ contractName: "EarnGridVault4626" } as any);
  const vaultAddress = isNonZeroAddress(envVaultAddress) ? envVaultAddress : vaultContract?.address;
  const { writeContractAsync: writeVaultRaw, isPending: isVaultMining } = useWriteContract();
  const { writeContractAsync: writeErc20 } = useWriteContract();

  const [depositInput, setDepositInput] = useState("");
  const [withdrawInput, setWithdrawInput] = useState("");

  const vaultAbiData = vaultAbi.abi as Abi;

  const { data: assetAddress } = useReadContract({
    address: vaultAddress,
    abi: vaultAbiData,
    functionName: "asset",
    query: { enabled: !!vaultAddress },
  }) as { data?: `0x${string}` };

  const { data: feeRecipient } = useReadContract({
    address: vaultAddress,
    abi: vaultAbiData,
    functionName: "feeRecipient",
    query: { enabled: !!vaultAddress },
  }) as { data?: `0x${string}` };

  const { data: performanceFeeBps } = useReadContract({
    address: vaultAddress,
    abi: vaultAbiData,
    functionName: "performanceFeeBps",
    query: { enabled: !!vaultAddress },
  }) as { data?: bigint };

  const { data: totalAssets } = useReadContract({
    address: vaultAddress,
    abi: vaultAbiData,
    functionName: "totalAssets",
    query: { enabled: !!vaultAddress },
  }) as { data?: bigint };

  const { data: totalSupply } = useReadContract({
    address: vaultAddress,
    abi: vaultAbiData,
    functionName: "totalSupply",
    query: { enabled: !!vaultAddress },
  }) as { data?: bigint };

  const { data: strategyAddressOnChain } = useReadContract({
    address: vaultAddress,
    abi: vaultAbiData,
    functionName: "strategy",
    query: { enabled: !!vaultAddress },
  }) as { data?: `0x${string}` };

  const { data: userShares } = useReadContract({
    address: vaultAddress,
    abi: vaultAbiData,
    functionName: "balanceOf",
    args: [connectedAddress ?? zeroAddress],
    query: { enabled: !!vaultAddress && !!connectedAddress },
  }) as { data?: bigint };

  const { data: userAssets } = useReadContract({
    address: vaultAddress,
    abi: vaultAbiData,
    functionName: "convertToAssets",
    args: [userShares ?? 0n],
    query: { enabled: !!vaultAddress && userShares !== undefined },
  }) as { data?: bigint };

  const strategyAddress = isNonZeroAddress(envStrategyAddress) ? envStrategyAddress : strategyAddressOnChain;

  const { data: strategyAssets } = useReadContract({
    address: (strategyAddress as `0x${string}` | undefined) ?? zeroAddress,
    abi: strategyAbi.abi as Abi,
    functionName: "totalAssets",
    query: { enabled: !!strategyAddress },
  }) as { data?: bigint };

  const { data: assetDecimals } = useReadContract({
    address: assetAddress as `0x${string}` | undefined,
    abi: erc20Abi,
    functionName: "decimals",
    query: { enabled: !!assetAddress },
  });

  const { data: assetSymbol } = useReadContract({
    address: assetAddress as `0x${string}` | undefined,
    abi: erc20Abi,
    functionName: "symbol",
    query: { enabled: !!assetAddress },
  });

  const { data: rawAssetBalance } = useReadContract({
    address: assetAddress as `0x${string}` | undefined,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [vaultAddress ?? zeroAddress],
    query: { enabled: !!assetAddress && !!vaultAddress },
  });

  const { data: allowance } = useReadContract({
    address: assetAddress as `0x${string}` | undefined,
    abi: erc20Abi,
    functionName: "allowance",
    args: [connectedAddress ?? zeroAddress, vaultAddress ?? zeroAddress],
    query: { enabled: !!assetAddress && !!vaultAddress && !!connectedAddress },
  });

  const { data: userTokenBalance } = useBalance({
    address: connectedAddress,
    token: assetAddress as `0x${string}` | undefined,
    chainId: targetNetwork.id,
    query: { enabled: !!assetAddress && !!connectedAddress },
  });

  const decimals = assetDecimals ?? 18;
  const symbol = assetSymbol || process.env.NEXT_PUBLIC_EARNTOKEN_SYMBOL || "ASSET";

  const sharePrice = useMemo(() => {
    if (!totalAssets || !totalSupply || totalSupply === 0n) return "—";
    const scaled = (totalAssets * 10n ** BigInt(decimals)) / totalSupply;
    return Number(formatUnits(scaled, decimals)).toLocaleString("en-US", { maximumFractionDigits: 6 });
  }, [decimals, totalAssets, totalSupply]);

  const strategyPct = useMemo(() => {
    if (!strategyAssets || !totalAssets || totalAssets === 0n) return "—";
    const pct = Number((strategyAssets * 10_000n) / totalAssets) / 100;
    return `${pct.toFixed(2)}%`;
  }, [strategyAssets, totalAssets]);

  const walletIsOnTargetNetwork = !walletChain?.id || walletChain.id === targetNetwork.id;

  const safeParse = (value: string) => {
    try {
      const parsed = parseUnits(value || "0", decimals);
      return parsed > 0n ? parsed : null;
    } catch {
      return null;
    }
  };

  const depositAmountParsed = safeParse(depositInput);
  const withdrawAmountParsed = safeParse(withdrawInput);

  const ensureNetwork = () => {
    if (!walletIsOnTargetNetwork) {
      notification.error(`Switch wallet to ${targetNetwork.name} to interact with EarnGrid.`);
      return false;
    }
    return true;
  };

  const handleDeposit = async () => {
    if (!depositAmountParsed || !connectedAddress || !ensureNetwork() || !vaultAddress) return;
    await writeVaultRaw({
      address: vaultAddress as `0x${string}`,
      abi: vaultAbiData,
      functionName: "deposit",
      args: [depositAmountParsed, connectedAddress],
    });
    setDepositInput("");
  };

  const handleWithdraw = async () => {
    if (!withdrawAmountParsed || !connectedAddress || !ensureNetwork() || !vaultAddress) return;
    await writeVaultRaw({
      address: vaultAddress as `0x${string}`,
      abi: vaultAbiData,
      functionName: "withdraw",
      args: [withdrawAmountParsed, connectedAddress, connectedAddress],
    });
    setWithdrawInput("");
  };

  const handleMaxDeposit = () => {
    if (userTokenBalance?.value !== undefined) {
      setDepositInput(formatUnits(userTokenBalance.value, decimals));
    }
  };

  const handleMaxWithdraw = () => {
    if (userAssets !== undefined) {
      setWithdrawInput(formatUnits(userAssets, decimals));
    }
  };

  const handleApprove = async () => {
    if (!connectedAddress || !assetAddress || !vaultAddress || !ensureNetwork()) return;
    if (!depositAmountParsed) {
      notification.error("Enter an amount to approve");
      return;
    }
    try {
      await writeErc20({
        address: assetAddress as `0x${string}`,
        abi: erc20Abi,
        functionName: "approve",
        args: [vaultAddress as `0x${string}`, depositAmountParsed],
      });
    } catch (err) {
      console.error(err);
    }
  };

  const explorerUrl = targetNetwork.blockExplorers?.default.url;
  const toExplorer = (path: string) => (explorerUrl ? `${explorerUrl}/${path}` : undefined);

  const isConfigured = isNonZeroAddress(vaultAddress);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-10 space-y-8">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl shadow-indigo-500/10">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-indigo-300">EarnGrid</p>
              <h1 className="text-3xl md:text-4xl font-bold mt-1">EulerEarn-powered Stablecoin Vault</h1>
              <p className="text-slate-300 mt-2">
                Deposit {symbol} into an ERC-4626 vault that routes into EulerEarn. Performance fee capped at 10% and
                taken only on positive yield.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-indigo-500/10 px-4 py-2 text-indigo-200 text-sm border border-indigo-700/40">
                Target network: {targetNetwork.name}
              </div>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mt-6">
            <MetricCard
              title="Total Value Locked"
              value={`${formatTokenAmount(totalAssets, decimals, 2)} ${symbol}`}
              caption="Vault totalAssets (on-chain)"
              icon={<BanknotesIcon className="h-5 w-5 text-emerald-300" />}
            />
            <MetricCard
              title="Share Price"
              value={`${sharePrice} ${symbol}`}
              caption="totalAssets / totalSupply"
              icon={<ArrowTrendingUpIcon className="h-5 w-5 text-indigo-300" />}
            />
            <MetricCard
              title="Performance Fee"
              value={formatPercentFromBps(performanceFeeBps)}
              caption="Minted as shares on positive yield"
              icon={<ShieldCheckIcon className="h-5 w-5 text-amber-300" />}
            />
            <MetricCard
              title="Strategy Allocation"
              value={strategyPct}
              caption="Share of assets held in EulerEarn strategy"
              icon={<ChartBarIcon className="h-5 w-5 text-cyan-300" />}
            />
          </div>
        </div>

        {!isConfigured && (
          <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-amber-100">
            <p className="font-semibold">Vault not connected</p>
            <p className="text-sm mt-1">
              Configure `NEXT_PUBLIC_CHAIN_ID`, `NEXT_PUBLIC_EARNGRID_VAULT_ADDRESS`, and
              `NEXT_PUBLIC_EULER_STRATEGY_ADDRESS` in `.env.local`, then deploy contracts and restart the app.
            </p>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl shadow-black/30">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-slate-300">Your position</p>
                <p className="text-2xl font-semibold">
                  {formatTokenAmount(userAssets, decimals, 4)} {symbol}
                </p>
                <p className="text-sm text-slate-400">
                  {userShares ? `${formatTokenAmount(userShares, decimals, 4)} shares` : "—"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-300">Wallet balance</p>
                <p className="text-lg font-medium">
                  {userTokenBalance ? formatTokenAmount(userTokenBalance.value, decimals, 4) : "—"} {symbol}
                </p>
                <p className="text-xs text-slate-400">
                  Allowance: {allowance !== undefined ? formatTokenAmount(allowance, decimals, 4) : "—"}
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <BoltIcon className="h-5 w-5 text-emerald-300" />
                  <p className="font-semibold">Deposit {symbol}</p>
                </div>
                <input
                  value={depositInput}
                  onChange={e => setDepositInput(e.target.value)}
                  className="w-full rounded-xl bg-slate-800/70 border border-slate-700 px-3 py-3 text-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder={`0.00 ${symbol}`}
                  inputMode="decimal"
                />
                <div className="flex justify-between text-xs text-slate-400 mt-2">
                  <button onClick={handleMaxDeposit} className="underline hover:text-slate-200">
                    Max wallet
                  </button>
                  <span>Approval required for first deposit</span>
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={handleApprove}
                    className="flex-1 rounded-lg border border-slate-700 bg-slate-800/70 px-3 py-2 text-sm hover:border-indigo-500"
                    disabled={!isConfigured || !assetAddress || !depositAmountParsed}
                  >
                    Approve vault
                  </button>
                  <button
                    onClick={handleDeposit}
                    className="flex-1 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold hover:bg-indigo-500 disabled:opacity-50"
                    disabled={!isConfigured || !depositAmountParsed || isVaultMining}
                  >
                    Deposit
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <BanknotesIcon className="h-5 w-5 text-amber-300" />
                  <p className="font-semibold">Withdraw {symbol}</p>
                </div>
                <input
                  value={withdrawInput}
                  onChange={e => setWithdrawInput(e.target.value)}
                  className="w-full rounded-xl bg-slate-800/70 border border-slate-700 px-3 py-3 text-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder={`0.00 ${symbol}`}
                  inputMode="decimal"
                />
                <div className="flex justify-between text-xs text-slate-400 mt-2">
                  <button onClick={handleMaxWithdraw} className="underline hover:text-slate-200">
                    Max vault balance
                  </button>
                  <span>Withdrawals pull from strategy on-demand</span>
                </div>
                <button
                  onClick={handleWithdraw}
                  className="w-full mt-3 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold hover:bg-emerald-500 disabled:opacity-50"
                  disabled={!isConfigured || !withdrawAmountParsed || isVaultMining}
                >
                  Withdraw
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl shadow-black/30 space-y-4">
            <div>
              <p className="text-sm text-slate-300 mb-1">Vault contract</p>
              <Address
                address={vaultAddress}
                chain={targetNetwork}
                blockExplorerAddressLink={vaultAddress ? toExplorer(`address/${vaultAddress}`) : undefined}
              />
            </div>
            <div>
              <p className="text-sm text-slate-300 mb-1">Strategy (EulerEarn)</p>
              <Address
                address={strategyAddress as `0x${string}` | undefined}
                chain={targetNetwork}
                blockExplorerAddressLink={
                  strategyAddress ? toExplorer(`address/${strategyAddress as string}`) : undefined
                }
              />
              <p className="text-xs text-slate-400 mt-1">
                Strategy assets: {formatTokenAmount(strategyAssets, decimals, 4)} {symbol}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-300 mb-1">Fee recipient</p>
              <Address
                address={feeRecipient as `0x${string}` | undefined}
                chain={targetNetwork}
                blockExplorerAddressLink={feeRecipient ? toExplorer(`address/${feeRecipient as string}`) : undefined}
              />
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4 space-y-2">
              <p className="text-sm font-semibold text-slate-200">Powered by EulerEarn</p>
              <p className="text-sm text-slate-400">
                EarnGrid routes deposits into an EulerEarn ERC-4626 vault. Allocation and curator settings are managed
                by EulerEarn governance. Performance fees are realized as fee shares only on positive yield.
              </p>
              <Link
                href="https://docs.euler.finance/eulerearn"
                target="_blank"
                className="inline-flex items-center text-indigo-300 hover:text-indigo-200 text-sm underline"
              >
                EulerEarn docs
              </Link>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
              <p className="text-sm font-semibold text-slate-200 mb-1">Vault breakdown</p>
              <ul className="text-sm text-slate-300 space-y-1">
                <li>
                  Idle balance: {formatTokenAmount(rawAssetBalance, decimals, 4)} {symbol}
                </li>
                <li>
                  Strategy balance: {formatTokenAmount(strategyAssets, decimals, 4)} {symbol}
                </li>
                <li>Protocol fee: {formatPercentFromBps(performanceFeeBps)}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
