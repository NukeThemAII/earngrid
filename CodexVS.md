# Codex vs. Gemini vs. Qwen – Audit Comparison

## Snapshot
- **Codex_Audit.md** (2025-11-21): Focused, concise, concrete findings with actionable next steps (env zero-address gating, pause/emergency controls, approval scope, gas read duplication, clarity on config). Did **not** surface the high-water-mark fee bug.
- **Gemini_Audit.md** (2025-11-21): Broad assessment with a high-severity finding: fee checkpoint resets on loss mean recoveries are treated as fresh yield. Cites a PoC; confirmed by `packages/foundry/test/FeeOnRecovery.t.sol`.
- **Qwen_Audit.md** (2025-11-21): Comprehensive but high-level; nonetheless aligns with Gemini on the critical HWM issue and notes the PoC.

## Comparative Strengths
- **Technical specificity**: Gemini (for the fee HWM bug with proof) > Codex (for concrete config/UX ops) > Qwen (generic but agrees on the bug).
- **Actionability**: Gemini provides the most materially impactful finding (critical economic bug plus PoC). Codex adds useful config/UX/gas fixes. Qwen’s list is broad but less prioritized.
- **Breadth (contracts + UI)**: Codex and Gemini both cover frontend; Qwen less so.
- **Evidence/Risk framing**: Gemini and Qwen cite a verified failing PoC; Codex missed that evidence.

## Best Overall
**Gemini_Audit.md** is the most valuable overall because it surfaced and proved (with `FeeOnRecovery.t.sol`) the critical high-water-mark fee bug; Qwen concurs. Codex remains useful for operational/config hardening but missed the confirmed critical.

## Follow-ups to reconcile across audits
1) Fix fee HWM: implement per-share high-water-mark or adjust checkpoint logic so loss recovery is not double-charged; add regression tests (PoC already in `packages/foundry/test/FeeOnRecovery.t.sol`).  
2) Implement Codex recommendations: gate zero-address configs, add pause/emergency controls, tighten approval amounts, reduce duplicate strategy reads.  
3) From Qwen/Gemini: add timelock/whitelist for strategy changes, richer events/monitoring, and more integration/e2e tests.
