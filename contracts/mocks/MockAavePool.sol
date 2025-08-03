// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../interfaces/IAave.sol";
import "./MockERC20.sol";

/**
 * @title MockAavePool
 * @dev Mock Aave Pool contract for testing purposes
 */
contract MockAavePool is IPool {
    using SafeERC20 for IERC20;

    IERC20 public immutable usdt;
    IERC20 public immutable aUsdt;

    mapping(address => uint256) public userSupplies;

    constructor(address _usdt, address _aUsdt) {
        usdt = IERC20(_usdt);
        aUsdt = IERC20(_aUsdt);
    }

    /**
     * @dev Mock supply function - transfers USDT and mints aUSDT
     */
    function supply(
        address asset,
        uint256 amount,
        address onBehalfOf,
        uint16 /* referralCode */
    ) external override {
        require(asset == address(usdt), "Only USDT supported");
        
        // Transfer USDT from user
        usdt.safeTransferFrom(msg.sender, address(this), amount);
        
        // Mint aUSDT to user (1:1 ratio for simplicity)
        MockERC20(address(aUsdt)).mint(onBehalfOf, amount);
        
        userSupplies[onBehalfOf] += amount;
    }

    /**
     * @dev Mock withdraw function - burns aUSDT and returns USDT
     */
    function withdraw(
        address asset,
        uint256 amount,
        address to
    ) external override returns (uint256) {
        require(asset == address(usdt), "Only USDT supported");
        require(userSupplies[msg.sender] >= amount, "Insufficient supply");
        
        // Burn aUSDT from user
        MockERC20(address(aUsdt)).burn(msg.sender, amount);
        
        // Transfer USDT to user
        usdt.safeTransfer(to, amount);
        
        userSupplies[msg.sender] -= amount;
        
        return amount;
    }

    /**
     * @dev Mock getUserAccountData - returns simplified data
     */
    function getUserAccountData(address user)
        external
        view
        override
        returns (
            uint256 totalCollateralBase,
            uint256 totalDebtBase,
            uint256 availableBorrowsBase,
            uint256 currentLiquidationThreshold,
            uint256 ltv,
            uint256 healthFactor
        )
    {
        totalCollateralBase = userSupplies[user];
        totalDebtBase = 0;
        availableBorrowsBase = userSupplies[user];
        currentLiquidationThreshold = 8000; // 80%
        ltv = 7500; // 75%
        healthFactor = type(uint256).max;
    }
}
