Strategy research template for Base USDC strategies used by the BlendedVault.

0) Strategy selection principles (v0.1)

Must-haves

USDC-denominated exposure

Prefer ERC‑4626 strategies with synchronous redeem/withdraw

Strong reputation/audits; clear admin/pausing controls

Sufficient liquidity for our expected TVL

Avoid (v0.1)

Leverage/looping

Strategies requiring DEX swaps to exit

Strategies with long withdrawal queues (unless explicitly supported as v2)

1) Data sources

Official protocol docs

Onchain contracts (verified source)

Dune dashboards / DefiLlama / Vault aggregators (for APY/TVL trends)

Security reports / audits

Record exact links and block numbers where relevant.

2) Candidate strategy table

Filled with current Base USDC MetaMorpho vaults from Morpho Blue GraphQL (`https://blue-api.morpho.org/graphql`) filtered by `chainId=8453` and USDC asset `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`.

Strategy Name | Protocol | Chain | Asset | Strategy Type | ERC‑4626? | Contract Address | Vault/Market Address (if any) | Withdraw Latency | TVL/Liquidity Notes | APY Source | Admin Keys / Pausable? | Audits | Incidents | Risk Tier (0/1/2) | Suggested Cap (assets) | Adapter Needed? | Notes
---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---
Steakhouse USDC (steakUSDC) | Morpho / Steakhouse | Base | USDC | MetaMorpho ERC‑4626 vault | Yes | 0xbeeF010f9cb27031ad51e3333f9aF9C6B1228183 | N/A | Instant (liquidity‑dependent) | High TVL, liquid | Morpho Blue APY | Curator/guardian roles per vault | Morpho audits + curator reviews | None known | 1 | 25% TVL | No | Curated by Steakhouse
Spark USDC Vault (sparkUSDC) | Morpho / Spark | Base | USDC | MetaMorpho ERC‑4626 vault | Yes | 0x7BfA7C4f149E7415b73bdeDfe609237e29CBF34A | N/A | Instant (liquidity‑dependent) | High TVL | Morpho Blue APY | Curator/guardian roles per vault | Morpho audits + curator reviews | None known | 1 | 20% TVL | No | Spark‑curated vault
Gauntlet USDC Prime (gtUSDCp) | Morpho / Gauntlet | Base | USDC | MetaMorpho ERC‑4626 vault | Yes | 0xeE8F4eC5672F09119b96Ab6fB59C27E1b7e44b61 | N/A | Instant (liquidity‑dependent) | High TVL | Morpho Blue APY | Curator/guardian roles per vault | Morpho audits + curator reviews | None known | 1 | 25% TVL | No | Gauntlet‑curated vault
Seamless USDC Vault (smUSDC) | Morpho / Seamless | Base | USDC | MetaMorpho ERC‑4626 vault | Yes | 0x616a4E1db48e22028f6bbf20444Cd3b8e3273738 | N/A | Instant (liquidity‑dependent) | Mid TVL | Morpho Blue APY | Curator/guardian roles per vault | Morpho audits + curator reviews | None known | 2 | 15% TVL | No | Seamless‑curated vault
Moonwell Flagship USDC (mwUSDC) | Morpho / Moonwell | Base | USDC | MetaMorpho ERC‑4626 vault | Yes | 0xc1256Ae5FF1cf2719D4937adb3bbCCab2E00A2Ca | N/A | Instant (liquidity‑dependent) | Mid TVL | Morpho Blue APY | Curator/guardian roles per vault | Morpho audits + curator reviews | None known | 2 | 15% TVL | No | Moonwell‑curated vault
3) Per-strategy deep dive template

Copy/paste this section for each candidate.

3.X Strategy:

Protocol / Product

Protocol:

Product type (lending vault, Aave wrapper, Morpho vault, etc.):

Chain:

Addresses

USDC address:

Strategy vault address:

Any relevant market/pool address:

Verified source links:

ERC‑4626 compatibility checklist

Implements asset(), totalAssets(), deposit(), withdraw(), redeem(), mint()

convertToAssets/convertToShares behave monotonically

previewDeposit/previewWithdraw/previewRedeem behave sensibly

Decimals: asset decimals (USDC=6); share decimals:

Liquidity / withdrawal behavior

Withdraw latency (instant / limited / queued):

Any gates, pauses, cooldowns:

Historical utilization spikes:

Practical max withdraw per tx / per block:

Risk analysis

Primary risk drivers (bad debt, admin risk, oracle risk, integration risk):

Who controls parameters:

Is there an emergency pause:

Known incidents / post-mortems:

Security

Audits (firm, date, scope):

Bug bounty:

Code maturity:

Performance

APY sources (organic vs incentives):

Trailing 7d/30d APY range:

Variance / volatility notes:

Integration notes

Needs adapter? (Y/N)

Any approvals required:

Any special handling (reentrancy, rounding):

Suggested policy

Risk tier (0/1/2):

Suggested cap (assets):

Suggested queue placement (deposit/withdraw priority):

Any circuit breakers (max daily share price change, etc.):

4) v0.1 recommended allowlist

Tier 0:
- (none for v0.1; USDC blue‑chip ERC‑4626 on Base not confirmed)

Tier 1 (preferred start):
- Gauntlet USDC Prime (gtUSDCp) — 0xeE8F4eC5672F09119b96Ab6fB59C27E1b7e44b61
- Steakhouse USDC (steakUSDC) — 0xbeeF010f9cb27031ad51e3333f9aF9C6B1228183
- Optional add: Spark USDC Vault (sparkUSDC) — 0x7BfA7C4f149E7415b73bdeDfe609237e29CBF34A

Tier 2 (optional expansion):
- Seamless USDC Vault (smUSDC) — 0x616a4E1db48e22028f6bbf20444Cd3b8e3273738
- Moonwell Flagship USDC (mwUSDC) — 0xc1256Ae5FF1cf2719D4937adb3bbCCab2E00A2Ca
5) v0.1 initial caps & tiers (proposal)

Tier limits:
- Tier 0 max %: 80% (unused initially)
- Tier 1 max %: 50%
- Tier 2 max %: 20%
- Single strategy cap max %: 40%
- Idle liquidity target %: 2%

6) Open questions

- Confirm MetaMorpho vault withdrawal liquidity under stress (maxWithdraw behavior).
- Validate ERC‑4626 preview functions and donation resistance for each vault.
- Determine minimum due‑diligence checklist before allowlisting new curators.
