```
  ____  _                 _           _   _            _ _
 | __ )| | ___ _ __   ___| |__   ___ | |_(_)_ __   ___| | |
 |  _ \| |/ _ \ '_ \ / __| '_ \ / _ \| __| | '_ \ / _ \ | |
 | |_) | |  __/ | | | (__| | | | (_) | |_| | | | |  __/ | |
 |____/|_|\___|_| |_|\___|_| |_|\___/ \__|_|_| |_|\___|_|_|

 USDC Blended Vault · ERC-4626 vault-of-vaults on Base
```

High‑trust USDC “savings” vault that allocates to a whitelisted set of yield sources with caps, tier limits, and transparent rebalancing. Target net APY ~7–10% (market‑dependent).

## Highlights
- ERC‑4626 vault that issues shares (no extra token).
- Strategy allowlist with caps, deposit/withdraw queues, and tier exposure limits.
- 3% performance fee via high‑water mark and fee share minting.
- Timelock for risk‑increasing governance changes (>=24h).
- Indexer/API for APY, TVL, and allocations.
- Next.js UI (coming in later steps).

## Repo Layout
```
/apps
  /web               # Next.js App Router UI
/packages
  /contracts         # Foundry contracts + tests
  /sdk               # viem-based SDK
  /ui                # shared UI components
/services
  /indexer           # Node/TS: event indexer + APY API
/infra
  docker-compose.yml # local Postgres for indexer
/docs
  ARCHITECTURE.md
  THREAT_MODEL.md
  STRATEGY_UNIVERSE.md
  RUNBOOK.md
AGENTS.md
LOG.md
```

## Quickstart
```bash
pnpm i

# Contracts
cd packages/contracts
git submodule update --init --recursive
pnpm test

# Indexer
pnpm -C services/indexer dev

# Web (later step)
pnpm -C apps/web dev
```

## Contracts (v0.1)
- `BlendedVault` (ERC‑4626): USDC asset, share token, allowlisted strategies.
- Caps, queues, tier limits enforced onchain.
- Performance fee: 3% of profit with high‑water mark in `harvest()`.
- Roles: owner, curator, allocator, guardian.
- Timelock for risk‑increasing changes.

## Indexer API
- `GET /api/apy` → realized 7d/30d APY (from assetsPerShare snapshots)
- `GET /api/tvl` → latest totalAssets/totalSupply/assetsPerShare
- `GET /api/allocations` → latest per‑strategy assets snapshot

Environment variables (indexer):
```
INDEXER_RPC_URL=...
VAULT_ADDRESS=0x...
DATABASE_URL=sqlite:./indexer.db
START_BLOCK=0
POLL_INTERVAL_MS=10000
SAMPLE_INTERVAL_SEC=3600
FINALITY_BLOCKS=2
MAX_BLOCK_RANGE=2000
PORT=3001
```

## Status
MVP in progress. Contracts + tests + SDK + indexer are implemented. UI and production configs are next.

## Docs
Read these first:
- `docs/ARCHITECTURE.md`
- `docs/THREAT_MODEL.md`
- `docs/STRATEGY_UNIVERSE.md`
- `docs/RUNBOOK.md`

## Security
This code is unaudited and for development/testing only.
