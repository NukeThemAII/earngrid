// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";

import {EarnGridVault4626} from "../contracts/src/EarnGridVault4626.sol";
import {
    EulerEarnStrategy
} from "../contracts/src/strategies/EulerEarnStrategy.sol";
import {MockERC20} from "./mocks/MockERC20.sol";
import {MockEulerEarnVault} from "./mocks/MockEulerEarnVault.sol";

contract EarnGridVaultTest is Test {
    EarnGridVault4626 internal vault;
    EulerEarnStrategy internal strategy;
    MockERC20 internal usdc;
    MockEulerEarnVault internal eulerVault;

    address internal alice = address(0xA11ce);
    address internal bob = address(0xB0B);
    address internal feeRecipient = address(0xFEE);

    uint256 internal constant INITIAL_FEE_BPS = 1_000; // 10%

    function setUp() public {
        usdc = new MockERC20("USD Coin", "USDC", 6);
        eulerVault = new MockEulerEarnVault(usdc, "EulerEarn USDC", "eeUSDC");
        vault = new EarnGridVault4626(
            usdc,
            "EarnGrid USDC",
            "egUSDC",
            feeRecipient,
            INITIAL_FEE_BPS
        );
        strategy = new EulerEarnStrategy(usdc, eulerVault, address(vault));
        vault.setStrategy(strategy);

        // Seed users
        usdc.mint(alice, 1_000_000e6);
        usdc.mint(bob, 1_000_000e6);
    }

    function _approve(address user, uint256 amount) internal {
        vm.prank(user);
        usdc.approve(address(vault), amount);
    }

    function testDepositInvestsIntoStrategy() public {
        uint256 amount = 100e6;
        _approve(alice, amount);
        vm.prank(alice);
        uint256 shares = vault.deposit(amount, alice);

        assertEq(shares, amount, "Shares should match deposited assets");
        assertEq(
            usdc.balanceOf(address(vault)),
            0,
            "Vault should push funds to strategy"
        );
        assertEq(
            usdc.balanceOf(address(strategy)),
            0,
            "Strategy should forward assets to Euler vault"
        );
        assertEq(
            eulerVault.totalAssets(),
            amount,
            "Underlying vault should hold funds"
        );
        assertEq(
            vault.totalAssets(),
            amount,
            "Vault accounting should include strategy assets"
        );
    }

    function testWithdrawPullsFromStrategy() public {
        uint256 amount = 200e6;
        _approve(alice, amount);
        uint256 aliceStart = usdc.balanceOf(alice);
        vm.prank(alice);
        vault.deposit(amount, alice);

        uint256 withdrawAmount = 80e6;
        uint256 before = usdc.balanceOf(alice);
        vm.prank(alice);
        uint256 burned = vault.withdraw(withdrawAmount, alice, alice);

        assertEq(
            burned,
            withdrawAmount,
            "Shares burned should equal assets withdrawn"
        );
        assertEq(
            usdc.balanceOf(alice) - before,
            withdrawAmount,
            "User should receive assets delta"
        );
        assertEq(
            usdc.balanceOf(alice),
            aliceStart - amount + withdrawAmount,
            "Final balance consistent"
        );
        assertEq(
            vault.totalAssets(),
            amount - withdrawAmount,
            "Assets should reduce in accounting"
        );
    }

    function testPerformanceFeeMintsOnPositiveYield() public {
        uint256 depositAmount = 100e6;
        _approve(alice, depositAmount);
        vm.prank(alice);
        vault.deposit(depositAmount, alice);

        // Simulate yield inside EulerEarn vault.
        eulerVault.simulateYield(10e6);

        uint256 supplyBefore = vault.totalSupply();
        uint256 assetsBefore = vault.totalAssets();

        vm.prank(bob); // any caller can trigger fee mint
        vault.collectPerformanceFee();

        uint256 assetsAfter = vault.totalAssets();
        uint256 feeShares = vault.balanceOf(feeRecipient);

        uint256 expectedFeeAssets = (10e6 * INITIAL_FEE_BPS) / 10_000;
        // feeShares formula mirrors vault implementation: feeAssets * supply / (assets - feeAssets)
        uint256 expectedFeeShares = (expectedFeeAssets * supplyBefore) /
            (assetsBefore - expectedFeeAssets);

        assertApproxEqAbs(
            assetsBefore,
            depositAmount + 10e6,
            1,
            "Assets should include simulated yield"
        );
        assertEq(
            assetsAfter,
            assetsBefore,
            "Minting fee shares should not change assets"
        );
        assertApproxEqAbs(
            feeShares,
            expectedFeeShares,
            20,
            "Fee recipient should receive minted fee shares"
        );
        assertApproxEqAbs(
            vault.highWaterMark(),
            1100000,
            1,
            "HWM should advance to new price"
        );
    }

    function testNoFeeOnLosses() public {
        uint256 depositAmount = 200e6;
        _approve(alice, depositAmount);
        vm.prank(alice);
        vault.deposit(depositAmount, alice);

        // First collect to set baseline
        vault.collectPerformanceFee();

        // Simulate loss
        eulerVault.simulateLoss(address(0xdead), 50e6);

        uint256 feeRecipientBalanceBefore = vault.balanceOf(feeRecipient);
        vault.collectPerformanceFee();
        uint256 feeRecipientBalanceAfter = vault.balanceOf(feeRecipient);

        assertEq(
            feeRecipientBalanceBefore,
            feeRecipientBalanceAfter,
            "No new fee shares on loss"
        );
        assertEq(
            vault.highWaterMark(),
            1000000,
            "HWM should stay at initial 1.0"
        );
    }

    function testAccessControls() public {
        // Wrong asset strategy
        MockERC20 other = new MockERC20("Other", "OTH", 6);
        MockEulerEarnVault otherVault = new MockEulerEarnVault(
            other,
            "Other",
            "OTH"
        );
        EulerEarnStrategy badStrategy = new EulerEarnStrategy(
            other,
            otherVault,
            address(vault)
        );

        vm.expectRevert(EarnGridVault4626.StrategyAssetMismatch.selector);
        vault.setStrategy(badStrategy);

        vm.expectRevert(EarnGridVault4626.InvalidPerformanceFee.selector);
        vault.setPerformanceFee(1_001);

        vm.expectRevert(EarnGridVault4626.ZeroAddress.selector);
        vault.setFeeRecipient(address(0));
    }

    function testRevertsOnZeroSharesDeposit() public {
        _approve(alice, 0);
        vm.expectRevert(EarnGridVault4626.ZeroShares.selector);
        vm.prank(alice);
        vault.deposit(0, alice);

        vm.expectRevert(EarnGridVault4626.ZeroShares.selector);
        vm.prank(alice);
        vault.mint(0, alice);
    }
}
