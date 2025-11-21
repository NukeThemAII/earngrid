5. Smart contract design details
5.1 EarnGridVault4626

Responsibilities

Represent the user-facing vault token (ERC-4626).

Handle accounting, deposits, withdrawals, and share conversions.

Apply a 10% performance fee on yield (default; configurable ≤ 10%).

Delegate capital deployment and retrieval to a single strategy.

Key properties / state

IERC20 public immutable asset;

IStrategyERC4626 public strategy;

uint256 public performanceFeeBps; (e.g. 1000 for 10%, max 1000)

address public feeRecipient;

Bookkeeping for fee computation; some options:

track uint256 public lastTotalAssets; and compute yield as totalAssets - lastTotalAssets,

or adopt a more formal “fee shares” pattern (mint shares equal to yield * fee / (totalAssets - yield)).

Core invariants

totalAssets() should equal:

asset.balanceOf(address(this)) + strategy.totalAssets() (minus any fee shares minted).

convertToAssets / convertToShares must be consistent and monotonic.

Performance fees must never decrease user principal (only charge on positive yield).

Admin / roles

Use simple Ownable for v1.

Critical functions (setStrategy, setPerformanceFee, setFeeRecipient) should:

emit events,

check bounds (e.g. performance fee <= 10%),

optionally be gated via a simple timelock if it’s not too heavy.

Security

Use nonReentrant on entrypoints (deposit, withdraw, etc.).

Always use SafeERC20 for transfers.

Defend against “first depositor” / zero-share issues similar to EulerEarn’s zero-share protection:

Don’t allow a deposit that would mint 0 shares (revert instead).

5.2 StrategyERC4626 (abstract)

Generic wrapper around any ERC-4626 yield source.

Exposes:

function asset() external view returns (address);
function totalAssets() public view returns (uint256);
function invest(uint256 amount) external;
function divest(uint256 amount, address recipient) external returns (uint256 withdrawn);
function harvest() external;


Only the vault (EarnGridVault4626) should be able to call invest, divest, harvest.

Stores:

IERC4626 public immutable target;

IERC20 public immutable asset;

Revert if target.asset() != address(asset) on construction.

5.3 EulerEarnStrategy

target is the EulerEarn vault (which is itself ERC-4626).

asset is the underlying stablecoin (USDC or USDT).

Invest path

Receive amount of asset from the EarnGrid vault.

Approve target and call target.deposit(amount, address(this)).

Emit an event with new share balance.

Divest path

Compute required underlying and shares to withdraw.

Call target.withdraw(amount, address(this), address(this)).

Transfer underlying asset to recipient.

Emit event.

Considerations

EulerEarn has roles (owner, curator, allocator, guardian) & timelocks.
We do not manage these roles from EarnGrid; we assume Euler’s governance config is handled by Euler.

Handle situations where:

EulerEarn’s withdraw reverts due to a temporary liquidity shortage:

Surface clean revert reasons and keep state consistent.

Strategy is paused or disabled:

Provide admin function in EarnGrid to switch strategy (e.g. to an idle escrow vault or to remain idle).

6. Frontend design & implementation
6.1 Pages & routes

Using the Next.js App Router:

/ – Dashboard

High-level overview:

“EarnGrid USDC Vault” (and future vault cards).

TVL, estimated APY, protocol fee (10%), vault asset, underlying yield source (EulerEarn).

Connect wallet button (RainbowKit).

Stats cards.

/vaults/[symbol] – Vault detail page

For v1 we’ll have at least one route: vaults/usdc or vaults/usdt.

Show:

user’s deposit amount,

wallet balance of asset,

deposit & withdraw forms (with max buttons),

current nav/share price,

underlying EulerEarn vault address & link (Etherscan/app).

breakdown of underlying strategies if available: Aave, Morpho, 40 Acres, etc.

6.2 Components

VaultCard – summary card for each EarnGrid vault.

DepositWithdrawForm – handles input of amount, calculates shares, calls wagmi write hooks.

StatPill / MetricTile – small dashboard metrics.

PerformanceChart – chart for share price (mocked or simple sample data at first).

Use TailwindCSS for layout with a light, friendly DeFi theme inspired by Superfund but more minimal.

6.3 Web3 integration

Use Scaffold-ETH 2 hooks:

useScaffoldContractRead for vault stats.

useScaffoldContractWrite for deposit / withdraw.

Add EarnGrid contracts to packages/nextjs/contractsConfig (or equivalent) so hooks and ABIs stay in sync.

