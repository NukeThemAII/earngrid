# Implementation Plan - Safety & UX Improvements

## Goal Description
Implement essential safety features and UX improvements to make the dApp production-ready (v1.1).
1.  **Contract Safety**: Add `Pausable` functionality to `EarnGridVault4626` to allow the owner to freeze deposits/withdrawals in an emergency.
2.  **Frontend Safety**: Gate UI interactions when contract addresses are not configured (Zero Address).
3.  **Frontend UX**: Change token approval to use the exact deposit amount instead of a hardcoded 1 billion.

## User Review Required
> [!NOTE]
> **Pausable**: The owner will have the ability to pause the contract. This is a centralization risk but standard for v1 safety.

## Proposed Changes

### Smart Contracts

#### [MODIFY] [EarnGridVault4626.sol](file:///home/x/earngrid/packages/foundry/contracts/src/EarnGridVault4626.sol)
- Inherit from `Pausable` (OpenZeppelin).
- Add `pause()` and `unpause()` functions restricted to `onlyOwner`.
- Add `whenNotPaused` modifier to `deposit`, `mint`, `withdraw`, `redeem`.

### Frontend

#### [MODIFY] [page.tsx](file:///home/x/earngrid/packages/nextjs/app/page.tsx)
- **Zero Address Gating**: Disable "Deposit", "Withdraw", and "Approve" buttons if `vaultAddress` or `assetAddress` is zero/undefined. Show a clear "Not Configured" warning.
- **Exact Approval**: Update `handleApprove` to approve exactly `depositAmountParsed` instead of `1000000000`.

## Verification Plan

### Automated Tests
- Add a test case in `EarnGridVault.t.sol` to verify that `deposit` reverts when paused.

### Manual Verification
- Verify in the code that the UI buttons are disabled when addresses are missing.
