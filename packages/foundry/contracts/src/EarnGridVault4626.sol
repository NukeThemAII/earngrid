// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC4626} from "@openzeppelin/contracts/interfaces/IERC4626.sol";
import {
    ReentrancyGuard
} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {
    SafeERC20
} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {
    ERC4626,
    ERC20
} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";

import {IStrategyERC4626} from "./interfaces/IStrategyERC4626.sol";

/**
 * @title EarnGridVault4626
 * @notice ERC-4626 vault with a capped performance fee and pluggable ERC-4626 strategy.
 * @dev Performance fee is minted as additional shares to the fee recipient on positive yield only.
 */
contract EarnGridVault4626 is ERC4626, Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    IERC20 private immutable underlying;
    uint256 public constant BPS = 10_000;
    uint256 public constant MAX_PERFORMANCE_FEE_BPS = 1_000; // 10%

    IStrategyERC4626 public strategy;
    address public feeRecipient;
    uint256 public performanceFeeBps;
    uint256 public highWaterMark; // Scaled by 10**decimals

    event StrategyUpdated(address indexed newStrategy);
    event FeeRecipientUpdated(address indexed newRecipient);
    event PerformanceFeeUpdated(uint256 newPerformanceFeeBps);
    event PerformanceFeeMinted(uint256 feeAssets, uint256 feeShares);
    event Harvested(uint256 totalAssetsAfterHarvest);

    error InvalidPerformanceFee();
    error ZeroAddress();
    error StrategyAssetMismatch();
    error InvalidStrategy();
    error InsufficientLiquidity();
    error ZeroShares();

    constructor(
        IERC20 asset_,
        string memory name_,
        string memory symbol_,
        address feeRecipient_,
        uint256 performanceFeeBps_
    ) ERC20(name_, symbol_) ERC4626(asset_) Ownable(msg.sender) {
        if (feeRecipient_ == address(0)) revert ZeroAddress();
        if (performanceFeeBps_ > MAX_PERFORMANCE_FEE_BPS)
            revert InvalidPerformanceFee();
        underlying = asset_;
        feeRecipient = feeRecipient_;
        performanceFeeBps = performanceFeeBps_;
        highWaterMark = 10 ** decimals(); // Initial HWM is 1.0
    }

    /**
     * @notice Aggregate assets in vault + strategy.
     */
    function totalAssets() public view override returns (uint256) {
        uint256 managed = super.totalAssets();
        if (address(strategy) != address(0)) {
            managed += strategy.totalAssets();
        }
        return managed;
    }

    // -------------------------
    // External user operations
    // -------------------------

    function deposit(
        uint256 assets,
        address receiver
    ) public override nonReentrant whenNotPaused returns (uint256) {
        _collectPerformanceFee();
        if (previewDeposit(assets) == 0) revert ZeroShares();
        uint256 shares = super.deposit(assets, receiver);
        _deployToStrategy(assets);
        return shares;
    }

    function mint(
        uint256 shares,
        address receiver
    ) public override nonReentrant whenNotPaused returns (uint256) {
        _collectPerformanceFee();
        if (shares == 0) revert ZeroShares();
        uint256 assets = previewMint(shares);
        uint256 mintedShares = super.mint(shares, receiver);
        _deployToStrategy(assets);
        return mintedShares;
    }

    function withdraw(
        uint256 assets,
        address receiver,
        address owner
    ) public override nonReentrant whenNotPaused returns (uint256) {
        _collectPerformanceFee();
        _pullFromStrategyIfNeeded(assets);
        uint256 burnedShares = super.withdraw(assets, receiver, owner);
        return burnedShares;
    }

    function redeem(
        uint256 shares,
        address receiver,
        address owner
    ) public override nonReentrant whenNotPaused returns (uint256) {
        _collectPerformanceFee();
        uint256 assets = previewRedeem(shares);
        _pullFromStrategyIfNeeded(assets);
        uint256 redeemedAssets = super.redeem(shares, receiver, owner);
        return redeemedAssets;
    }

    // -------------------------
    // Admin functions
    // -------------------------

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function setStrategy(IStrategyERC4626 newStrategy) external onlyOwner {
        if (address(newStrategy) == address(0)) revert ZeroAddress();
        if (address(newStrategy.asset()) != address(underlying))
            revert StrategyAssetMismatch();
        if (newStrategy.vault() != address(this)) revert InvalidStrategy();
        _collectPerformanceFee();
        strategy = newStrategy;
        emit StrategyUpdated(address(newStrategy));
    }

    function setPerformanceFee(
        uint256 newPerformanceFeeBps
    ) external onlyOwner {
        if (newPerformanceFeeBps > MAX_PERFORMANCE_FEE_BPS)
            revert InvalidPerformanceFee();
        _collectPerformanceFee();
        performanceFeeBps = newPerformanceFeeBps;
        emit PerformanceFeeUpdated(newPerformanceFeeBps);
    }

    function setFeeRecipient(address newRecipient) external onlyOwner {
        if (newRecipient == address(0)) revert ZeroAddress();
        feeRecipient = newRecipient;
        emit FeeRecipientUpdated(newRecipient);
    }

    function collectPerformanceFee() external nonReentrant {
        _collectPerformanceFee();
    }

    function harvest() external onlyOwner nonReentrant {
        _collectPerformanceFee();
        if (address(strategy) != address(0)) {
            strategy.harvest();
        }
        emit Harvested(totalAssets());
    }

    function investIdle(uint256 amount) external onlyOwner nonReentrant {
        _deployToStrategy(amount);
    }

    function investAllIdle() external onlyOwner nonReentrant {
        _deployToStrategy(underlying.balanceOf(address(this)));
    }

    function divestFromStrategy(
        uint256 amount
    ) external onlyOwner nonReentrant {
        if (address(strategy) == address(0)) revert InvalidStrategy();
        strategy.divest(amount, address(this));
    }

    // -------------------------
    // Internal helpers
    // -------------------------

    function _deployToStrategy(uint256 amount) internal {
        if (address(strategy) == address(0) || amount == 0) return;
        underlying.safeTransfer(address(strategy), amount);
        strategy.invest(amount);
    }

    function _pullFromStrategyIfNeeded(uint256 requiredAssets) internal {
        if (address(strategy) == address(0)) {
            if (requiredAssets > underlying.balanceOf(address(this)))
                revert InsufficientLiquidity();
            return;
        }

        uint256 balance = underlying.balanceOf(address(this));
        if (balance >= requiredAssets) {
            return;
        }

        uint256 shortfall = requiredAssets - balance;
        uint256 beforeBalance = underlying.balanceOf(address(this));
        uint256 withdrawn = strategy.divest(shortfall, address(this));
        uint256 newBalance = beforeBalance + withdrawn;

        if (newBalance < requiredAssets) revert InsufficientLiquidity();
    }

    function _collectPerformanceFee() internal {
        uint256 assets = totalAssets();
        uint256 supply = totalSupply();

        if (supply == 0) {
            // No shares, reset HWM to 1.0 (or keep as is, but 1.0 is standard start)
            highWaterMark = 10 ** decimals();
            return;
        }

        // Calculate current share price (scaled by 10**decimals)
        // Price = Assets / Supply
        // We use 10**decimals as the base unit for price (like 1.000000 USDC)
        uint256 currentPrice = (assets * (10 ** decimals())) / supply;

        if (currentPrice <= highWaterMark) {
            return;
        }

        // Calculate yield per share
        uint256 yieldPerShare = currentPrice - highWaterMark;

        // Total yield generated since last HWM
        // Total Yield = YieldPerShare * Supply / 10**decimals
        // But we want to calculate fee shares directly.

        // Fee Assets = Total Yield * FeeBPS / BPS
        // Fee Assets = (YieldPerShare * Supply * FeeBPS) / (BPS * 10**decimals)

        // However, minting fee shares dilutes the price.
        // We want the post-mint price to be equal to the pre-mint price minus the fee?
        // Or simply mint shares equivalent to the fee assets at the CURRENT price.

        // Standard formula:
        // FeeAssets = (currentAssets - (highWaterMark * supply / 10**decimals)) * feeBps / BPS
        // This is equivalent to: (YieldPerShare * Supply / 10**decimals) * feeBps / BPS

        uint256 totalYield = (yieldPerShare * supply) / (10 ** decimals());
        uint256 feeAssets = (totalYield * performanceFeeBps) / BPS;

        if (feeAssets == 0) {
            highWaterMark = currentPrice;
            return;
        }

        // Calculate shares to mint
        // We want to mint shares such that they are worth `feeAssets` at the *current* price (pre-dilution).
        // Actually, standard practice is usually:
        // feeShares = (feeAssets * supply) / (assets - feeAssets)
        // This ensures the non-fee holders are diluted by exactly the fee amount.

        uint256 feeShares = (feeAssets * supply) / (assets - feeAssets);

        if (feeShares > 0) {
            _mint(feeRecipient, feeShares);
            emit PerformanceFeeMinted(feeAssets, feeShares);
        }

        // Update HWM to the current price.
        // Note: After minting, the new price will be slightly lower than `currentPrice` because we extracted value.
        // But effectively we have "realized" that gain. The new HWM should be the price *before* the fee cut?
        // No, usually HWM is set to the price *after* the fee cut, or the price *before*?
        // If we set it to `currentPrice` (pre-fee), then the price drops immediately after minting.
        // So the next deposit comes in at a lower price.
        // If the price goes back up to `currentPrice`, we shouldn't charge fee again?
        // Correct. The "value" was extracted.
        // So HWM should be set to `currentPrice`.

        highWaterMark = currentPrice;
    }
}
