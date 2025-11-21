// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC4626} from "@openzeppelin/contracts/interfaces/IERC4626.sol";

/**
 * @title IStrategyERC4626
 * @notice Minimal interface for EarnGrid strategies that wrap an ERC-4626 yield source.
 */
interface IStrategyERC4626 {
    function asset() external view returns (IERC20);

    function target() external view returns (IERC4626);

    function vault() external view returns (address);

    function totalAssets() external view returns (uint256);

    function invest(uint256 amount) external;

    function divest(uint256 amount, address recipient) external returns (uint256 withdrawn);

    function harvest() external;
}
