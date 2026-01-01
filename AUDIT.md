# EarnGrid Security Audit Report

**Date:** December 24, 2025  
**Auditor:** AI Security Analyst  
**Scope:** Full codebase review (v0.1)  
**Status:** Pre-production / Unaudited

---

## Executive Summary

EarnGrid is a USDC savings dApp on Base implementing an ERC-4626 vault-of-vaults architecture. Users deposit USDC and receive vault shares, while funds are allocated across whitelisted yield strategies (currently MetaMorpho vaults) with caps, tiered exposure limits, and queue-based routing.

### Overall Assessment

| Category | Rating | Notes |
|----------|--------|-------|
| **Architecture** | ✅ Strong | Well-designed vault-of-vaults with proper separation of concerns |
| **Security** | ✅ Good | Comprehensive threat model and mitigations implemented |
| **Code Quality** | ✅ Good | Clean, readable Solidity with consistent patterns |
| **Test Coverage** | ⚠️ Adequate | Core flows covered; room for expansion |
| **Documentation** | ✅ Excellent | Thorough architecture, threat model, and strategy docs |
| **Production Readiness** | ⚠️ Not Ready | Requires professional audit before mainnet |

### Key Findings Summary

| Severity | Count | Description |
|----------|-------|-------------|
| Critical | 0 | None identified |
| High | 1 | Performance fee edge case potential |
| Medium | 3 | Gas optimization, donation attack surface, queue manipulation |
| Low | 5 | Minor improvements and best practices |
| Informational | 6 | Suggestions and enhancements |

---

## 1. Smart Contract Analysis

### 1.1 BlendedVault.sol (863 lines)

**Strengths:**
- ✅ Uses OpenZeppelin's battle-tested `ERC4626`, `AccessControl`, `ReentrancyGuard`
- ✅ Proper role separation (Owner, Curator, Allocator, Guardian)
- ✅ Timelock for risk-increasing changes (≥24h delay)
- ✅ High-water mark fee mechanism prevents fee overcollection
- ✅ Same-block double-harvest prevention
- ✅ Minimum harvest interval guard
- ✅ Strict withdrawal semantics (revert on insufficient liquidity)
- ✅ Per-strategy caps and tier exposure limits
- ✅ Deposit/withdraw queue-based routing
- ✅ Emergency pause controls for deposits/withdrawals
- ✅ Non-upgradeable design (safest for v0.1)

**Code Structure:**
```solidity
// Well-organized constructor with comprehensive initialization
constructor(
    IERC20Metadata asset_,
    string memory name_,
    string memory symbol_,
    address owner_,
    address curator_,
    address allocator_,
    address guardian_,
    address feeRecipient_,
    uint256[3] memory tierMaxBps_,
    uint256 idleLiquidityBps_,
    uint256 minInitialDeposit_,
    uint256 minHarvestInterval_,
    uint256 timelockDelay_
) ...
```

---

## 2. Security Findings

### 2.1 High Severity

#### [H-01] Performance Fee Calculation Edge Case

**Location:** `BlendedVault.sol:543-546`

```solidity
uint256 profitAssets =
    ((currentAssetsPerShare - highWatermarkAssetsPerShare) * supply) / 1e18;
uint256 feeAssets = (profitAssets * FEE_BPS) / MAX_BPS;
uint256 feeShares = _feeSharesForAssets(feeAssets, supply);
```

**Issue:** When `totalAssets` is very close to `feeAssets`, the fee share calculation in `_feeSharesForAssets` can produce unexpected results or return 0 due to the `total <= feeAssets` check.

**Impact:** In edge cases with very small profits and high supply, fee collection may be inconsistent.

**Recommendation:** Add explicit minimum profit threshold before fee collection:
```solidity
uint256 constant MIN_PROFIT_FOR_FEE = 1e6; // 1 USDC minimum
if (profitAssets < MIN_PROFIT_FOR_FEE) {
    return; // Skip harvest for dust profits
}
```

---

### 2.2 Medium Severity

#### [M-01] Donation Attack Surface via Underlying Strategies

**Location:** `BlendedVault.sol:160-172` (`totalAssets`)

**Issue:** The vault uses `previewRedeem()` to value strategy shares. If an underlying strategy is vulnerable to donation attacks (direct asset transfers inflating share price), this could be exploited.

**Impact:** Attacker could artificially inflate `assetsPerShare`, trigger harvest, and extract value through fee manipulation.

**Mitigations Already Present:**
- Same-block harvest prevention
- Minimum harvest interval
- Strategy allowlisting

**Recommendation:** Add an offchain or onchain sanity check for share price deviation (e.g., max 2% change per sample period before harvest is allowed).

---

#### [M-02] Gas Optimization in Queue Operations

**Location:** `BlendedVault.sol:775-802` (`_setDepositQueue`, `_setWithdrawQueue`)

**Issue:** Queue setting deletes and rebuilds arrays in storage, which is gas-intensive.

