# EarnGrid Audit Report

**Date:** 2025-11-21
**Auditor:** Gemini (Antigravity Agent)
**Target:** EarnGrid dApp (Contracts + Frontend)

## 1. Executive Summary

EarnGrid is a DeFi yield vault built on the ERC-4626 standard. It wraps an underlying strategy (currently targeting EulerEarn) and applies a 10% performance fee on yield. The project consists of a Foundry-based smart contract repository and a Next.js frontend.

**Overall Rating:** 7/10
**Code Quality:** High (Clean, modular, standard-compliant)
**Security Posture:** Moderate (Centralized control, Critical logic flaw in fee accounting)

## 2. dApp Functionality Explanation

The dApp allows users to deposit stablecoins (USDC/USDT) into the `EarnGridVault4626`.
- **Deposit**: Users receive vault shares. Funds are moved to the `Strategy` (EulerEarn).
- **Yield**: The strategy earns yield from Euler.
- **Fees**: A 10% performance fee is calculated on "positive yield" and minted as new shares to a `feeRecipient`.
- **Withdraw**: Users burn shares to receive underlying assets + yield - fees.

## 3. Current State

- **Architecture**: Monorepo (Next.js + Foundry).
- **Contracts**:
  - `EarnGridVault4626`: Core vault logic.
  - `StrategyERC4626`: Abstract strategy adapter.
  - `EulerEarnStrategy`: Concrete implementation for Euler.
- **Frontend**: Next.js 15 App Router, Wagmi, RainbowKit, Tailwind CSS.
- **Status**: Pre-production / v1. Basic tests exist.

## 4. Critical Issues & Bugs

### [CRITICAL] High-Water Mark Reset on Loss
**Severity:** High
**Location:** `EarnGridVault4626.sol`, `_collectPerformanceFee` function.

**Description:**
The performance fee logic attempts to implement a High-Water Mark (HWM) using `feeCheckpoint`. However, if the total assets drop below the checkpoint (loss scenario), the checkpoint is reset to the lower value:

```solidity
if (assets <= checkpoint) {
    feeCheckpoint = assets; // <--- RESET HAPPENS HERE
    return;
}
```

This means if the vault suffers a loss (e.g., 10%) and then recovers that loss, the recovery is treated as "new yield," and a 10% fee is charged on it. A user who holds through the dip and recovery will end up with **less principal** than they started with, as the protocol takes a cut of the recovery.

**Proof of Concept:**
A test case `FeeOnRecoveryTest` confirmed that fees are charged when assets go 100 -> 90 -> 100.

**Recommendation:**
Do not lower the `feeCheckpoint` on losses if you intend to implement a strict High-Water Mark. However, in a pooled vehicle with deposits/withdrawals, a simple global HWM is insufficient. You should track "assets per share" for the HWM, or ensure that the HWM is only adjusted for deposits/withdrawals, not for market performance losses.
Alternatively, simply removing `feeCheckpoint = assets` in the loss branch would prevent the reset, but you must ensure `feeCheckpoint` is correctly adjusted when users withdraw (which `_refreshCheckpoint` currently does, but it resets it to `totalAssets`, creating the same issue).

**Fix Strategy:**
Implement a `highWaterMarkPrice` (assets per share). Only charge fees if `currentPrice > highWaterMarkPrice`.
`fee = (currentPrice - highWaterMarkPrice) * shares * feeRate`.

## 5. Safety & Security

### Centralization Risk
- **Owner Privileges**: The `owner` can:
  - Swap the strategy (`setStrategy`).
  - Change the fee recipient.
  - Change the fee rate (up to 10%).
  - Manually move funds (`investIdle`, `divestFromStrategy`).
- **Risk**: If the owner key is compromised, all funds can be stolen by swapping to a malicious strategy or divesting to the vault and then upgrading.
- **Recommendation**: Use a TimelockController for critical admin functions (especially `setStrategy`).

### Reentrancy
- **Status**: Safe.
- **Details**: `ReentrancyGuard` is correctly applied to all external user-facing functions (`deposit`, `withdraw`, `mint`, `redeem`).

### ERC-4626 Compliance
- **Status**: Good.
- **Details**: Inherits OpenZeppelin's `ERC4626`. Overrides are consistent.

## 6. Gas Optimization

### Frequent Fee Collection
- **Issue**: `_collectPerformanceFee` is called on **every** deposit, withdraw, mint, and redeem.
- **Impact**: Increases gas cost for users.
- **Suggestion**: This is necessary for accurate fee accounting in the current model. However, if the fee model changes to "assets per share" HWM, it might be possible to optimize.

### Storage Variables
- **Issue**: `feeCheckpoint` is updated (`SSTORE`) on every interaction via `_refreshCheckpoint`.
- **Suggestion**: Only update `feeCheckpoint` if it actually changes significantly or if a fee was minted. However, for correctness with the current logic, it must track `totalAssets`.

## 7. UI and Hooks

### Code Quality
- **Rating**: 9/10
- **Details**: The frontend code is clean, uses modern React patterns (hooks), and handles errors gracefully (`safeParse`, `ensureNetwork`).
- **UX**:
  - Good feedback on connection status.
  - Clear breakdown of "Idle" vs "Strategy" assets.
  - "Max" buttons are helpful.

### Suggestions
- **Env Vars**: The reliance on `NEXT_PUBLIC_CHAIN_ID` and manual address entry in `.env` is standard for dev, but ensure a robust configuration management for production.
- **Zero Address**: `deployedContracts.ts` contains zero addresses. Ensure the deployment script updates this file or the CI/CD pipeline handles it.

## 8. Suggestions for Further Development

1.  **Fix the Fee Logic**: Prioritize switching to a Share Price High-Water Mark to avoid penalizing users on volatility.
2.  **Timelock**: Add a Timelock for the `owner` role.
3.  **Events**: Add more detailed events for strategy switches (e.g., previous balance vs new balance).
4.  **Testing**: Add fuzz testing for the fee logic to ensure no rounding errors favor the protocol unfairly.
5.  **Frontend**: Add a historical performance chart (as suggested in your TODOs) using a subgraph or indexer.

## 9. Conclusion

EarnGrid is a well-structured project with a solid foundation. The frontend is polished and the contract code is clean. However, the **High-Water Mark logic flaw** is a critical economic bug that must be addressed before mainnet deployment.

---
*Audit generated by Gemini Agent.*
