Threat model for USDC Blended Vault (ERC‑4626 vault-of-vaults) on Base.

1) Scope
In-scope components

BlendedVault (ERC‑4626): deposit/withdraw, accounting, queues, caps, tier exposure limits, performance fee (HWM), role gating, pausing.

Strategy integrations: direct ERC‑4626 strategies and/or adapters used by the vault.

Allocator operations (onchain calls): rebalance(), harvest(), queue updates (within policy).

Admin operations (governance): adding/removing strategies, cap/tier updates, role changes, emergency actions.

Out-of-scope for v0.1

DEX routing / swaps inside the vault

Cross-chain bridging

Permissionless strategy additions

Onchain risk oracle / automated rating

2) Assets to protect

User funds (USDC) in the vault and in underlying strategies.

Vault share integrity (no inflation, correct conversions).

Withdrawal availability (avoid stuck funds / unfair redemption).

Governance safety (prevent malicious config upgrades).

Fee correctness (3% of profit only; no fee over-collection).

3) Trust assumptions

USDC behaves as a standard ERC‑20 (no callbacks).

Underlying strategies are whitelisted and reviewed.

Governance keys are held in a multisig and protected operationally.

The allocator/keeper may be faulty; the vault must remain safe under worst-case allocator behavior within enforced constraints.

4) Roles and trust boundaries
Roles

Owner (multisig): role management, upgrades (if any), feeRecipient changes, governance.

Curator: strategy allowlist, caps, tier settings (timelocked if risk-increasing).

Allocator (keeper): executes rebalances and harvests; must be constrained by caps/tier limits.

Guardian: emergency pause, emergency strategy removal.

Timelock boundary

Any risk-increasing change must be timelocked (>= 24h) with public onchain intent:

adding a strategy

increasing a cap

raising tier exposure limits

enabling withdrawals from a new adapter

5) Attack surfaces

ERC‑4626 accounting & rounding

share inflation on first deposit

0-share minting / rounding to zero

donation attacks (assets injected to manipulate share price)

Underlying strategy behavior

strategy insolvency / bad debt

strategy admin abuse (pauses, parameter changes)

strategy misreporting totalAssets() / convertToAssets()

withdrawal latency / gating

Rebalance operations

moving funds to an unsafe strategy

violating caps or tier limits

griefing by frequent tiny rebalances

Performance fee / harvest

fee over-collection via manipulation of assetsPerShare

same-block double-harvest

reentrancy via strategy calls

Access control / governance

key compromise

role escalation bugs

timelock bypass

Strategy accounting / valuation

previewRedeem reverts causing totalAssets() to revert

Operational / offchain

indexer misreporting APY (UI deception)

keeper downtime causing stale allocations

6) Key threats and mitigations
T1: Share inflation / first depositor attack

Threat: attacker mints disproportionate shares by exploiting rounding on initial deposits.

Mitigations

Enforce minimum initial deposit OR seed vault with a small burn/mint scheme (design choice).

Disallow minting 0 shares; require shares > 0 for deposit/mint.

Use OpenZeppelin ERC‑4626 reference math and fuzz test edge cases.

T2: Rounding-to-zero / dust griefing

Threat: deposits/withdrawals revert or behave unfairly at low values.

Mitigations

Reject deposits that would mint 0 shares.

Document minimum practical deposit based on USDC decimals and share precision.

T3: Reentrancy via underlying strategy

Threat: malicious or buggy strategy reenters vault during deposit/withdraw/harvest.

Mitigations

Use nonReentrant on external state-changing functions.

Prefer direct ERC‑4626 integrations with vetted strategies.

If adapters are used, keep them minimal and audited.

T4: Strategy mispricing / donation manipulation

Threat: underlying ERC‑4626 share price is manipulated (e.g., donations) causing our vault’s totalAssets() to spike, enabling fee extraction or unfair share minting.

Mitigations

Restrict to strategies with known donation-resistance or safe accounting.

Consider using previewRedeem/previewWithdraw for conservative valuation where appropriate.

Add “strategy health checks” (offchain + onchain guardrails): max daily share price change threshold for harvest.

Onchain guard: `maxDailyIncreaseBps` limits assetsPerShare increases per day (scaled by elapsed time since last harvest).

T5: Insolvency / bad debt in a lending strategy

Threat: underlying lending market suffers losses; our vault’s assets decline.

Mitigations

Tiering + caps + diversification.

Prefer blue-chip strategies initially (Tier 0/1).

Guardian can pause deposits and stop rebalances; curator can reduce caps and unwind.

Clear user disclosures that principal is not guaranteed.

T6: Withdrawal unavailability / gating

Threat: strategy blocks withdrawals (pause, liquidity shortage), causing vault withdraw failures.

Mitigations

v0.1 prefer synchronous liquidity strategies.

Maintain idle liquidity target (e.g., 1–5% or configurable).

Withdraw queue prioritizes most liquid sources first.

Provide partial withdrawal mechanics if supported (withdraw what’s available).

T7: Allocator compromise or malfunction

Threat: allocator tries to move funds into bad strategy or churn.

Mitigations

Vault enforces allowlist, caps, tier limits onchain.

Rate-limit rebalances (optional): max rebalance per block / per hour.

Guardian can pause and revoke allocator role.

T8: Timelock bypass / governance abuse

Threat: governance changes caps/strategies immediately to drain funds or increase risk.

Mitigations

Two-step config changes for risk-increasing operations:

scheduleChange(...) → timelock delay → executeChange(...)

Separate guardian powers for emergency risk reduction.

Multisig with operational security + monitoring.

Timelock delay reductions must be scheduled and executed after delay.

T9: Performance fee over-collection

Threat: fee minted when there is no real profit or minted too much.

Mitigations

Use high-water mark on assetsPerShare.

Disallow same-block double harvest.

Emit events and verify offchain.

Unit tests with multiple depositors and mid-cycle deposits/withdrawals.

T10: Pausing used as DoS

Threat: guardian/owner pauses withdrawals maliciously.

Mitigations

Clearly define pause semantics in docs.

Consider “pause deposits only” vs “pause withdrawals” separate.

Governance transparency and monitoring.

T11: Strategy accounting revert DoS

Threat: a strategy reverts on previewRedeem/valuation, causing vault accounting to revert.

Mitigations

Use safe previewRedeem with cached strategy assets to keep totalAssets functional.

Guardian can pause deposits/withdrawals and unwind where possible.

7) Monitoring & incident response
Onchain monitoring (alerts)

Cap/tier config changes (schedule + execute)

Strategy additions/removals

Large rebalances

Harvest events and fee shares minted

Unexpected jumps in assetsPerShare

Runbook essentials

Immediate actions:

pause deposits

halt rebalances

reduce caps / unwind from risky strategies

User comms checklist

Post-mortem template

8) Testing requirements mapped to threats

Fuzz/invariant: share math, monotonic conversions (T1/T2)

Reentrancy tests with malicious strategy mock (T3)

Donation manipulation simulation where possible (T4)

Fork tests vs target strategies (T5/T6)

Role/timelock tests (T7/T8)

Accounting failure fallback tests (T11)

Fee math tests with multiple users (T9)

9) Open questions (fill before mainnet)

Initial idle liquidity target and behavior during large withdrawals

Whether partial withdrawals are allowed vs strict ERC‑4626 semantics

Exact timelock implementation details (contract or module)

Strategy selection criteria and minimum due diligence bar
