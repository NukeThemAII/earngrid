# EarnGrid – EulerEarn-powered ERC-4626 vault

EarnGrid is a DeFi yield vault that wraps EulerEarn. Users deposit USDC/USDT into an ERC-4626 vault (`EarnGridVault4626`) that routes funds into a strategy (`StrategyERC4626`) targeting an EulerEarn ERC-4626 vault. A protocol performance fee (capped at 10%) is taken as fee shares minted to the fee recipient on positive yield only.

## Stack and layout
- Next.js 15 + React 19 + Tailwind + RainbowKit/Wagmi/Viem in `packages/nextjs`.
- Foundry contracts in `packages/foundry` (Solidity 0.8.x, OpenZeppelin).
- Monorepo managed with Yarn workspaces (`yarn@3.2.3`); Node >= 20.18.3.
- Key contracts: `EarnGridVault4626`, `StrategyERC4626`, `strategies/EulerEarnStrategy`.
- Project structure:
  - `packages/nextjs` – frontend app (RainbowKit/Wagmi/Viem, Tailwind).
  - `packages/foundry` – Solidity contracts, scripts, tests.
  - `packages/foundry/contracts/src` – core contracts.
  - `packages/foundry/test` – Foundry tests and mocks.

## Requirements
- Node >= 20.18.3 (current local: 24.11.1)
- Yarn (Corepack-enabled)
- Foundry (`curl -L https://foundry.paradigm.xyz | bash && foundryup`)
- Git

## Setup
```bash
yarn install
```

Environment:
- Copy `packages/nextjs/.env.example` to `.env.local` and fill values (RPC, WalletConnect project ID, contract addresses). Do not commit secrets.
- Copy `packages/foundry/.env.example` to `.env` and fill values (RPC URLs, `CHAIN_ID`, `DEPLOYER_PRIVATE_KEY`, EulerEarn vault addresses for USDC/USDT, block explorer keys).

## Development
- Start local chain (Foundry anvil via scaffold script): `yarn chain`
- Deploy contracts to local chain (current scaffold scripts): `yarn deploy`
- Frontend dev server: `yarn start` (Next.js at http://localhost:3000)
- Contract tests: `yarn foundry:test` (or `forge test` inside `packages/foundry`)
- Lint frontend/format: `yarn lint` / `yarn format`

## Contract architecture
- `EarnGridVault4626`: ERC-4626 vault with a capped 10% performance fee minted as shares to the fee recipient on positive yield only. Ownable admin controls performance fee, fee recipient, and pluggable strategy. Deposits/mints auto-push assets to the active strategy; withdraw/redeem pull back from the strategy as needed. Reentrancy guards wrap entrypoints.
- `StrategyERC4626`: abstract ERC-4626 strategy base with vault-only `invest/divest/harvest`, totalAssets passthrough to the target ERC-4626, and allowance resets for safer approvals.
- `EulerEarnStrategy`: concrete implementation that approves and deposits into a configured EulerEarn ERC-4626 vault.

## Testing
- Contracts: `yarn foundry:test` (from repo root) or `forge test` inside `packages/foundry`.
- Frontend lint/tests: `yarn lint` / `yarn test` (when added).

## TODO
- Review and, if needed, upgrade Next/React/wagmi/RainbowKit/viem to the latest stable compatible versions after scaffold baseline.
- Add deployment/config scripts for mainnet targets once EulerEarn vault addresses are finalized.
