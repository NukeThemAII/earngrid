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
- Copy `packages/nextjs/.env.example` to `.env.local` and fill values (RPC, WalletConnect project ID, chain ID, EarnGrid vault + strategy + EulerEarn vault addresses). Do not commit secrets.
- Copy `packages/foundry/.env.example` to `.env` and fill values (RPC URLs, `CHAIN_ID`, `DEPLOYER_PRIVATE_KEY`, EulerEarn vault addresses for USDC/USDT, block explorer keys).

## Development
- Start local chain (Foundry anvil via scaffold script): `yarn chain`
- Deploy contracts to local chain (current scaffold scripts): `yarn deploy`
- Frontend dev server: `yarn start` (Next.js at http://localhost:3000)
- Contract tests: `yarn foundry:test` (or `forge test` inside `packages/foundry`)
- Lint frontend/format: `yarn lint` / `yarn format`
- Target network in the UI is controlled by `NEXT_PUBLIC_CHAIN_ID` (defaults to local Foundry if unset). Update env + addresses when pointing to mainnet/testnet deployments.

## Contract architecture
- `EarnGridVault4626`: ERC-4626 vault with a capped 10% performance fee minted as shares to the fee recipient on positive yield only. Uses a **share-price high-water mark** (HWM) so fees are never charged on loss recovery; fees mint only when price exceeds the prior HWM. Ownable admin controls performance fee, fee recipient, pluggable strategy, and an emergency `pause`/`unpause`. Deposits/mints auto-push assets to the active strategy; withdraw/redeem pull back from the strategy as needed. Reentrancy guards wrap entrypoints.
- `StrategyERC4626`: abstract ERC-4626 strategy base with vault-only `invest/divest/harvest`, totalAssets passthrough to the target ERC-4626, and allowance resets for safer approvals.
- `EulerEarnStrategy`: concrete implementation that approves and deposits into a configured EulerEarn ERC-4626 vault.

## Testing
- Contracts: `yarn foundry:test` (from repo root) or `forge test` inside `packages/foundry` (includes fee HWM regression: `FeeOnRecovery.t.sol`).
- Frontend lint/tests: `yarn lint` / `yarn test` (when added).

## Deployment (Foundry)
Env-driven deployment script targets any chain (Base mainnet defaults included):
1. Set `.env` in `packages/foundry` with:
   - `ASSET` (e.g., Base USDC address)
   - `EULER_EARN_VAULT` (EulerEarn ERC-4626 target)
   - `FEE_RECIPIENT`, `PERFORMANCE_FEE_BPS` (<=1000), `VAULT_NAME`, `VAULT_SYMBOL`
   - `BASE_RPC_URL` (https://mainnet.base.org) and `DEPLOYER_PRIVATE_KEY`, `CHAIN_ID=8453`
2. Deploy:
```bash
cd packages/foundry
forge script script/Deploy.s.sol --rpc-url $BASE_RPC_URL --broadcast
```
3. Populate `NEXT_PUBLIC_CHAIN_ID` (e.g., 8453), `NEXT_PUBLIC_RPC_URL`, `NEXT_PUBLIC_EARNGRID_VAULT_ADDRESS`, `NEXT_PUBLIC_EULER_STRATEGY_ADDRESS`, and `NEXT_PUBLIC_EULER_EARN_VAULT_ADDRESS` in `packages/nextjs/.env.local`.

## TODO
- Review and, if needed, upgrade Next/React/wagmi/RainbowKit/viem to the latest stable compatible versions after scaffold baseline.
- Add deployment/config scripts for mainnet targets once EulerEarn vault addresses are finalized.
