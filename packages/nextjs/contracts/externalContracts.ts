import EarnGridVault4626Artifact from "../../foundry/out/EarnGridVault4626.sol/EarnGridVault4626.json";
import StrategyArtifact from "../../foundry/out/StrategyERC4626.sol/StrategyERC4626.json";
import type { Abi } from "abitype";
import { zeroAddress } from "viem";
import type { GenericContractsDeclaration } from "~~/utils/scaffold-eth/contract";

const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID || 31337);
const vaultAddressEnv = (process.env.NEXT_PUBLIC_EARNGRID_VAULT_ADDRESS || "") as `0x${string}`;
const strategyAddressEnv = (process.env.NEXT_PUBLIC_EULER_STRATEGY_ADDRESS || "") as `0x${string}`;

const isNonZero = (addr?: string) => !!addr && addr !== zeroAddress;

const externalContracts: GenericContractsDeclaration = {};
const chainContracts: Record<string, { address: `0x${string}`; abi: Abi }> = {};

if (isNonZero(vaultAddressEnv)) {
  chainContracts.EarnGridVault4626 = {
    address: vaultAddressEnv,
    abi: EarnGridVault4626Artifact.abi as Abi,
  };
}

if (isNonZero(strategyAddressEnv)) {
  chainContracts.EulerEarnStrategy = {
    address: strategyAddressEnv,
    abi: StrategyArtifact.abi as Abi,
  };
}

if (Object.keys(chainContracts).length > 0) {
  externalContracts[chainId] = chainContracts as any;
}

export default externalContracts;
