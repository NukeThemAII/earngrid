import EarnGridVault4626Artifact from "../../foundry/out/EarnGridVault4626.sol/EarnGridVault4626.json";
import StrategyArtifact from "../../foundry/out/StrategyERC4626.sol/StrategyERC4626.json";
import type { Abi } from "abitype";
import { zeroAddress } from "viem";
import { GenericContractsDeclaration } from "~~/utils/scaffold-eth/contract";

const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID || 31337);
const vaultAddress = (process.env.NEXT_PUBLIC_EARNGRID_VAULT_ADDRESS || zeroAddress) as `0x${string}`;
const strategyAddress = (process.env.NEXT_PUBLIC_EULER_STRATEGY_ADDRESS || zeroAddress) as `0x${string}`;

const externalContracts = {
  [chainId]: {
    EarnGridVault4626: {
      address: vaultAddress,
      abi: EarnGridVault4626Artifact.abi as Abi,
    },
    EulerEarnStrategy: {
      address: strategyAddress,
      abi: StrategyArtifact.abi as Abi,
    },
  },
} as const satisfies GenericContractsDeclaration;

export default externalContracts;
