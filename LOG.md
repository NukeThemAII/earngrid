# Work Log

## 2025-12-24

### Repo scaffolding
- Created monorepo layout per `AGENTS.md` with `apps/`, `packages/`, `services/`, `infra/`, and `docs/`.
- Added `pnpm-workspace.yaml`, root `package.json`, and `docs/RUNBOOK.md` stub.

### Contracts (Foundry)
- Implemented `packages/contracts/src/BlendedVault.sol`:
  - ERC-4626 vault-of-vaults for USDC with allowlist, caps, queues, tier exposure limits, and idle liquidity target.
  - Roles: owner (admin), curator, allocator, guardian.
  - Timelock flow for risk-increasing changes: schedule + execute with >=24h delay.
  - Performance fee: 3% high-water mark via fee share minting in `harvest()`.
  - Emergency controls: pause deposits/withdrawals, force remove strategies.
  - Strict withdraw semantics: revert if insufficient liquidity.
- Added mocks in `packages/contracts/src/mocks/`:
  - `MockERC20USDC` (6 decimals).
  - `MockERC4626Strategy` (configurable liquidity, yield/loss).
  - `MaliciousReentrantStrategy` for reentrancy tests.
- Added deployment scripts:
  - `DeployBaseMainnet.s.sol` with Base USDC constant.
  - `DeployBaseSepolia.s.sol` with TODO env for Base Sepolia USDC address.
- Added tests covering threat model mappings:
  - Deposit/withdraw flows, queue order, caps and tier limits.
  - Timelock enforcement for risk-increasing changes.
  - Harvest fee correctness and guardrails (same-block + min interval).
  - Reentrancy guard with malicious strategy mock.
  - Fuzz checks for monotonic conversions and no first-deposit share inflation.

### SDK (TypeScript)
- Implemented `packages/sdk` with viem helpers:
  - ABI exports, typed state reads, allocations, user position.
  - Tx data encoders for deposit/withdraw/rebalance/harvest and timelock actions.

### Indexer (Node/TS)
- Implemented `services/indexer`:
  - Kysely-based DB with SQLite (dev) and Postgres (prod) support.
  - Event ingestion via viem logs, stored with JSON payloads.
  - Hourly sampler storing assetsPerShare snapshots + allocations.
  - API endpoints: `/api/apy`, `/api/tvl`, `/api/allocations`.
- Updated `infra/docker-compose.yml` with Postgres service for local dev.

### README
- Rewritten root `README.md` with MetaYield branding, current state, and updated quickstart/envs.

### Frontend (Next.js)
- Scaffolded `apps/web` with Next.js App Router + Tailwind + shadcn-style UI primitives.
- Added wagmi/viem providers and wallet connect button.
- Implemented pages: `/` dashboard, `/vault`, `/strategies`, `/admin`.
- Wired indexer API reads for TVL/APY/allocations on server-rendered pages.
- Built basic deposit/withdraw panel with approve/deposit/withdraw txs.

## Key design choices
- v0.1 uses synchronous ERC-4626 strategies only.
- Strict withdrawals: revert on insufficient liquidity (no partial withdrawals).
- Deposits auto-allocate to the deposit queue while maintaining `idleLiquidityBps`.
- High-water mark starts at 1e18, updates on first deposit and on harvest.

## Open TODOs
- Populate `docs/STRATEGY_UNIVERSE.md` with Base strategy addresses + due diligence.
- Confirm Base Sepolia USDC address for deployment script.
- UI implementation in `apps/web` (dashboard, vault, strategies, admin).
- Indexer hardening: reorg handling + confirmations tuning if needed.
