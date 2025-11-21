// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";

import {EarnGridVault4626} from "../contracts/src/EarnGridVault4626.sol";
import {EulerEarnStrategy} from "../contracts/src/strategies/EulerEarnStrategy.sol";
import {MockERC20} from "./mocks/MockERC20.sol";
import {MockEulerEarnVault} from "./mocks/MockEulerEarnVault.sol";

contract FeeOnRecoveryTest is Test {
    EarnGridVault4626 internal vault;
    EulerEarnStrategy internal strategy;
    MockERC20 internal usdc;
    MockEulerEarnVault internal eulerVault;

    address internal alice = address(0xA11ce);
    address internal feeRecipient = address(0xFEE);

    uint256 internal constant INITIAL_FEE_BPS = 1_000; // 10%

    function setUp() public {
        usdc = new MockERC20("USD Coin", "USDC", 6);
        eulerVault = new MockEulerEarnVault(usdc, "EulerEarn USDC", "eeUSDC");
        vault = new EarnGridVault4626(usdc, "EarnGrid USDC", "egUSDC", feeRecipient, INITIAL_FEE_BPS);
        strategy = new EulerEarnStrategy(usdc, eulerVault, address(vault));
        vault.setStrategy(strategy);

        // Seed users
        usdc.mint(alice, 1_000_000e6);
    }

    function _approve(address user, uint256 amount) internal {
        vm.prank(user);
        usdc.approve(address(vault), amount);
    }

    function testNoFeeOnRecovery() public {
        uint256 depositAmount = 100e6;
        _approve(alice, depositAmount);
        vm.prank(alice);
        vault.deposit(depositAmount, alice);

        // 1. Initial state
        // Price = 1.0
        assertEq(vault.totalAssets(), 100e6);
        assertEq(vault.highWaterMark(), 1e6); // 1.0 USDC

        // 2. Simulate Loss (drop to 90)
        eulerVault.simulateLoss(address(0xdead), 10e6);
        
        // Trigger fee collection
        vault.collectPerformanceFee();
        
        // Price = 0.9
        assertEq(vault.totalAssets(), 90e6);
        assertEq(vault.highWaterMark(), 1e6, "HWM should NOT decrease on loss");

        // 3. Simulate Recovery (back to 100)
        eulerVault.simulateYield(10e6);
        
        assertEq(vault.totalAssets(), 100e6);

        // 4. Trigger fee collection
        uint256 feeSharesBefore = vault.balanceOf(feeRecipient);
        vault.collectPerformanceFee();
        uint256 feeSharesAfter = vault.balanceOf(feeRecipient);

        // 5. Check if fee was charged
        uint256 feeSharesMinted = feeSharesAfter - feeSharesBefore;
        
        console.log("Fee Shares Minted on Recovery:", feeSharesMinted);
        
        // Should be 0 because we just recovered to 1.0 price
        assertEq(feeSharesMinted, 0, "Fee should NOT be charged on recovery");

        // Calculate user assets
        uint256 userShares = vault.balanceOf(alice);
        uint256 userAssets = vault.convertToAssets(userShares);
        
        // User deposited 100. Underlying went 100 -> 90 -> 100.
        // User should have 100.
        assertEq(userAssets, 100e6, "User principal preserved");
    }

    function testFeeOnNewHigh() public {
        uint256 depositAmount = 100e6;
        _approve(alice, depositAmount);
        vm.prank(alice);
        vault.deposit(depositAmount, alice);

        // 1. Simulate Yield (100 -> 110)
        eulerVault.simulateYield(10e6);

        // 2. Collect Fee
        uint256 feeSharesBefore = vault.balanceOf(feeRecipient);
        vault.collectPerformanceFee();
        uint256 feeSharesAfter = vault.balanceOf(feeRecipient);

        uint256 feeSharesMinted = feeSharesAfter - feeSharesBefore;
        assertTrue(feeSharesMinted > 0, "Fee should be charged on new high");

        // HWM should be updated to new price (approx 1.1)
        // Note: Price is slightly diluted by fee minting, but HWM tracks the pre-fee price snapshot logic
        // In our impl, we set HWM = currentPrice (which is the price *before* minting? No, we calculated currentPrice before minting)
        // Wait, let's check impl:
        // uint256 currentPrice = (assets * (10 ** decimals())) / supply;
        // ... mint ...
        // highWaterMark = currentPrice;
        
        // So HWM is set to the price BEFORE dilution.
        // This means immediately after minting, the actual share price will be LOWER than HWM.
        // This is correct behavior: we "realized" the gain up to that price.
        // Future yield must bring price ABOVE that previous pre-dilution peak to be charged again.
        
        assertGt(vault.highWaterMark(), 1e6, "HWM should increase");
    }
}