Make network & contract addresses configurable via:

packages/nextjs/config/contracts.ts

.env for RPC URLs and default chain.

7. Testing
7.1 Contract tests (Foundry)

Write comprehensive tests focused on:

Basic ERC-4626 behavior

Deposits/withdraws with different users.

convertToAssets/convertToShares rounding behavior.

Handling of small amounts and minimal share mints (no 0-share mints).

Performance fee

Scenario: vault earns yield via EulerEarnStrategy mock; ensure fee recipient receives ~10% of yield (within rounding).

No performance fee in loss scenarios (never charge users on negative yield).

Changing fee (within 0–10%) works as expected.

Strategy integration

Use a mock ERC-4626 vault to simulate EulerEarn:

Increase totalAssets over time to simulate yield.

Simulate partial withdrawals, liquidity constraints, etc.

Ensure totalAssets() at vault level matches underlying + idle.

Security properties

Reentrancy checks.

Access control on admin functions.

Fuzz tests for deposits/withdrawals (within reasonable upper bounds).

Run with:

forge test
forge test --gas-report  # optional

7.2 Frontend tests (optional v1, but nice to have)

Unit test for:

formatting utilities (APY formatting, token formatting, etc.).

simple rendering tests for VaultCard.

In future, integration tests with Playwright / Cypress, but not mandatory for v1.

8. Documentation & logging
8.1 README.md

Keep README.md human-oriented:

What EarnGrid does (TL;DR: DeFi yield vault wrapping EulerEarn with 10% performance fee).

How to run:

setup,

dev,

test,

deploy.

Basic explanation of:

EarnGridVault4626,

StrategyERC4626,

EulerEarnStrategy,

risk assumptions (EulerEarn risk, smart contract risk, etc.).

8.2 LOG.md

Maintain a chronological changelog for the AI agent:

Every time you (as an agent) make a non-trivial change:

Append an entry with:

date/time (UTC),

short description,

files touched,

commands added/changed.

Keep entries concise but specific (e.g. “2025-11-21 – Implemented EarnGridVault4626 skeleton and wired to mock StrategyERC4626. Added forge tests for basic deposit/withdraw.”).

9. Git workflow & boundaries

Use standard Git practices:

Small, focused commits.

Clear commit messages.

Don’t auto-reformat the entire repo; limit formatting to files you touch.

Never:

Remove AGENTS.md, README.md, or LOG.md.

Hardcode private keys or secrets.

Copy-paste large chunks of licensed code without respecting their licenses. Use EulerEarn / Superlend repos as reference designs, but write fresh code.

When integrating patterns inspired by:

EulerEarn (euler-earn repo)

Superlend superfund strategies & UI (superfund-strategies-public, superfund_ui)

document clearly in comments and in README.md which ideas/patterns we are borrowing.

10. Roadmap (for future agents)

Start with:

Scaffold repo with Scaffold-ETH 2.

Implement EarnGridVault4626 + StrategyERC4626 + EulerEarnStrategy against a mock ERC-4626.

Wire up the basic UI for a single USDT or USDC vault on the correct chain.

Replace the mock strategy with a real EulerEarn vault address (config via .env).

Add a basic stats panel & performance chart.

Polish UX, gas messages, and error handling.

Future iterations (not v1):

Support additional assets (ETH, more stables).

Support multiple strategies (not just EulerEarn) via additional StrategyERC4626 implementations (e.g. Morpho vaults, Gauntlet 4626 wrappers).

Index historical data with an off-chain indexer (Ponder, The Graph, etc.) and show real performance graphs.

Optional: governance module for adjusting fee within bounds and selecting strategies.

11. Summary for agents

Project name: EarnGrid (suggested repo name: earngrid-vaults).

Core idea: simple, composable ERC-4626 vault with 10% performance fee, routing into EulerEarn as an underlying ERC-4626 strategy.

On-chain: Solidity 0.8.x, Foundry, OpenZeppelin, ERC-4626 pattern, EarnGridVault4626 + StrategyERC4626 + EulerEarnStrategy.

Off-chain: Scaffold-ETH 2, Next.js 15+, RainbowKit, Wagmi, Viem, Tailwind.

Always:

Follow this AGENTS.md,

keep README.md and LOG.md current,

use secure patterns and minimal external assumptions.

If you are unsure about something, prefer small, well-documented changes over big refactors. Update this AGENTS.md when you adjust workflows or architecture.
