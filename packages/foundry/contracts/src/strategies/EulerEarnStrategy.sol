// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC4626} from "@openzeppelin/contracts/interfaces/IERC4626.sol";

import {StrategyERC4626} from "../StrategyERC4626.sol";

/**
 * @title EulerEarnStrategy
 * @notice Concrete strategy that deposits into an EulerEarn ERC-4626 vault.
 */
contract EulerEarnStrategy is StrategyERC4626 {
    constructor(IERC20 asset_, IERC4626 eulerEarnVault_, address vault_)
        StrategyERC4626(asset_, eulerEarnVault_, vault_)
    {}
}