```solidity
delete depositQueue;
for (uint256 i = 0; i < len; i++) {
    depositQueue.push(newQueue[i]);
}
```

**Impact:** High gas costs for queue updates on strategies with many strategies.

**Recommendation:** Consider batch-updating with a single storage write or using mapping-based priority queues for v2.

---

#### [M-03] Withdraw Queue May Skip Disabled Strategies

**Location:** `BlendedVault.sol:604-627` (`_ensureLiquidity`)

**Issue:** The withdraw logic skips unregistered strategies but not disabled ones. A disabled strategy's funds are still counted in `totalAssets()` via `strategyList`, but liquidity routing may not access them correctly.

```solidity
if (!config.registered) {
    continue;
}
if (!config.isSynchronous) {
    continue;
}
```

**Recommendation:** Add explicit check for `config.enabled` or ensure disabled strategies are still in `withdrawQueue` until fully unwound.

---

### 2.3 Low Severity

#### [L-01] Missing Event for Queue Updates on Strategy Removal

**Location:** `BlendedVault.sol:378-386` (`removeStrategy`)

**Issue:** When a strategy is removed, `_removeFromQueue` is called but no separate queue update event is emitted.

**Recommendation:** Emit `QueuesUpdated` after `_removeFromQueue` for indexer consistency.

---

#### [L-02] feeBalanceBefore Reference in Test

**Location:** `BlendedVaultFees.t.sol:77`

**Issue:** `feeBalanceBefore` is referenced but never defined in `testMultipleDepositorsFeeAccrual`.

```solidity
assertEq(vault.balanceOf(feeRecipient), feeBalanceBefore + expectedFeeShares);
```

**Impact:** Test may fail or produce false positives.

**Recommendation:** Add `uint256 feeBalanceBefore = vault.balanceOf(feeRecipient);` before second harvest.

---

#### [L-03] Curator Can Reduce Timelock Delay

**Location:** `BlendedVault.sol:346-353` (`setTimelockDelay`)

**Issue:** Only `DEFAULT_ADMIN_ROLE` can change timelock, which is correct. However, reducing timelock delay should ideally also be timelocked.

**Recommendation:** Consider timelocking timelock delay reductions (meta-timelock).

---

#### [L-04] No Explicit Strategy Asset Validation in Queue Setting

**Location:** `BlendedVault.sol:775-802`

**Issue:** `_setDepositQueue` validates `registered && enabled` but `_setWithdrawQueue` only validates `registered`. This is intentional but could be documented better.

---

#### [L-05] Hardcoded Fee BPS

**Location:** `BlendedVault.sol:46`

```solidity
uint256 public constant FEE_BPS = 300;
```

**Issue:** Fee is hardcoded at 3%. Consider making this configurable (with timelock) for future flexibility.

---

### 2.4 Informational

#### [I-01] Consider Adding View Functions for Tier Exposure

Add `getCurrentTierExposure()` as a public view for transparency.

#### [I-02] Event Indexing

Consider adding `indexed` to more event parameters for efficient offchain queries.

#### [I-03] NatSpec Documentation

Add comprehensive NatSpec comments to all public/external functions.

#### [I-04] Slippage Protection on Withdrawals

Consider adding slippage protection parameter on withdrawals (min assets received).

#### [I-05] Add Strategy Metadata URI

The `StrategyConfig` has placeholder for `notesHash/metadataURI` — consider implementing for transparency.

#### [I-06] Indexer Reorg Handling

The TODO notes indicate reorg safety is pending. Implement confirmations-based rollback.

---

## 3. Test Coverage Analysis

### 3.1 Tests Present

| Test File | Coverage |
|-----------|----------|
| `BlendedVault.t.sol` | Deposit/withdraw, pause, role checks, cap/tier limits |
| `BlendedVaultFees.t.sol` | Fee accrual, same-block harvest, harvest interval, multi-depositor |
| `BlendedVaultFuzz.t.sol` | Monotonic conversions, first-deposit inflation, min deposit |
| `BlendedVaultReentrancy.t.sol` | Reentrancy guard with malicious strategy |
| `BlendedVaultTimelock.t.sol` | Timelock for strategy add, cap increase, tier increase |
| `BlendedVaultBase.t.sol` | Shared test setup |

### 3.2 Missing Test Coverage

| Area | Recommendation |
|------|----------------|
| Fork Tests | Test against real MetaMorpho vaults on Base |
| Invariant Tests | Add `totalAssets` accounting invariants across rebalances |
| Edge Cases | Test with 0 idle liquidity, max strategies, queue exhaustion |
| Admin Actions | Test all role-gated functions with unauthorized callers |
| Fee Math | Test edge cases with very small profits, high supply |
| Emergency Unwind | Test `forceRemoveStrategy` flow with active allocations |

---

## 4. Architecture Review

### 4.1 Onchain Components ✅

