# Codex Audit – EarnGrid (2025-11-21)

## Scope & Context
- Codebase: EarnGrid monorepo (Scaffold-ETH 2 frontend, Foundry contracts).
- Contracts reviewed: `EarnGridVault4626`, `StrategyERC4626`, `EulerEarnStrategy`, test mocks, Foundry config.
- Frontend reviewed: `packages/nextjs` dashboard (`app/page.tsx`), contract wiring (`externalContracts.ts`, `deployedContracts.ts`), scaffold config and hooks.
- Tests run: `forge test` (contracts), `yarn next:check-types`, `yarn lint` (frontend).
- Network: env-driven; default chain 31337 (local). No mainnet addresses configured.

## Current Functionality
- ERC-4626 vault (`EarnGridVault4626`) with high-water performance fee (max 10%) minted as fee shares on positive yield only.
- Pluggable ERC-4626 strategy base (`StrategyERC4626`) with EulerEarn implementation (`EulerEarnStrategy`).
- Vault auto-invests deposits into strategy and pulls on withdrawals; fee checkpointing on each user/admin entrypoint.
- Frontend exposes a vault dashboard: TVL, share price, fee, strategy allocation, user position, deposit/withdraw flows with approval helper, and explorer links. Addresses are pulled from env or on-chain deployment info.

## Findings
Severity legend: Critical / High / Medium / Low / Informational.

1) Critical – Fee charged on loss recovery (HWM reset)  
`EarnGridVault4626._collectPerformanceFee` resets `feeCheckpoint` downward when assets drop, so recovery to the prior level is treated as new yield and fees are minted. Reproduced by `forge test -vvv --match-test testFeeChargedOnRecovery` (packages/foundry/test/FeeOnRecovery.t.sol): deposit 100 → loss to 90 → recovery to 100 charges fee shares, leaving the user with 99 instead of 100.  
Suggested fix: track high-water mark per share (price-based HWM) and only mint fees when `price > lastHWM`. Do not lower the HWM on losses; adjust HWM only for deposits/withdrawals.

2) Medium – Zero-address envs still queried  
`externalContracts.ts` seeds addresses with `zeroAddress` when envs are missing; the UI enables contract reads/writes against `0x000…000`, which will fail or mislead users. Treat blank/zero addresses as “no contract” and disable queries instead.  
Suggested fix: only populate contracts when address is set and non-zero; gate all reads/writes and explorer links on non-zero addresses.

3) Low – No pause/emergency controls  
Vault/strategy lack pausing or an emergency pull mechanism. If EulerEarn is paused or illiquid, withdrawals can revert (`InsufficientLiquidity`).  
Suggested fix: add an owner `pause` flag gating deposit/mint/withdraw/redeem/invest, and/or an emergency divest-all path.

4) Low – Unlimited approval from UI  
Approval helper approves `1e9` tokens; not dangerous but broader than needed.  
Suggested fix: approve `amount` (or `max(userBalance, desired)`) and surface allowance status to the user.

5) Low – Double external reads for fees/checkpoints  
`deposit/withdraw` call `_collectPerformanceFee` (super + strategy assets) then `_refreshCheckpoint` (totalAssets override, which calls strategy again). This doubles external `totalAssets` reads on every entrypoint.  
Suggested fix: pass the computed assets into `_refreshCheckpoint` or cache strategy assets for the call to reduce gas/read load.

6) Informational – Strategy Ownable unused  
`StrategyERC4626` inherits `Ownable` but the owner is unused; could confuse auditors/user assumptions.  
Suggested fix: remove `Ownable` or expose owner-only maintenance functions (e.g., rescue) if intended.

7) Informational – UX/network configuration  
Frontend defaults to local chain; without env addresses the dashboard shows “Configured” (because zero address is truthy). Clearer empty-state copy and “Set addresses” CTA would reduce misconfiguration risk.

8) Informational – Missing slippage/user preview checks  
Fee collection can change share price between input and execution; UI does no preview guard. Standard for simple vaults but note residual price movement risk.

## Gas/Design Notes
- Using OZ 5.5 ERC4626; fee mint formula is standard but current HWM logic is economically flawed (see Critical finding).  
- Forced re-approval in strategy avoids sticky allowances; small extra gas per invest.  
- Consider optional “idle deposit” toggles or batching to reduce strategy calls on every deposit.

## Security Posture
- Reentrancy guarded on vault and strategy entrypoints.  
- Fee-on-transfer defenses via SafeERC20 and zero-share mint guard.  
- No upgradeability; Ownable admin (performance fee, fee recipient, strategy).  
- No pausing/emergency hooks (see Finding 3).  
- Reliant on underlying EulerEarn liquidity; withdrawals can revert if short.  
- Economic correctness issue on fee HWM (Critical).

## Testing Status
- Contracts: `forge test` passes core suite; `testFeeChargedOnRecovery` reproduces fee-on-recovery bug.  
- Frontend: `yarn next:check-types`, `yarn lint` clean. No integration/e2e tests yet.

## Recommendations (next steps)
- Fix Critical: implement price-based high-water-mark fee logic; add regression tests.  
- Address Medium: gate zero-address configs.  
- Add pause/emergency withdrawal controls.  
- Refine approval flow to exact-amount approvals and display allowance state.  
- Optimize fee checkpoint reads to avoid duplicate strategy calls.  
- Add integration tests (frontend + local chain) for deposit/withdraw/fee accrual and address misconfiguration states.  
- Add monitoring hooks (block explorer links, event history) and historical APY/time-series once indexer available.  
- Document risk disclosures (EulerEarn dependency, liquidity/curation risk, smart contract risk) in README/UI.  
