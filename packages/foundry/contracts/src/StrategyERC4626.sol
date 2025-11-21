// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC4626} from "@openzeppelin/contracts/interfaces/IERC4626.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {IStrategyERC4626} from "./interfaces/IStrategyERC4626.sol";

/**
 * @title StrategyERC4626
 * @notice Abstract base for strategies that wrap an ERC-4626 vault.
 * @dev Access controlled so only the EarnGrid vault can call invest/divest/harvest.
 */
abstract contract StrategyERC4626 is IStrategyERC4626, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable override asset;
    IERC4626 public immutable override target;
    address public immutable override vault;

    error NotVault();
    error ZeroAddress();

    modifier onlyVault() {
        if (msg.sender != vault) revert NotVault();
        _;
    }

    constructor(IERC20 asset_, IERC4626 target_, address vault_) Ownable(msg.sender) {
        if (address(asset_) == address(0) || address(target_) == address(0) || vault_ == address(0)) revert ZeroAddress();
        if (target_.asset() != address(asset_)) revert StrategyAssetMismatch();
        asset = asset_;
        target = target_;
        vault = vault_;
    }

    /**
     * @dev Subclasses must surface a clear asset mismatch error.
     */
    error StrategyAssetMismatch();

    /**
     * @notice Total assets managed by this strategy (in underlying units).
     */
    function totalAssets() public view virtual override returns (uint256) {
        return target.convertToAssets(target.balanceOf(address(this)));
    }

    /**
     * @notice Move assets from the vault into the target ERC-4626.
     * @dev Expects the vault to have already transferred `amount` underlying to this strategy.
     */
    function invest(uint256 amount) external virtual override onlyVault nonReentrant {
        if (amount == 0) return;
        // Reset then set allowance to support non-standard ERC20s.
        asset.forceApprove(address(target), 0);
        asset.forceApprove(address(target), amount);
        target.deposit(amount, address(this));
    }

    /**
     * @notice Pull assets back to a recipient.
     * @return withdrawn Amount of underlying returned to the recipient.
     */
    function divest(uint256 amount, address recipient)
        external
        virtual
        override
        onlyVault
        nonReentrant
        returns (uint256 withdrawn)
    {
        if (recipient == address(0)) revert ZeroAddress();
        uint256 beforeBalance = asset.balanceOf(recipient);
        target.withdraw(amount, recipient, address(this));
        withdrawn = asset.balanceOf(recipient) - beforeBalance;
    }

    /**
     * @notice Optional hook for harvesting rewards; default no-op.
     */
    function harvest() external virtual override onlyVault nonReentrant {}
}
