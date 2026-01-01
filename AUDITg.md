# Industry Standards Security Audit Report

**Date:** December 25, 2025
**Auditor:** AI Security Analyst (Gemini CLI)
**Target:** EarnGrid (v0.1)
**Scope:** Smart Contracts, Frontend, Indexer, Documentation

---

## 1. Executive Summary

EarnGrid is a USDC savings dApp built on the Base network, utilizing an ERC-4626 "Vault-of-Vaults" architecture. The system allocates funds to whitelisted synchronous strategies (MetaMorpho vaults) to generate yield.

The audit found the system to be **structurally sound** and **well-documented**. The architecture follows established patterns for Access Control and Vault management. Significant improvements have been made in recent iterations (v2 improvements) to address previously identified high-severity issues such as performance fee manipulation and reentrancy.

**Current Risk Assessment:**
*   **Critical:** 0
*   **High:** 0
*   **Medium:** 2 (Donation/Inflation Vector, Queue Ordering Side-Effects)
*   **Low:** 3
*   **Informational:** 2

The system is nearing production readiness for a testnet environment. Mainnet deployment should be preceded by a professional audit from a firm like Trail of Bits or OpenZeppelin, particularly to verify the economic security of the underlying strategy integrations.

---

## 2. Scope & Methodology

### Reviewed Components
*   **Smart Contracts:** `packages/contracts/src/BlendedVault.sol` (Core logic), `BlendedVault.t.sol` (Tests).
*   **Frontend:** `apps/web/` (Next.js application, input validation, Web3 integration).
*   **Infrastructure:** `services/indexer/` (Data ingestion, rate limiting).
*   **Documentation:** Threat models, architectural specs, and runbooks.

### Methodology
*   **Static Analysis:** Manual code review focusing on logic errors, access control violations, and gas inefficiencies.
*   **Threat Modeling:** mapping architecture against known DeFi attack vectors (Reentrancy, Front-running, Price Manipulation).
*   **Compliance Check:** Verification against ERC-4626 standard behavior and OpenZeppelin security best practices.

---

## 3. Detailed Findings

### 3.1 Medium Severity

