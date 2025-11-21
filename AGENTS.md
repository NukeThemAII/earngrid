# AGENTS.md – EarnGrid Finance

This file is the **single source of truth** for AI coding agents (Codex, Cursor, etc.) working on the **EarnGrid** project.

EarnGrid is a **DeFi yield vault**: users deposit stablecoins (starting with USDC/USDT) into an **ERC-4626 vault with a 10% performance fee**.  
The vault routes funds into a **StrategyERC4626** that deposits into an **EulerEarn** vault (which itself allocates across underlying 4626 strategies such as Aave, Morpho, 40 Acres, etc.).

The goal: a clean, auditable, composable wrapper around EulerEarn with a clear protocol fee and a modern UI (Scaffold-ETH 2 / Next.js 15+, RainbowKit, Wagmi, Viem).

> **Golden rule for agents:**  
> - **Always follow this AGENTS.md.**  
> - **Always keep `README.md` and `LOG.md` up to date** with what you did and how to run it.  
> - If instructions conflict, prefer AGENTS.md over everything else.

---

## 1. High-level architecture

### 1.1 On-chain components

We are **not** re-implementing EulerEarn. We build a thin, opinionated layer on top of it.

**Core flow**

`User → EarnGridVault4626 (our ERC-4626) → StrategyERC4626 (ours) → EulerEarn Vault (external) → underlying strategies (external)`

1. **EarnGridVault4626**
   - ERC-4626 tokenized vault for a single asset (USDC or USDT per deployment).
   - Tracks deposits/withdrawals, share minting/burning.
   - Integrates a **10% performance fee** on yield (configurable, capped at 10% in v1).
   - Holds a reference to a single `IStrategy` implementation (initially `EulerEarnStrategy`).
   - Exposes:
     - standard ERC-4626 interface: `deposit`, `mint`, `withdraw`, `redeem`, `totalAssets`, `convertToAssets`, `convertToShares`, etc.
     - admin methods:
       - `setStrategy(address)` (with sanity checks + optional timelock).
       - `setPerformanceFee(uint256)` (max 10%).
       - `setFeeRecipient(address)`.
       - `pause()` / `unpause()` for emergency circuit-breaker.
- **Performance fee pattern:**
  - Mirror EulerEarn’s general idea: performance fee is taken as **extra shares minted to the fee recipient** when `totalAssets` has grown.
  - Use a **share-price high-water mark**: compare current price-per-share vs the previous high; never lower the HWM on losses, and only mint fee shares on new highs to avoid charging on recoveries.

2. **StrategyERC4626 (abstract strategy base)**
   - Abstract contract that standardizes how the vault interacts with any ERC-4626 strategy.
   - Interface:
     - `asset() external view returns (address)`
     - `totalAssets() public view returns (uint256)`
     - `invest(uint256 amount)` – move asset from vault into underlying 4626.
     - `divest(uint256 amount, address recipient)` – pull asset back to vault or a specified recipient.
     - `harvest()` – optional hook to realize rewards or housekeeping.
   - Implements **access control** so only the vault can call `invest`/`divest`/`harvest`.

3. **EulerEarnStrategy (concrete strategy)**
   - Implements `StrategyERC4626` for a specific **EulerEarn ERC-4626 vault**:
     - Immutable references:
       - `IERC4626 public eulerEarnVault;`
       - `IERC20 public asset;`
   - **Invest**: `asset.approve(eulerEarnVault, amount)` then `eulerEarnVault.deposit(amount, address(this))`.
   - **Divest**: call `eulerEarnVault.withdraw(amount, address(this), address(this))` then transfer asset back to the EarnGrid vault.
   - `totalAssets()` returns `eulerEarnVault.convertToAssets(eulerEarnVault.balanceOf(address(this)))`.
   - No rebalancing logic here; EulerEarn’s **curator/allocator roles** decide underlying protocol mix and caps (Aave, Morpho, 40 Acres, etc.) as per their docs.
   - Make sure to:
     - Use **reentrancy guards**, **safe ERC20**, and handle fee-on-transfer edge cases defensively.
     - Respect EulerEarn’s roles/timelock logic (we should not try to manage them from our contracts; only use vault as a black-box yield source).

4. **Vault Factory (optional, v1 or v2)**
   - Simple factory to spin up new `EarnGridVault4626` + `EulerEarnStrategy` pairs for different assets.
   - Stores metadata:
     - underlying asset,
     - EulerEarn vault address,
     - chain ID (if we ever support multiple chains),
     - human friendly name & symbol.

5. **Interfaces & libraries**
   - `IERC4626` interface (reuse standard interface, e.g. from OpenZeppelin or Solmate).
   - `IStrategy` / `IStrategyERC4626` interface for pluggable strategies.
   - Use well-audited libraries:
     - `openzeppelin-contracts` for ERC20 / access control / guards.
     - Optionally `solmate` for ERC-4626 if helpful, but keep the mix minimal.

### 1.2 Off-chain / UI components

We use **Scaffold-ETH 2** as the base stack:

- Next.js (upgrade to **15.x or latest stable**).
- React (latest stable).
- TypeScript everywhere.
- TailwindCSS for styling.
- Wagmi + Viem + RainbowKit for wallet connection & contract interactions.
- Scaffold-ETH custom hooks (`useScaffoldContractRead`, `useScaffoldContractWrite`, etc.) where convenient.

