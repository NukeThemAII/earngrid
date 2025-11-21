//SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./DeployHelpers.s.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC4626} from "@openzeppelin/contracts/interfaces/IERC4626.sol";
import {EarnGridVault4626} from "../contracts/src/EarnGridVault4626.sol";
import {EulerEarnStrategy} from "../contracts/src/strategies/EulerEarnStrategy.sol";

/**
 * @notice Deploy EarnGrid vault + EulerEarn strategy.
 * @dev Environment variables:
 *  - ASSET: underlying ERC20 (USDC/USDT)
 *  - EULER_EARN_VAULT: target EulerEarn ERC-4626 vault
 *  - FEE_RECIPIENT: protocol fee receiver
 *  - PERFORMANCE_FEE_BPS (optional, default 1000 = 10%)
 *  - VAULT_NAME (optional, default "EarnGrid Vault")
 *  - VAULT_SYMBOL (optional, default "egTOKEN")
 */
contract DeployScript is ScaffoldETHDeploy {
    function run() external ScaffoldEthDeployerRunner {
        address asset = vm.envAddress("ASSET");
        address eulerEarnVault = vm.envAddress("EULER_EARN_VAULT");
        address feeRecipient = vm.envAddress("FEE_RECIPIENT");
        uint256 performanceFeeBps = vm.envOr("PERFORMANCE_FEE_BPS", uint256(1000));
        string memory name = vm.envOr("VAULT_NAME", string("EarnGrid Vault"));
        string memory symbol = vm.envOr("VAULT_SYMBOL", string("egTOKEN"));

        EarnGridVault4626 vault =
            new EarnGridVault4626(IERC20(asset), name, symbol, feeRecipient, performanceFeeBps);
        EulerEarnStrategy strategy =
            new EulerEarnStrategy(IERC20(asset), IERC4626(eulerEarnVault), address(vault));

        vault.setStrategy(strategy);

        deployments.push(Deployment({name: "EarnGridVault4626", addr: address(vault)}));
        deployments.push(Deployment({name: "EulerEarnStrategy", addr: address(strategy)}));

        console.log("Deployed EarnGridVault4626 at", address(vault));
        console.log("Deployed EulerEarnStrategy at", address(strategy));
        console.log("Asset", asset);
        console.log("EulerEarn vault", eulerEarnVault);
    }
}