#### [M-01] Share Price Manipulation (Donation) Vector on Withdrawals
**Component:** `BlendedVault.sol`
**Description:**
The vault calculates `totalAssets()` by summing the `previewRedeem()` value of all underlying strategies. If an underlying strategy (even a whitelisted one) is susceptible to "donation attacks" where a direct transfer inflates its share price, the EarnGrid vault's `totalAssets` will spike.
While the `harvest()` function includes a `maxDailyIncreaseBps` guard to prevent fee manipulation, **withdrawals** do not have this check.
**Scenario:**
1. Attacker holds EarnGrid shares.
2. Attacker manipulates an underlying strategy to spike its price (and thus EarnGrid's `totalAssets`).
3. Attacker calls `withdraw()`. Due to the inflated `totalAssets`, the attacker's shares are valued higher than they should be, allowing them to withdraw excess USDC at the expense of other users.
**Recommendation:**
Consider checking the `maxDailyIncreaseBps` (or a similar deviation check) within the `withdraw` flow or `totalAssets` calculation. Alternatively, ensure strict due diligence that all whitelisted strategies are chemically resistant to donation attacks (e.g., MetaMorpho's strict accounting).

#### [M-02] Unstable Priority Queue Ordering
**Component:** `BlendedVault.sol` (`_removeFromQueue`)
**Description:**
The function `_removeFromQueue` uses a "swap-and-pop" method to remove strategies:
```solidity
queue[i] = queue[queue.length - 1];
queue.pop();
```
This changes the order of the remaining strategies. Since `depositQueue` and `withdrawQueue` are priority-ordered (allocating to index 0 first), removing a strategy from the middle of the list arbitrarily promotes the last strategy to that higher-priority slot. This may lead to unintended allocation behaviors where a lower-priority strategy suddenly receives the bulk of deposits.
**Recommendation:**
Implement an ordered removal (shift-left) loop to preserve the relative priority of remaining strategies, or document this behavior clearly for the Allocator role.

### 3.2 Low Severity

#### [L-01] Unbounded Gas Cost in `totalAssets`
**Component:** `BlendedVault.sol`
**Description:**
`totalAssets()` iterates over `strategyList`. While strategies can be removed from *queues*, they remain in `strategyList` indefinitely (only `enabled` flag is toggled). Over time, a large number of deprecated strategies could cause `totalAssets()` to exceed the block gas limit, causing DOS on deposits and withdrawals.
**Recommendation:**
For v1, this is acceptable given the permissioned nature of adding strategies. For v2, verify `strategyList` length or implement a mechanism to fully archive/remove strategies from the calculation list if they have 0 balance.

#### [L-02] Duplicate Entries in Queues
**Component:** `BlendedVault.sol` (`_setDepositQueue`)
**Description:**
The `_setDepositQueue` function does not check for duplicate addresses. If the Allocator accidentally provides `[StrategyA, StrategyA]`, the `_allocateIdle` loop will attempt to deposit to the same strategy twice.
**Recommendation:**
Add a check for duplicates in the `_setDepositQueue` and `_setWithdrawQueue` functions.

#### [L-03] Timelock Delay Reduction is Not Timelocked
**Component:** `BlendedVault.sol` (`setTimelockDelay`)
**Description:**
The `setTimelockDelay` function allows the `DEFAULT_ADMIN_ROLE` to change the delay. A compromised admin could instantly reduce the delay to the minimum (1 day) to accelerate malicious changes.
**Recommendation:**
Changes to the `timelockDelay` itself should ideally be subject to the timelock.

### 3.3 Informational / Best Practices

#### [I-01] Frontend: Slippage Protection
**Component:** `apps/web`
**Description:**
The frontend recently added a client-side slippage check (Good). However, for robust safety, consider passing a `minSharesOut` (for deposit) or `minAssetsOut` (for withdraw) parameter to the contract calls, rather than relying solely on the UI check which can be bypassed or front-run (though less relevant on L2s like Base).

#### [I-02] Indexer: Reorg Handling
**Component:** `services/indexer`
**Description:**
The indexer documentation mentions reorg safety is a TODO. On L2s like Base, deep reorgs are rare, but shallow reorgs happen. Ensure the indexer waits for a safe number of confirmations (e.g., 5-10 blocks) or handles log removal events.

---

## 4. Component Analysis

### 4.1 Smart Contracts (`BlendedVault.sol`)
*   **Architecture:** Clean separation of concerns. The "Vault-of-Vaults" model is implemented correctly using ERC-4626.
*   **Math:** Uses OpenZeppelin's `Math` and `SafeERC20`. Fee calculation logic is sound (`_feeSharesForAssets` correctly avoids circular dilution).
*   **Access Control:** The 4-role system (Owner, Curator, Allocator, Guardian) provides good defense-in-depth. The Guardian's ability to pause acts as a necessary circuit breaker.

### 4.2 Frontend (`apps/web`)
*   **Security:** Proper use of `wagmi` hooks. The implementation of "Transaction Toasts" and network gating significantly improves user safety (preventing wrong-chain interacts).
*   **UX:** The separation of "read" and "write" logic is clean. Input validation for addresses and amounts is present.

### 4.3 Strategy Safety
*   **Constraint:** The vault correctly enforces `isSynchronous` for v0.1. This is crucial as asynchronous strategies (with request/claim steps) would break the atomic `withdraw` logic.
*   **Limits:** Tier limits and Caps are checked *before* interaction, preventing over-exposure.

---

## 5. Recommendations for Mainnet

1.  **Professional Audit:** This AI audit should be used as a pre-check. A full audit by a reputable firm is mandatory before managing significant user funds.
2.  **Multisig Administration:** The `DEFAULT_ADMIN_ROLE` and `GUARDIAN_ROLE` should be held by a Gnosis Safe multisig, not an EOA (Externally Owned Account).
3.  **Monitoring:** Deploy the indexer and set up alerts for:
    *   `Paused` events.
    *   Large deviations in `assetsPerShare`.
    *   `StrategyAdded` events (to verify timelock compliance).
4.  **Queue Management:** Document the "swap-and-pop" behavior for the Allocator to ensure they re-verify queue order after removing strategies.

---

**Disclaimer:** This report is based on a static analysis of the provided codebase. It does not guarantee the absence of bugs or vulnerabilities.
