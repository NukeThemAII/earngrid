// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC4626} from "@openzeppelin/contracts/interfaces/IERC4626.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ERC4626, ERC20} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";

import {IStrategyERC4626} from "./interfaces/IStrategyERC4626.sol";

/**
 * @title EarnGridVault4626
 * @notice ERC-4626 vault with a capped performance fee and pluggable ERC-4626 strategy.
 * @dev Performance fee is minted as additional shares to the fee recipient on positive yield only.
 */
contract EarnGridVault4626 is ERC4626, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 private immutable underlying;
    uint256 public constant BPS = 10_000;
    uint256 public constant MAX_PERFORMANCE_FEE_BPS = 1_000; // 10%

    IStrategyERC4626 public strategy;
    address public feeRecipient;
    uint256 public performanceFeeBps;
    uint256 public feeCheckpoint;

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
        if (performanceFeeBps_ > MAX_PERFORMANCE_FEE_BPS) revert InvalidPerformanceFee();
        underlying = asset_;
        feeRecipient = feeRecipient_;
        performanceFeeBps = performanceFeeBps_;
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

    function deposit(uint256 assets, address receiver) public override nonReentrant returns (uint256) {
        _collectPerformanceFee();
        if (previewDeposit(assets) == 0) revert ZeroShares();
        uint256 shares = super.deposit(assets, receiver);
        _deployToStrategy(assets);
        _refreshCheckpoint();
        return shares;
    }

    function mint(uint256 shares, address receiver) public override nonReentrant returns (uint256) {
        _collectPerformanceFee();
        if (shares == 0) revert ZeroShares();
        uint256 assets = previewMint(shares);
        uint256 mintedShares = super.mint(shares, receiver);
        _deployToStrategy(assets);
        _refreshCheckpoint();
        return mintedShares;
    }

    function withdraw(uint256 assets, address receiver, address owner)
        public
        override
        nonReentrant
        returns (uint256)
    {
        _collectPerformanceFee();
        _pullFromStrategyIfNeeded(assets);
        uint256 burnedShares = super.withdraw(assets, receiver, owner);
        _refreshCheckpoint();
        return burnedShares;
    }

    function redeem(uint256 shares, address receiver, address owner)
        public
        override
        nonReentrant
        returns (uint256)
    {
        _collectPerformanceFee();
        uint256 assets = previewRedeem(shares);
        _pullFromStrategyIfNeeded(assets);
        uint256 redeemedAssets = super.redeem(shares, receiver, owner);
        _refreshCheckpoint();
        return redeemedAssets;
    }

    // -------------------------
    // Admin functions
    // -------------------------

    function setStrategy(IStrategyERC4626 newStrategy) external onlyOwner {
        if (address(newStrategy) == address(0)) revert ZeroAddress();
        if (address(newStrategy.asset()) != address(underlying)) revert StrategyAssetMismatch();
        if (newStrategy.vault() != address(this)) revert InvalidStrategy();
        _collectPerformanceFee();
        strategy = newStrategy;
        emit StrategyUpdated(address(newStrategy));
    }

    function setPerformanceFee(uint256 newPerformanceFeeBps) external onlyOwner {
        if (newPerformanceFeeBps > MAX_PERFORMANCE_FEE_BPS) revert InvalidPerformanceFee();
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

    function divestFromStrategy(uint256 amount) external onlyOwner nonReentrant {
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
            if (requiredAssets > underlying.balanceOf(address(this))) revert InsufficientLiquidity();
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
        uint256 assets = super.totalAssets() + (address(strategy) == address(0) ? 0 : strategy.totalAssets());
        uint256 supply = totalSupply();

        // Initialize checkpoint or handle empty supply.
        if (supply == 0) {
            feeCheckpoint = assets;
            return;
        }

        if (feeCheckpoint == 0) {
            feeCheckpoint = assets;
            return;
        }

        uint256 checkpoint = feeCheckpoint;
        if (assets <= checkpoint) {
            feeCheckpoint = assets;
            return;
        }

        uint256 yieldAssets = assets - checkpoint;
        uint256 feeAssets = (yieldAssets * performanceFeeBps) / BPS;
        if (feeAssets == 0) {
            feeCheckpoint = assets;
            return;
        }

        uint256 feeShares = (feeAssets * supply) / (assets - feeAssets);
        if (feeShares > 0) {
            _mint(feeRecipient, feeShares);
            emit PerformanceFeeMinted(feeAssets, feeShares);
        }

        feeCheckpoint = assets;
    }

    function _refreshCheckpoint() internal {
        feeCheckpoint = totalAssets();
    }
}
