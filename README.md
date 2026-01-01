```
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║   ███████╗ █████╗ ██████╗ ███╗   ██╗ ██████╗ ██████╗ ██╗██████╗              ║
║   ██╔════╝██╔══██╗██╔══██╗████╗  ██║██╔════╝ ██╔══██╗██║██╔══██╗             ║
║   █████╗  ███████║██████╔╝██╔██╗ ██║██║  ███╗██████╔╝██║██║  ██║             ║
║   ██╔══╝  ██╔══██║██╔══██╗██║╚██╗██║██║   ██║██╔══██╗██║██║  ██║             ║
║   ███████╗██║  ██║██║  ██║██║ ╚████║╚██████╔╝██║  ██║██║██████╔╝             ║
║   ╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝ ╚═╝  ╚═╝╚═╝╚═════╝              ║
║                                                                              ║
║                       🏦 Smart USDC Savings on Base                          ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

<div align="center">

[![Base](https://img.shields.io/badge/Chain-Base-0052FF?style=for-the-badge&logo=coinbase)](https://base.org)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.24-363636?style=for-the-badge&logo=solidity)](https://soliditylang.org)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)
[![Tests](https://img.shields.io/badge/Tests-24%20Passing-brightgreen?style=for-the-badge)](TESTS.md)

**Earn yield on your USDC. Automated. Diversified. Transparent.**

[📖 Docs](#-documentation) • [🚀 Quick Start](#-quick-start) • [🏗️ Architecture](#️-architecture) • [🔒 Security](#-security)

</div>

---

## 🎯 What is EarnGrid?

EarnGrid is a USDC savings dApp on Base. Users deposit USDC and receive ERC-4626 vault shares. The vault allocates across a whitelisted set of synchronous ERC-4626 strategies with caps, queues, and tier exposure limits, targeting 7-10% net APY (market-dependent).

### Plain-English Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│   💵 You deposit USDC    ──►    🏦 EarnGrid Vault                  │
│                                        │                            │
│   🎫 You get a receipt                 │                            │
│      (vault shares)                    ▼                            │
│                              ┌─────────────────┐                    │
│                              │  Yield Sources  │                    │
│                              │ ┌─────┐ ┌─────┐ │                    │
│                              │ │ 📈  │ │ 📈  │ │                    │
│                              │ └─────┘ └─────┘ │                    │
│                              └────────┬────────┘                    │
│                                       │                             │
│   💰 Your shares grow                 │                             │
│      in value over time    ◄──────────┘                             │
│                                                                     │
│   🏧 Withdraw anytime      ──►    💵 Get more USDC back             │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**How it works:**
- 📥 **Deposit** → Put in your USDC
- 🎫 **Receive** → Get vault shares (your receipt)
- 📈 **Earn** → Vault spreads funds across vetted yield sources with strict caps and queues
- 💰 **Profit** → Your shares become worth more USDC over time
- 📤 **Withdraw** → Cash out when underlying strategies have liquidity (withdrawals revert if they do not)

**Fee structure:**
- ✅ No deposit fees
- ✅ No withdrawal fees  
- 💡 3% performance fee on profits only (never your principal)

---

## 📦 Current State (v0.1)

- ✅ Contracts implemented (ERC-4626 vault-of-vaults, timelock policy, fee logic, roles, pauses)
- ✅ Foundry tests covering queue behavior, caps/tiers, timelock, fee accrual, reentrancy, and fuzz checks
- ✅ viem SDK for reads + tx data encoding
- ✅ Indexer/API for TVL, APY (7d/30d), allocations, and price history with rate limiting
- ✅ Next.js UI with dashboard/vault/strategies/admin pages, wagmi wallet connect, and tx toasts
- ✅ Onchain live reads in UI for vault state, user position, strategy metadata, queues, and allocation breakdown

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- pnpm
- Foundry (for contract tests)

### Installation

```bash
# Clone the repo
git clone https://github.com/NukeThemAII/EarnGrid.git
cd EarnGrid

# Install dependencies
pnpm install

