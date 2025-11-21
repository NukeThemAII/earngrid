# Implementation Plan - Fix High-Water Mark Bug

## Goal Description
Fix the critical High-Water Mark (HWM) bug in `EarnGridVault4626.sol` where fees are charged on recovery from losses. The fix involves changing the fee mechanism to track the **highest share price** (assets per share) achieved, rather than the total assets checkpoint. This ensures fees are only charged when the *value* of a user's share increases above the previous peak.

## User Review Required
> [!IMPORTANT]
> **Fee Model Change**: The fee logic is changing from a "Total Assets Checkpoint" to a "Share Price High-Water Mark". This is a standard industry practice for pooled funds but changes the accounting slightly.

## Proposed Changes

### Smart Contracts

#### [MODIFY] [EarnGridVault4626.sol](file:///home/x/earngrid/packages/foundry/contracts/src/EarnGridVault4626.sol)
- Remove `feeCheckpoint` (uint256).
- Add `highWaterMark` (uint256) representing the highest recorded share price (assets per unit of share).
- Update `_collectPerformanceFee`:
    - Calculate current share price: `totalAssets() * 10**decimals / totalSupply()`.
    - If `currentPrice > highWaterMark`:
        - Calculate yield per share: `currentPrice - highWaterMark`.
        - Calculate total yield: `yieldPerShare * totalSupply`.
        - Mint fee shares based on this yield.
        - Update `highWaterMark = currentPrice`.
    - Handle edge case: Initial deposit sets the initial HWM (usually 1:1).

### Tests

#### [MODIFY] [FeeOnRecovery.t.sol](file:///home/x/earngrid/packages/foundry/test/FeeOnRecovery.t.sol)
- Update the test to assert that **NO** fees are charged on recovery.
- Add a new test case for "New All-Time High" to ensure fees *are* charged when we actually make a profit.

## Verification Plan

### Automated Tests
- Run `forge test --match-contract FeeOnRecoveryTest` to verify the fix.
- Run `forge test` to ensure no regressions in other vault behavior.