**UI design goals**

- Clean, focused single-page experience similar to Superfund but **simpler**:
  - Primary “USDC/USDT Vault” card with:
    - total TVL,
    - estimated APY (based on share price or pulled from an off-chain oracle / API in v2),
    - user balance, deposited amount, pending rewards (if any),
    - deposit/withdraw forms.
  - “Powered by EulerEarn” section:
    - link to underlying EulerEarn vault & docs,
    - show strategy list & allocations **if** easily queryable from EulerEarn.
  - History / stats:
    - a simple performance chart using on-chain share price history (or stubbed / mock data in v1 with a clean abstraction we can later replace with a real indexer).
- Wallet:
  - RainbowKit + Wagmi, with support for at least:
    - MetaMask,
    - Coinbase Wallet,
    - WalletConnect,
    - Rabby, OKX, etc. through RainbowKit built-ins.
  - Networks:
    - For v1, target the chain where the chosen EulerEarn vault actually lives (likely Ethereum mainnet). Do **not** hardcode Base if the vault isn’t there.
    - Keep chain IDs configurable in a `config/networks.ts`.

---

## 2. Tech stack & versions

**Smart contracts**

- Language: **Solidity 0.8.24+** (or latest stable 0.8.x at time of implementation).
- Framework: **Foundry** (preferred) for compilation, testing, deployment scripts.
- Libraries:
  - `forge-std` for test utilities.
  - `openzeppelin-contracts` (non-upgradeable versions for v1).
  - Optional: `solmate` for ERC-4626 semantics if helpful.
- No upgradeable proxies in v1 (keep architecture simple and auditable).  
  If we eventually add upgradeability, implement it as a separate v2 with clear migration paths.

**Frontend / App**

- Bootstrap with **Scaffold-ETH 2** via `npx create-eth@latest`.
- Then update the **Next.js** and **React** versions to **latest stable** (≥ 15.x for Next) by editing `packages/nextjs/package.json` and running the appropriate package manager commands.
- Use **Yarn** if Scaffold-ETH 2 defaults to Yarn; don’t fight the scaffolding unless migration is trivial.
- TypeScript strict mode ON (`"strict": true` in `tsconfig.json`).
- CSS: Tailwind + minimal custom components.

**Node / tooling**

- Node.js: **>= 20.18.0** as recommended by Scaffold-ETH 2.
- Git for version control.
- Foundry installed via `foundryup`.

---

## 3. Commands & workflows

### 3.1 Setup commands

From the repository root:

1. **Bootstrap (only once, when starting the project)**
   - Run Scaffold-ETH 2 starter:
     - `npx create-eth@latest`  
       (If the repo is already created, assume this step is done.)

2. **Install dependencies**
   - If the repo is using Yarn (default for Scaffold-ETH 2):
     - `yarn install`
   - If we explicitly switch to pnpm later, update this section and `README.md` accordingly.

3. **Install Foundry**
   - Follow Foundry installation instructions (Linux / macOS):
     - `curl -L https://foundry.paradigm.xyz | bash`
     - `foundryup`

4. **Environment variables**
   - Create `.env` files as needed:
     - At least:
       - `BASE_RPC_URL` or `MAINNET_RPC_URL` (depending on chain).
       - `DEPLOYER_PRIVATE_KEY`
       - `EULER_EARN_VAULT_USDC` and/or `EULER_EARN_VAULT_USDT`
       - `CHAIN_ID`
   - Maintain an example file:
     - `.env.example` including all required keys with dummy values.

### 3.2 Dev / test / build commands

Update `AGENTS.md` and `README.md` if any of these change.

- **Run local chain**  
  From Scaffold-ETH 2 root:
  - `yarn chain`  (Hardhat network)  

- **Deploy contracts to local chain**
  - Prefer a single entry command mirroring Scaffold-ETH 2:
    - `yarn deploy` (or a dedicated script like `yarn deploy:earngrid:local`).
  - Under the hood, use Foundry or Hardhat; pick one and keep it consistent.

- **Run frontend dev server**
  - `yarn start`
  - App should be available at `http://localhost:3000`.

- **Run contract tests**
  - `forge test`
  - Configure `foundry.toml` so tests live under `contracts/test` or `packages/foundry/test` depending on scaffold layout.

- **Run frontend tests / lint**
  - `yarn lint` (ESLint)
  - `yarn test` (if we add Jest/Playwright later)

---

## 4. Project structure

Assuming Scaffold-ETH 2 default layout:

```text
root/
  AGENTS.md
  README.md
  LOG.md
  package.json
  yarn.lock

  packages/
    nextjs/           # Frontend app (Next.js + RainbowKit + Wagmi + Viem)
      app/
      components/
      hooks/
      public/
      config/         # Our network & contract config
      ...

    foundry/ or hardhat/   # Smart contracts workspace
      contracts/
        src/
          EarnGridVault4626.sol
          StrategyERC4626.sol
          strategies/
            EulerEarnStrategy.sol
          interfaces/
            IERC4626.sol
            IStrategyERC4626.sol
        test/
          EarnGridVault.t.sol
          EulerEarnStrategy.t.sol
        script/
          DeployEarnGrid.s.sol   # or hardhat scripts

  .github/            # CI (optional)