# Initialize submodules (OpenZeppelin, Forge)
git submodule update --init --recursive
```

### Run Everything

```bash
# 🧪 Run contract tests
pnpm -C packages/contracts test

# 📡 Start the indexer (data API)
pnpm -C services/indexer dev

# 🌐 Start the web app
pnpm -C apps/web dev
```

### Environment Variables

<details>
<summary>📱 Web App (.env)</summary>

```env
NEXT_PUBLIC_CHAIN_ID=8453
NEXT_PUBLIC_RPC_URL=https://mainnet.base.org
NEXT_PUBLIC_INDEXER_URL=http://localhost:3001
NEXT_PUBLIC_VAULT_ADDRESS=0x...
NEXT_PUBLIC_USDC_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
NEXT_PUBLIC_USDC_DECIMALS=6
```
</details>

<details>
<summary>📊 Indexer (.env)</summary>

```env
INDEXER_RPC_URL=https://mainnet.base.org
VAULT_ADDRESS=0x...
DATABASE_URL=sqlite:./indexer.db
START_BLOCK=0
POLL_INTERVAL_MS=10000
SAMPLE_INTERVAL_SEC=3600
FINALITY_BLOCKS=2
MAX_BLOCK_RANGE=2000
RATE_LIMIT_WINDOW_SEC=60
RATE_LIMIT_MAX=120
PORT=3001
```
</details>

---

## 🏗️ Architecture

```
                              ┌──────────────────┐
                              │   👤 User        │
                              │   (Wallet)       │
                              └────────┬─────────┘
                                       │
                    ┌──────────────────┴───────────────────┐
                    │                                       │
                    ▼                                       ▼
         ┌──────────────────┐                    ┌──────────────────┐
         │  🌐 Frontend     │                    │  📡 Indexer      │
         │  (Next.js)       │◄──── REST ────────│  (Node.js)       │
         │  apps/web        │                    │  services/indexer│
         └────────┬─────────┘                    └────────┬─────────┘
                  │                                        │
                  │ wagmi/viem                            │ viem
                  ▼                                        ▼
         ┌─────────────────────────────────────────────────────────┐
         │                      ⛓️ Base Network                     │
         │  ┌─────────────────────────────────────────────────┐    │
         │  │                🏦 BlendedVault                   │    │
         │  │                (ERC-4626)                        │    │
         │  │                                                  │    │
         │  │   ┌─────────┐  ┌─────────┐  ┌─────────┐         │    │
         │  │   │Strategy │  │Strategy │  │Strategy │  ...    │    │
         │  │   │   A     │  │   B     │  │   C     │         │    │
         │  │   │(Tier 0) │  │(Tier 1) │  │(Tier 2) │         │    │
         │  │   └─────────┘  └─────────┘  └─────────┘         │    │
         │  └─────────────────────────────────────────────────┘    │
         └─────────────────────────────────────────────────────────┘
