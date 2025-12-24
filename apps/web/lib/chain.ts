import { base, baseSepolia } from "viem/chains";

export const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? base.id);
export const chain = chainId === baseSepolia.id ? baseSepolia : base;

export const defaultRpcUrl =
  process.env.NEXT_PUBLIC_RPC_URL ??
  (chain.id === baseSepolia.id ? "https://sepolia.base.org" : "https://mainnet.base.org");

export const vaultAddress = (process.env.NEXT_PUBLIC_VAULT_ADDRESS ?? "") as `0x${string}`;
export const usdcAddress = (process.env.NEXT_PUBLIC_USDC_ADDRESS ?? "") as `0x${string}`;
export const usdcDecimals = Number(process.env.NEXT_PUBLIC_USDC_DECIMALS ?? 6);