- **BlendedVault:** Solid ERC-4626 implementation with proper hooks
- **Role Separation:** Clear owner/curator/allocator/guardian boundaries
- **Timelock:** 2-step schedule/execute pattern for risk-increasing changes
- **Strategy Registry:** Per-strategy caps, tiers, and sync flags

### 4.2 Offchain Components ✅

- **SDK (380 lines):** Clean viem-based helpers for reads and tx encoding
- **Indexer (194 lines):** Event ingestion + hourly sampling + APY calculation
- **API:** Health, TVL, APY, allocations, price-history endpoints

### 4.3 Frontend ✅

- **Next.js App Router:** Modern React with wagmi/viem integration
- **Pages:** Dashboard, Vault, Strategies, Admin
- **Components:** Well-structured with onchain reads and deposit/withdraw panels

---

## 5. Documentation Quality

| Document | Quality | Notes |
|----------|---------|-------|
| `ARCHITECTURE.md` | ✅ Excellent | Comprehensive flows and state model |
| `THREAT_MODEL.md` | ✅ Excellent | 10 threat categories with mitigations |
| `STRATEGY_UNIVERSE.md` | ✅ Excellent | Due diligence template and candidate vaults |
| `RUNBOOK.md` | ✅ Good | Deployment and incident response |
| `AGENTS.md` | ✅ Excellent | Agent roles and task definitions |
| `README.md` | ✅ Good | Quickstart and overview |

---

## 6. Gas Optimization Opportunities

| Location | Optimization | Estimated Savings |
|----------|--------------|-------------------|
| `totalAssets()` | Cache `strategyList.length` | ~100 gas per call |
| `_currentTierExposure()` | Early exit if strategy has 0 shares | Variable |
| Queue operations | Use mapping instead of array iteration | 20-50% on queue ops |
| `_allocateIdle()` | Batch external calls | Variable |

---

## 7. Recommendations

### Critical (Before Any Deployment)

1. **Professional Audit:** Engage a top-tier auditor (Trail of Bits, OpenZeppelin, Spearbit)
2. **Fork Tests:** Implement tests against live MetaMorpho vaults
3. **Bug Bounty:** Set up Immunefi program before mainnet

### High Priority

4. **Fix Test Bug:** `feeBalanceBefore` undefined in fee tests
5. **Donation Guard:** Implement share price deviation check
6. **Invariant Tests:** Add `totalAssets` accounting invariant

### Medium Priority

7. **Gas Optimization:** Optimize queue operations
8. **Withdraw Queue Logic:** Clarify disabled strategy handling
9. **Event Emission:** Add queue update events on strategy removal

### Nice to Have

10. **Slippage Protection:** Add min assets param on withdrawals
11. **Configurable Fees:** Make fee BPS owner-configurable (with timelock)
12. **Strategy Metadata:** Implement URI/notes field

---

## 8. Conclusion

EarnGrid demonstrates strong security engineering practices with a well-thought-out architecture, comprehensive threat modeling, and solid test coverage. The codebase is clean, readable, and follows established patterns.

**Key Strengths:**
- Excellent documentation and threat modeling
- Proper use of OpenZeppelin security primitives
- Timelock governance for risk management
- Non-upgradeable v0.1 design
- Reentrancy protection tested

**Areas for Improvement:**
- Professional external audit required
- Fork testing against production strategies
- Edge case testing for fee mechanics
- Minor code quality fixes

### Risk Rating

| Category | Rating |
|----------|--------|
| Smart Contract Risk | Medium (pending professional audit) |
| Centralization Risk | Low (timelock + multisig recommended) |
| Economic Risk | Medium (dependent on underlying strategies) |
| Operational Risk | Low (clear runbook and monitoring) |

---

## 9. Appendix

### A. Files Reviewed

```
packages/contracts/src/BlendedVault.sol (863 lines)
packages/contracts/src/mocks/MockERC20USDC.sol
packages/contracts/src/mocks/MockERC4626Strategy.sol
packages/contracts/src/mocks/MaliciousReentrantStrategy.sol
packages/contracts/test/BlendedVault.t.sol
packages/contracts/test/BlendedVaultBase.t.sol
packages/contracts/test/BlendedVaultFees.t.sol
packages/contracts/test/BlendedVaultFuzz.t.sol
packages/contracts/test/BlendedVaultReentrancy.t.sol
packages/contracts/test/BlendedVaultTimelock.t.sol
packages/sdk/src/index.ts (380 lines)
services/indexer/src/index.ts (129 lines)
services/indexer/src/indexer.ts (194 lines)
apps/web/* (frontend components)
docs/ARCHITECTURE.md
docs/THREAT_MODEL.md
docs/STRATEGY_UNIVERSE.md
docs/RUNBOOK.md
```

### B. Tools & Methodology

- Manual code review
- Static analysis patterns
- Test coverage analysis
- Documentation review
- Architecture assessment

---

> ⚠️ **Disclaimer:** This audit is informational only and does not constitute a guarantee of security. A professional security audit by an established firm is strongly recommended before any mainnet deployment.