```

### Monorepo Structure

```
EarnGrid/
├── 📁 apps/
│   └── web/              # Next.js frontend
├── 📁 packages/
│   ├── contracts/        # Solidity (Foundry)
│   └── sdk/              # TypeScript SDK (viem)
├── 📁 services/
│   └── indexer/          # Data API with rate limiting
├── 📁 docs/              # Architecture, threat model
└── 📁 infra/             # Docker, deployment
```

---

## 🔐 Smart Contract Details

### BlendedVault.sol

ERC-4626 vault with allowlisted strategies:

| Feature | Description |
|---------|-------------|
| **Caps** | Maximum allocation per strategy |
| **Tiers** | Risk classification (0=safest, 2=riskiest) |
| **Tier Limits** | Max exposure per risk tier (configured at deploy; see docs for examples) |
| **Queues** | Priority ordering for deposits/withdrawals |
| **Timelock** | ≥24h delay for risk-increasing changes |
| **Harvest Guard** | Optional max daily share-price increase cap (anti-manipulation) |

### Roles

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   👑 Owner  │     │  🎨 Curator │     │  🤖 Allocator│    │  🛡️ Guardian │
├─────────────┤     ├─────────────┤     ├─────────────┤     ├─────────────┤
│ • Fee recip │     │ • Add/remove│     │ • Set queues│     │ • Pause     │
│ • Grant     │     │   strategies│     │ • Rebalance │     │ • Emergency │
│   roles     │     │ • Set caps  │     │ • Harvest   │     │   remove    │
│ • Full      │     │ • Set tiers │     │             │     │             │
│   admin     │     │             │     │             │     │             │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

Note: fee bps is fixed at 3% in v0.1. The owner can set `feeRecipient` and `timelockDelay` (>=24h).

### Performance Fee

```
┌────────────────────────────────────────────────────────────────┐
│                    Performance Fee: 3%                          │
├────────────────────────────────────────────────────────────────┤
│   High Water Mark System:                                       │
│                                                                 │
│   Share Price: $1.00 ──► $1.10 ──► $1.05 ──► $1.15             │
│                              │           │       │              │
│   Fee Charged:           3% on $0.10    None   3% on $0.05     │
│                           profit        (loss)   (new profit)  │
│                                                                 │
│   ✅ Fees only on NEW profits above previous high              │
│   ✅ Never charged on losses or principal                      │
└────────────────────────────────────────────────────────────────┘
```

Fee rate is fixed at 3% in v0.1; only the fee recipient is configurable.

---

## 📡 Indexer API

| Endpoint | Description |
|----------|-------------|
| `GET /api/health` | Health check |
| `GET /api/tvl` | Latest TVL, total supply, assets per share |
| `GET /api/apy` | Realized 7d/30d APY |
| `GET /api/allocations` | Per-strategy breakdown |
| `GET /api/price-history?limit=48` | Historical share prices |

Rate limited via `RATE_LIMIT_WINDOW_SEC` and `RATE_LIMIT_MAX` (defaults 120 requests per 60 seconds per IP).

---

## 🔒 Security

### Implemented Protections

| Protection | Description |
|------------|-------------|
| 🔒 **Reentrancy Guard** | All external calls protected |
| ⏰ **Timelock** | 24h+ delay on risk-increasing changes |
| 🚨 **Pause Controls** | Guardian can halt deposits/withdrawals |
| 📊 **Harvest Guard** | Max daily share price increase (configurable) |
| 💵 **Min Initial Deposit** | Prevents first-depositor attack |
| 🏷️ **Caps & Tiers** | Limits exposure per strategy and risk tier |

### Development Notes

- Contracts are non-upgradeable (v0.1)
- v0.1 uses synchronous ERC-4626 strategies only
- Withdrawals revert if liquidity is insufficient

---

## 📖 Documentation

| Document | Description |
|----------|-------------|
| [📐 ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design & flows |
| [🛡️ THREAT_MODEL.md](docs/THREAT_MODEL.md) | Security analysis |
| [📊 STRATEGY_UNIVERSE.md](docs/STRATEGY_UNIVERSE.md) | Strategy research |
| [📘 RUNBOOK.md](docs/RUNBOOK.md) | Operations guide |
| [✅ TODO.md](TODO.md) | Development roadmap |
| [🧪 TESTS.md](TESTS.md) | Test instructions |

---

## 🛠️ Development

### Test Commands

```bash
# Run all contract tests
pnpm -C packages/contracts test

# Run with verbosity
pnpm -C packages/contracts test -vvv

# Run specific test
pnpm -C packages/contracts test --match-test testHarvestMintsFeeShares
```

### Build Commands

```bash
# Build contracts
pnpm -C packages/contracts build

# Build SDK
pnpm -C packages/sdk build

# Build web app
pnpm -C apps/web build
```

---

## ⚠️ Safety

This software is experimental. Smart contract risks exist. Read the [THREAT_MODEL.md](docs/THREAT_MODEL.md) before use.

---

<div align="center">

**Built with 💙 on Base**

[GitHub](https://github.com/NukeThemAII/EarnGrid) • [Report Bug](https://github.com/NukeThemAII/EarnGrid/issues)

</div>
