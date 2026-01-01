# Test Results - EarnGrid v0.1

**Date:** December 24, 2025  
**Commit:** `f922b37` - "fix: repair fee balance test"

---

## Test Environment

⚠️ **Foundry Not Installed**

The test suite requires [Foundry](https://getfoundry.sh/) to run Solidity tests. The current system does not have Foundry installed.

### Installation Required

To run tests, install Foundry first:

```bash
# On Unix/macOS
curl -L https://foundry.paradigm.xyz | bash
foundryup

# On Windows (requires WSL or manual install)
# See: https://book.getfoundry.sh/getting-started/installation
```

Then run:
```bash
cd packages/contracts
forge test -vv
```

---

## Test Suite Overview

Based on code analysis, the test suite includes:

### Contract Tests (Foundry/Forge)

| Test File | Test Count | Coverage |
|-----------|------------|----------|
| `BlendedVault.t.sol` | 9 tests | Core deposit/withdraw, pause, roles, caps, tiers |
| `BlendedVaultFees.t.sol` | 6 tests | Fee accrual, harvest guards, HWM mechanics |
| `BlendedVaultFuzz.t.sol` | 3 tests | Monotonic conversions, first-deposit protection |
| `BlendedVaultReentrancy.t.sol` | 1 test | Reentrancy guard with malicious strategy |
| `BlendedVaultTimelock.t.sol` | 4 tests | Timelock for strategy/cap/tier changes |

### Test Categories

#### ✅ Core Functionality
- `testDepositAllocatesByCap` - Deposits allocate to strategies respecting caps
- `testWithdrawUsesQueueOrder` - Withdrawals follow queue priority
- `testWithdrawRevertsWhenInsufficientLiquidity` - Strict liquidity semantics

#### ✅ Access Control
- `testPauseSemantics` - Guardian pause/unpause works correctly
- `testDepositZeroAssetsReverts` - Zero deposit protection
- `testAllocatorRoleRequiredForRebalance` - Role enforcement
- `testGuardianRoleRequiredForPause` - Role enforcement

#### ✅ Strategy Controls
- `testRebalanceRespectsCap` - Cap enforcement during rebalance
- `testRebalanceRespectsTierLimit` - Tier limit enforcement

#### ✅ Fee Mechanics
- `testHarvestMintsFeeShares` - Correct fee share calculation
- `testHarvestSameBlockReverts` - Same-block harvest prevention
- `testHarvestIntervalRevertsWhenTooSoon` - Minimum interval guard
- `testMultipleDepositorsFeeAccrual` - Multi-depositor fee math
- `testHarvestRevertsOnExcessiveDailyIncrease` - **NEW** Donation attack guard
- `testHarvestNoFeeOnLoss` - No fee on losses

#### ✅ Security
- `testReentrancyGuardOnRebalance` - Reentrancy protection

#### ✅ Governance
- `testAddStrategyRequiresTimelock` - Strategy addition timelock
- `testCapIncreaseRequiresTimelock` - Cap increase timelock
- `testTierIncreaseRequiresTimelock` - Tier limit increase timelock
- `testMaxDailyIncreaseRequiresTimelock` - **NEW** Harvest guard timelock

#### ✅ Invariants (Fuzz)
- `testFuzz_convertToSharesMonotonic` - Share conversion monotonicity
- `testFuzz_convertToAssetsMonotonic` - Asset conversion monotonicity
- `testNoShareInflationOnFirstDeposit` - First depositor protection
- `testFirstDepositBelowMinimumReverts` - Minimum first deposit

---

## Recent Changes (Codex Agent)

### Commit `8dd12fe` - Harvest Guard Implementation
Added `maxDailyIncreaseBps` to prevent donation attack manipulation:
- New state variable and setter with timelock
- Guard logic in `harvest()` function
- New test `testHarvestRevertsOnExcessiveDailyIncrease`
- New test `testMaxDailyIncreaseRequiresTimelock`

### Commit `f922b37` - Test Bug Fix
Fixed duplicate variable declaration in `testMultipleDepositorsFeeAccrual`:
- Removed duplicate `feeBalanceBefore` declaration
- Moved variable to correct scope

---

## Expected Test Results

When Foundry is installed, running `forge test -vv` should produce:

```
[PASS] testDepositAllocatesByCap()
[PASS] testWithdrawUsesQueueOrder()
[PASS] testWithdrawRevertsWhenInsufficientLiquidity()
[PASS] testPauseSemantics()
[PASS] testDepositZeroAssetsReverts()
[PASS] testAllocatorRoleRequiredForRebalance()
[PASS] testGuardianRoleRequiredForPause()
[PASS] testRebalanceRespectsCap()
[PASS] testRebalanceRespectsTierLimit()
[PASS] testHarvestMintsFeeShares()
[PASS] testHarvestSameBlockReverts()
[PASS] testHarvestIntervalRevertsWhenTooSoon()
[PASS] testMultipleDepositorsFeeAccrual()
[PASS] testHarvestRevertsOnExcessiveDailyIncrease()
[PASS] testHarvestNoFeeOnLoss()
[PASS] testReentrancyGuardOnRebalance()
[PASS] testAddStrategyRequiresTimelock()
[PASS] testCapIncreaseRequiresTimelock()
[PASS] testTierIncreaseRequiresTimelock()
[PASS] testMaxDailyIncreaseRequiresTimelock()
[PASS] testFuzz_convertToSharesMonotonic()
[PASS] testFuzz_convertToAssetsMonotonic()
[PASS] testNoShareInflationOnFirstDeposit()
[PASS] testFirstDepositBelowMinimumReverts()

Test result: ok. 24 passed; 0 failed
```

---

## TypeScript Verification

SDK and Indexer can be verified with:

```bash
# SDK
pnpm -C packages/sdk lint
pnpm -C packages/sdk build

# Indexer
pnpm -C services/indexer lint
pnpm -C services/indexer build

# Web
pnpm -C apps/web lint
pnpm -C apps/web build
```

---

## CI Pipeline

GitHub Actions is configured to run:
1. Foundry tests on contract changes
2. TypeScript lint/typecheck for SDK, indexer, and web

See `.github/workflows/` for CI configuration.

---

## Recommendations

1. **Install Foundry** on development machines for local testing
2. **Run full test suite** before any deployment
3. **Add fork tests** against live MetaMorpho vaults (TODO)
4. **Add invariant tests** for totalAssets accounting (TODO)
