# Walkthrough - Fix High-Water Mark Bug

## Changes Made

### Smart Contracts
- **[EarnGridVault4626.sol](file:///home/x/earngrid/packages/foundry/contracts/src/EarnGridVault4626.sol)**:
    - Replaced `feeCheckpoint` (Total Assets) with `highWaterMark` (Share Price).
    - Updated `_collectPerformanceFee` to calculate yield based on `currentPrice - highWaterMark`.
    - This ensures fees are only charged when the share price exceeds the previous all-time high, preventing fees on recovery from losses.

### Tests
- **[FeeOnRecovery.t.sol](file:///home/x/earngrid/packages/foundry/test/FeeOnRecovery.t.sol)**:
    - Created a new test file to reproduce the bug and verify the fix.
    - `testNoFeeOnRecovery`: Confirms that no fees are charged when assets drop and then recover to the original level.
    - `testFeeOnNewHigh`: Confirms that fees *are* charged when the price exceeds the previous HWM.
- **[EarnGridVault.t.sol](file:///home/x/earngrid/packages/foundry/test/EarnGridVault.t.sol)**:
    - Updated legacy tests to use `highWaterMark` assertions instead of `feeCheckpoint`.
    - Relaxed assertion precision slightly to account for rounding differences in the new logic.

## Verification Results

### Automated Tests
Ran `forge test` to verify all contracts.

```bash
Ran 2 test suites: 8 tests passed, 0 failed, 0 skipped (8 total tests)
```

- `FeeOnRecoveryTest`: **PASSED**
- `EarnGridVaultTest`: **PASSED**

## Conclusion
The critical High-Water Mark bug has been successfully fixed. The vault now correctly tracks the share price for performance fees, ensuring users are not penalized for volatility.
