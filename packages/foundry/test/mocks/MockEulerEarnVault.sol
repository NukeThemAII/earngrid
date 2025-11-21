// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC4626, ERC20} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import {MockERC20} from "./MockERC20.sol";

contract MockEulerEarnVault is ERC4626 {
    constructor(MockERC20 asset_, string memory name_, string memory symbol_) ERC20(name_, symbol_) ERC4626(asset_) {}

    /// @notice Simulate yield by minting underlying to the vault.
    function simulateYield(uint256 assets) external {
        MockERC20(address(asset())).mint(address(this), assets);
    }

    /// @notice Simulate a loss by transferring out underlying.
    function simulateLoss(address to, uint256 assets) external {
        MockERC20(address(asset())).transfer(to, assets);
    }
}
