Architecture for USDC Blended Vault (ERC‑4626 vault-of-vaults) on Base.

1) Executive overview

The system is a single ERC‑4626 vault (BlendedVault) that accepts USDC deposits and mints vault shares. The vault allocates assets across a whitelisted set of underlying yield strategies (preferably ERC‑4626 vaults). Allocation is controlled by an allocator/keeper, while governance sets policy boundaries (allowlist, caps, tier exposure limits) with a timelock for risk-increasing changes. A guardian can pause deposits/withdrawals and emergency‑revoke strategies.

Key product goals:

Target 7–10% net APY (market dependent)

Preserve simplicity and safety by avoiding leverage/looping (v0.1)

Maintain transparent, auditable allocation and fee events

2) System components
2.1 Onchain

A) BlendedVault (ERC‑4626)

Asset: USDC

Shares: ERC‑4626 shares (receipt token)

Responsibilities:

Accept deposits/mints; process withdrawals/redeems

Maintain strategy allowlist + metadata (cap, tier)

Enforce tier limits and per‑strategy caps

Maintain deposit and withdraw queues

Execute rebalances into/out of strategies

Accrue performance fee (3% HWM) via harvest()

Emit events required for indexer/UI

B) Timelock / governance module (recommended)

Schedules risk‑increasing changes; executes after delay.

Risk‑reducing changes may bypass timelock.

C) Strategy interface

Preferred: direct ERC‑4626 usage (IERC4626).

Optional: StrategyAdapter for non‑standard strategies.

D) Roles & permissions

owner (multisig): role mgmt, feeRecipient, (optional upgrades)

curator: propose allowlist/caps/tier configs (timelocked if increasing risk)

allocator: can call rebalance/harvest within policy

guardian: pause deposits/withdrawals, emergency remove strategy

2.2 Offchain

E) Allocator / keeper bot

Computes target weights and triggers rebalance()

Calls harvest() periodically

Collects data from:

underlying vault rates

utilization / available liquidity

(optional) risk feeds / manual overrides

F) Indexer + API

Indexes vault events and strategy events (where needed)

Samples assetsPerShare hourly

Computes realized APY (7d/30d)

Serves UI endpoints: /api/apy, /api/tvl, /api/allocations

G) Frontend (Next.js)

Deposit/withdraw UX

Dashboard and transparency pages

Admin panel for role‑gated actions

3) Data model (onchain state)
3.1 Core vault state

asset (USDC)

feeRecipient

feeBps (300)

highWatermarkAssetsPerShare (1e18 scaled)

maxDailyIncreaseBps (harvest guard, optional)

pausedDeposits, pausedWithdrawals

3.2 Strategy registry

For each strategy:

enabled: bool

tier: uint8 (0/1/2)

capAssets: uint256

currentAssets: uint256 (derived; optional cached)

cachedStrategyAssets: uint256 (last known assets, used if previewRedeem reverts)

isSynchronous: bool (v0.1 default true)

notesHash / metadataURI (optional)

3.3 Exposure limits

tierMaxBps[3] (e.g., [8000, 5000, 2000])

singleStrategyMaxBps (optional additional guard)

idleLiquidityBps (target idle %)

3.4 Queues

depositQueue: address[]

withdrawQueue: address[]

4) Key flows
4.1 Deposit flow (deposit() / mint())

Goal: User deposits USDC and receives vault shares.

Flow:

Check pausedDeposits == false.

Collect USDC from user.

Optionally call harvest() first (configurable) to keep fee accounting current.

Mint shares according to ERC‑4626 math.

Allocate funds:

Keep idle liquidity up to idleLiquidityBps target.

Remaining funds are pushed into strategies following depositQueue, respecting:

strategy enabled

per‑strategy capAssets

tier exposure limits

strategy maxDeposit limits

Notes:

v0.1 should avoid doing too many external calls inside deposit if gas is a concern.

Alternative: deposit keeps funds idle, keeper invests via rebalance(); but UX APY may lag.

4.2 Withdraw flow (withdraw() / redeem())

