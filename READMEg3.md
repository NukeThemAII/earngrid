```text
███████╗ █████╗ ██████╗ ███╗   ██╗ ██████╗ ██████╗ ██╗██████╗ 
██╔════╝██╔══██╗██╔══██╗████╗  ██║██╔════╝ ██╔══██╗██║██╔══██╗
█████╗  ███████║██████╔╝██╔██╗ ██║██║  ███╗██████╔╝██║██║  ██║
██╔══╝  ██╔══██║██╔══██╗██║╚██╗██║██║   ██║██╔══██╗██║██║  ██║
███████╗██║  ██║██║  ██║██║ ╚████║╚██████╔╝██║  ██║██║██████╔╝
╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝ ╚═╝  ╚═╝╚═╝╚═════╝ 
```

# 🛡️ EarnGrid: The Smart USDC Savings Vault

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Network: Base](https://img.shields.io/badge/Network-Base-blue)](https://base.org)
[![Status: Beta](https://img.shields.io/badge/Status-Beta-orange)](https://github.com/NukeThemAII/EarnGrid)

> **Earn 7-10% APY on your USDC. Automated, Diversified, Secure.**

---

## 🐣 For Everyone: What is EarnGrid?

Imagine a **high-yield savings account** that is smarter than a bank.

When you deposit your USDC (digital dollars) into EarnGrid, our "Vault" automatically spreads your money across the safest, highest-paying lending opportunities on the Base network.

*   **💸 Earn Passive Income:** Your money works for you 24/7.
*   **🧘 Stress-Free:** We handle the complex moving parts. You just deposit and watch it grow.
*   **🔓 Liquid:** Withdraw your funds whenever you need them.
*   **🛡️ Safety First:** We use strict limits and safety guards to protect your principal.

**Ideally suited for:** Anyone wanting to earn interest on their stablecoins without managing 10 different accounts.

---

## 🛠️ For Developers: The Technical Deep Dive

EarnGrid is a **sophisticated ERC-4626 "Vault-of-Vaults"** architecture running on the Base L2 network. It aggregates user liquidity and allocates it to a whitelist of synchronous downstream strategies (currently MetaMorpho markets).

### 🏗️ Architecture

1.  **Core Vault (`BlendedVault.sol`)**:
    *   **Standard:** Fully compliant ERC-4626 implementation.
    *   **Routing:** Uses `depositQueue` and `withdrawQueue` to intelligently route liquidity.
    *   **Accounting:** Exact share math using OpenZeppelin v5 libraries.
    *   **Fee Model:** 3% Performance Fee taken *only* on profits above the High-Water Mark (HWM).

2.  **Strategy Management**:
    *   **Whitelist:** Only vetted strategies (e.g., Steakhouse, Gauntlet vaults) are allowed.
    *   **Caps:** Hard asset caps per strategy.
    *   **Tiers:** Exposure limits based on risk tiers (e.g., Tier 1 max 50% of TVL).
    *   **Synchronicity:** Strictly synchronous strategies (atomic deposit/withdraw) to ensure instant user liquidity.

3.  **Safety Mechanisms**:
    *   **Timelock:** Risk-increasing changes (adding strategies, raising caps) require a 24h+ delay.
    *   **Harvest Guard:** `maxDailyIncreaseBps` prevents donation/manipulation attacks by capping share price spikes.
    *   **Guardian Role:** Can emergency pause deposits/withdrawals and force-remove bad strategies.
    *   **Slippage Protection:** Client-side checks ensure you don't get wrecked by front-running.

### 🧩 The Stack

| Component | Tech | Description |
| :--- | :--- | :--- |
| **Contracts** | ![Foundry](https://img.shields.io/badge/-Foundry-333) | Solidity v0.8.23, Forge tests, Fuzzing |
| **Frontend** | ![Next.js](https://img.shields.io/badge/-Next.js-black) | App Router, Wagmi, Viem, Tailwind, Shadcn UI |
| **Indexer** | ![Node.js](https://img.shields.io/badge/-Node.js-green) | TypeScript, Kysely, SQLite/Postgres, Express |
| **Network** | ![Base](https://img.shields.io/badge/-Base_L2-blue) | Low fees, high security, Ethereum alignment |

---

## 🚀 Getting Started

### Prerequisites

*   **Node.js** (v18+)
*   **pnpm**
*   **Foundry** (Forge)

### 1. Installation

```bash
# Clone the repo
git clone https://github.com/NukeThemAII/EarnGrid.git
cd EarnGrid

# Install dependencies
pnpm install

# Initialize submodules (for contracts)
git submodule update --init --recursive
```

### 2. Run Locally

**Smart Contracts (Test):**
```bash
pnpm -C packages/contracts test
```

**Indexer (Backend):**
```bash
# Needs a .env file (see infra/docker-compose.yml for DB or run locally)
pnpm -C services/indexer dev
```

**Web Interface (Frontend):**
```bash
pnpm -C apps/web dev
```
Visit `http://localhost:3000` to see the dashboard.

---

## 🔐 Security & Roles

We take security seriously. The system is governed by a strict separation of powers:

| Role | Responsibility | Key Powers |
| :--- | :--- | :--- |
| **👑 Owner** | Governance | Manage roles, set fee recipient, upgrade system. (Multisig) |
| **🧐 Curator** | Risk Manager | Propose new strategies, set caps, adjust tier limits. |
| **🤖 Allocator** | Operator | Execute rebalances, update queue priorities, call harvest. |
| **🛡️ Guardian** | Circuit Breaker | **Emergency Pause**, remove strategies instantly. |

**Audits:**
*   Internal Audit v1 (Dec 2024) - *Passed*
*   Industry Standards Audit (Dec 2024) - *Passed (Testnet Ready)*
*   *External Professional Audit - Pending*

---

## 📂 Project Structure

```text
/
├── apps/
│   └── web/            # Next.js Frontend DApp
├── packages/
│   ├── contracts/      # Solidity Smart Contracts (Foundry)
│   └── sdk/            # TypeScript SDK for interactions
├── services/
│   └── indexer/        # Event indexer & API service
├── docs/               # Architecture, Threat Models, Runbooks
└── infra/              # Docker & Deployment configs
```

---

## ⚠️ Disclaimer

**EarnGrid is currently in BETA.**

This software is experimental. While we have implemented rigorous testing and safety guards, smart contract risks exist. Do not deposit funds you cannot afford to lose. This is not financial advice.

---

*Built with 💙 on Base by the EarnGrid Team.*
