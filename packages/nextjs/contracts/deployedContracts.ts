/**
 * This file seeds contract typing for Scaffold-ETH integrations.
 * Addresses are placeholders; env-driven externalContracts override them at runtime.
 */
import vaultArtifact from "../../foundry/out/EarnGridVault4626.sol/EarnGridVault4626.json";
import strategyArtifact from "../../foundry/out/StrategyERC4626.sol/StrategyERC4626.json";
import type { Abi } from "abitype";
import { zeroAddress } from "viem";
import { GenericContractsDeclaration } from "~~/utils/scaffold-eth/contract";

const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID || 31337);

const deployedContracts = {
  [chainId]: {
    EarnGridVault4626: {
      address: zeroAddress,
      abi: vaultArtifact.abi as Abi,
    },
    EulerEarnStrategy: {
      address: zeroAddress,
      abi: strategyArtifact.abi as Abi,
    },
  },
} as const satisfies GenericContractsDeclaration;

export default deployedContracts;