Goal: User burns shares and receives USDC.

Flow:

Check pausedWithdrawals == false.

Compute required assets.

Attempt to satisfy from idle USDC first.

If insufficient, unwind strategies in withdrawQueue order:

For each strategy:

Determine available liquidity (via maxWithdraw / conservative calls)

Withdraw up to needed amount

Stop when satisfied

Transfer USDC to user and burn shares per ERC‑4626.

Behavior decisions (v0.1 PO must specify):

If liquidity is insufficient:

Option A: revert (strict ERC‑4626)

Option B: allow partial withdraw via a separate function (non‑standard)

4.3 Rebalance flow (rebalance())

Goal: Move assets between strategies to reach target allocation.

Inputs:

Proposed target weights/amounts from allocator.

Onchain enforcement:

Only allow strategies on allowlist.

Respect caps and tier limits.

Optionally enforce max move per call.

Typical rebalance sequence:

Withdraw from strategies that are overweight (withdrawQueue order or computed list).

Deposit into underweight strategies (depositQueue order or computed list).

Emit Rebalanced event with before/after snapshots.

4.4 Harvest flow (harvest())

Goal: Accrue 3% performance fee on profit above HWM.

Flow:

Compute current assetsPerShare (1e18 scaled).

If assetsPerShare <= HWM, return.

Else compute profit and fee assets.

Mint fee shares to feeRecipient sized to represent feeAssets.

Set HWM = assetsPerShare.

Emit FeeAccrued.

Guards:

nonReentrant

prevent same-block double-harvest

optional min interval

max daily assets-per-share increase guard (configurable, can be disabled)

4.5 Governance change flow (timelocked)

Risk-increasing change examples:

add strategy

increase cap

raise tier exposure

Two-step:

scheduleChange(...) (curator/owner) → emits event with ETA.

After delay, executeChange(...).

Risk-reducing changes:

decrease cap

remove strategy

pause deposits

can be immediate (guardian/curator/owner as defined).

5) Events (indexer contract)

Minimum required events:

ERC‑4626: Deposit, Withdraw

Custom:

StrategyAdded(strategy, tier)

StrategyRemoved(strategy)

CapUpdated(strategy, oldCap, newCap)

TierLimitsUpdated(old, new)

QueuesUpdated(depositQueueHash, withdrawQueueHash)

Rebalanced(...) (include moved amounts per strategy)

FeeAccrued(profitAssets, feeAssets, feeShares)

Paused(deposits, withdrawals)

6) Operational architecture
6.1 Keeper ops

Rebalance cadence:

time-based (e.g., daily)

threshold-based (allocation drift or APY delta)

Harvest cadence:

hourly/daily (avoid spam)

6.2 Indexer ops

Subscribe to vault events

Hourly sampler reads:

totalAssets(), totalSupply(), derived assetsPerShare

per-strategy balances if needed

Persist snapshots to DB

6.3 Frontend data sources

Onchain reads for:

user balances

totalAssets, share price

current allocations (if stored) or computed from strategy balances

Offchain API for:

realized APY

allocation history

7) Security architecture summary

Onchain enforcement: allowlist + caps + tier limits.

Timelock for risk-increasing changes.

Guardian emergency pause.

Prefer synchronous strategies in v0.1.

If a strategy reverts on previewRedeem, cached strategy assets are used for accounting to avoid vault-wide DoS.

Extensive Foundry tests and invariants.

8) Deployment environments

Base Sepolia: test deployments, CI smoke tests

Base Mainnet: production deployment

Suggested deployment order:

Deploy vault (and timelock module if separate).

Configure roles (owner/curator/guardian/allocator).

Add initial strategies + caps (timelocked if required).

Set queues.

Run a small public beta with conservative caps.

9) Open design choices (PO must finalize)

Should deposits auto-invest immediately or remain idle until keeper invests?

Partial withdrawals vs strict ERC‑4626 reverts on insufficient liquidity.

Do we store allocation state onchain or compute from balances?

Minimum initial deposit / seeding strategy for first-deposit rounding.
