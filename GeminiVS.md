# Comparison of Audit Reports: Gemini vs. Codex vs. Qwen

**Date:** 2025-11-21
**Subject:** EarnGrid dApp Audit Comparison

## 1. Executive Summary

Three AI agents (Gemini, Codex, Qwen) audited the EarnGrid codebase.
- **Gemini** is the **clear winner** because it identified a **critical economic vulnerability** (High-Water Mark reset on loss) that the other two missed.
- **Codex** provided a solid, concise review with good practical findings for the frontend and devops (zero address issues).
- **Qwen** produced a very long, verbose report but missed the critical logic flaw, focusing instead on generic "best practice" advice and minor gas optimizations.

## 2. Detailed Comparison Table

| Feature | Gemini (Antigravity) | Codex | Qwen |
| :--- | :--- | :--- | :--- |
| **Critical Bugs Found** | **1 (HWM Reset on Loss)** | 0 | 0 |
| **Bug Verification** | **Yes (wrote reproduction test)** | No | No |
| **Frontend Analysis** | Good (UX/Safety focus) | **Excellent (Specific config/env issues)** | Good (Generic UI feedback) |
| **Gas Optimization** | Specific (Fee collection frequency) | Specific (Double reads) | Verbose (Generic storage advice) |
| **Report Style** | Direct, Actionable, Verified | Concise, Practical | Verbose, Generic |
| **Rating** | **Best** | Good | Average |

## 3. Analysis of Each Agent

### 🏆 Gemini (Antigravity)
**Strengths:**
- **Deep Logic Analysis:** The only agent to catch the `feeCheckpoint` reset bug in `EarnGridVault4626.sol`. This bug causes users to lose principal to fees during market recovery, which is fatal for a yield vault.
- **Proof of Work:** Wrote and ran a specific Foundry test (`FeeOnRecoveryTest`) to prove the bug existed.
- **Balanced Scope:** Covered both contracts and frontend without getting lost in fluff.

**Weaknesses:**
- Missed the minor "Zero Address" configuration issue in the frontend that Codex caught.

### 🥈 Codex
**Strengths:**
- **Practical Dev Focus:** Caught the `zeroAddress` issue in `externalContracts.ts` which would break the UI in a real deployment.
- **Concise:** The report was short and to the point, easy for a developer to read and act on.
- **Good Low-Severity Finds:** Identified the "Double external reads" gas issue.

**Weaknesses:**
- **Missed Critical Logic:** Completely missed the High-Water Mark bug.
- **Surface Level Contract Audit:** Focused more on structure/config than deep economic logic.

### 🥉 Qwen
**Strengths:**
- **Comprehensive Formatting:** Very structured report with detailed sections.
- **Breadth:** Covered every aspect of the code (Architecture, Security, Gas, UI).

**Weaknesses:**
- **False Negatives:** Missed the critical HWM bug.
- **Generic Advice:** Much of the report felt like a template (e.g., "Add Timelock," "Centralization Risk," "Gas Optimization"). While true, it wasn't specific to the unique logic of this vault.
- **Noise:** The "Gas Optimization" section was very long but mostly theoretical (e.g., "Cache Storage Reads") without pointing to the most critical logic flaws.

## 4. Conclusion

**Gemini is the best audit.**
In smart contract auditing, finding the **one critical bug** that drains user funds is infinitely more valuable than finding 10 minor gas optimizations or style issues. Gemini found the logic flaw that breaks the core promise of the product (performance fees only on positive yield), verified it with code, and provided a fix. Codex is a good runner-up for its practical frontend insights.
