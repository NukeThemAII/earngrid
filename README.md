```
 __  __      _        __   __     _     _
|  \/  | ___| |_ __ _ \ \ / /__ _| |__ | | ___  ___
| |\/| |/ _ \ __/ _` | \ V / _ \ | '_ \| |/ _ \/ __|
| |  | |  __/ || (_| |  | |  __/ | |_) | |  __/\__ \
|_|  |_|\___|\__\__,_|  |_|\___|_|_.__/|_|\___||___/

 MetaYield · USDC Blended Vault on Base
```

MetaYield is a USDC “savings” dApp on Base. Users deposit USDC and receive ERC‑4626 vault shares. The vault allocates across a whitelisted set of synchronous ERC‑4626 strategies with caps, queues, and tier exposure limits to target 7–10% net APY (market‑dependent).

Repository: https://github.com/NukeThemAII/MetaYield

## Current State (v0.1)
- Contracts implemented (ERC‑4626 vault‑of‑vaults, timelock policy, fee logic, roles, pauses).
- Foundry tests covering queue behavior, caps/tiers, timelock, fee accrual, reentrancy, and fuzz checks.
- viem SDK for reads + tx data encoding.
- Indexer/API for TVL, APY (7d/30d), and allocations.
- Next.js UI scaffold with dashboard/vault/strategies/admin pages and wagmi integration.
- Onchain live reads in UI for vault state + user position.

## Quickstart
```bash
pnpm i

# Contracts
git submodule update --init --recursive
pnpm -C packages/contracts test

# Indexer
pnpm -C services/indexer dev

# Web
pnpm -C apps/web dev
```

## Environment Variables
### Web
```
NEXT_PUBLIC_CHAIN_ID=8453
NEXT_PUBLIC_RPC_URL=...
NEXT_PUBLIC_INDEXER_URL=http://localhost:3001
NEXT_PUBLIC_VAULT_ADDRESS=0x...
NEXT_PUBLIC_USDC_ADDRESS=0x...
NEXT_PUBLIC_USDC_DECIMALS=6
```

### Indexer
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

## Contracts Overview
- ERC‑4626 `BlendedVault` with allowlisted strategies.
- Caps + tier exposure limits (Tier 0/1/2).
- Deposit/withdraw queues for allocation and liquidity routing.
- Performance fee: 3% of profits above high‑water mark, minted as shares.
- Timelock for risk‑increasing changes (>=24h).
- Guardian pause controls and emergency strategy removal.

## Indexer API
- `GET /api/apy` → realized 7d/30d APY
- `GET /api/tvl` → latest TVL + share price
- `GET /api/allocations` → latest per‑strategy snapshot
- `GET /api/price-history?limit=48` → recent assetsPerShare series

## Docs
Read these first:
- `docs/ARCHITECTURE.md`
- `docs/THREAT_MODEL.md`
- `docs/STRATEGY_UNIVERSE.md`
- `docs/RUNBOOK.md`

## Development Notes
- Contracts are non‑upgradeable by default (v0.1).
- v0.1 uses synchronous ERC‑4626 strategies only.
- Withdrawals revert if liquidity is insufficient.

## Safety
Unaudited, experimental code. Do not use with mainnet funds.
