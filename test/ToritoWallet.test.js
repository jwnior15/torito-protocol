const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ToritoWallet", function () {
  let toritoWallet;
  let mockUsdt;
  let mockAUsdt;
  let mockAavePool;
  let owner;
  let rateUpdater;
  let user1;
  let user2;

  const INITIAL_RATE = ethers.parseUnits("6.96", 8); // 6.96 BOB per USDT
  const USDT_DECIMALS = 6;
  const BOB_DECIMALS = 2;

  beforeEach(async function () {
    [owner, rateUpdater, user1, user2] = await ethers.getSigners();

    // Deploy mock USDT token
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    mockUsdt = await MockERC20.deploy("Tether USD", "USDT", USDT_DECIMALS);
    await mockUsdt.waitForDeployment();

    // Deploy mock aUSDT token
    mockAUsdt = await MockERC20.deploy("Aave interest bearing USDT", "aUSDT", USDT_DECIMALS);
    await mockAUsdt.waitForDeployment();

    // Deploy mock Aave Pool
    const MockAavePool = await ethers.getContractFactory("MockAavePool");
    mockAavePool = await MockAavePool.deploy(
      await mockUsdt.getAddress(),
      await mockAUsdt.getAddress()
    );
    await mockAavePool.waitForDeployment();

    // Deploy ToritoWallet
    const ToritoWallet = await ethers.getContractFactory("ToritoWallet");
    toritoWallet = await ToritoWallet.deploy(
      await mockUsdt.getAddress(),
      await mockAUsdt.getAddress(),
      await mockAavePool.getAddress()
    );
    await toritoWallet.waitForDeployment();

    // Mint USDT to users
    const mintAmount = ethers.parseUnits("10000", USDT_DECIMALS);
    await mockUsdt.mint(user1.address, mintAmount);
    await mockUsdt.mint(user2.address, mintAmount);

    // Approve ToritoWallet to spend USDT
    await mockUsdt.connect(user1).approve(await toritoWallet.getAddress(), mintAmount);
    await mockUsdt.connect(user2).approve(await toritoWallet.getAddress(), mintAmount);
  });

  describe("Deployment", function () {
    it("Should set the correct initial parameters", async function () {
      expect(await toritoWallet.owner()).to.equal(owner.address);
      expect(await toritoWallet.totalDeposits()).to.equal(0);
      expect(await toritoWallet.totalBobLoans()).to.equal(0);
    });

    it("Should revert with invalid constructor parameters", async function () {
      const ToritoWallet = await ethers.getContractFactory("ToritoWallet");
      
      await expect(
        ToritoWallet.deploy(
          ethers.ZeroAddress,
          await mockAUsdt.getAddress(),
          await mockAavePool.getAddress()
        )
      ).to.be.revertedWith("Invalid USDT address");
    });
  });

  describe("Deposits", function () {
    it("Should allow users to deposit USDT", async function () {
      const depositAmount = ethers.parseUnits("1000", USDT_DECIMALS);
      
      await expect(toritoWallet.connect(user1).deposit(depositAmount))
        .to.emit(toritoWallet, "Deposit")
        .withArgs(user1.address, depositAmount);

      const userAccount = await toritoWallet.getUserAccount(user1.address);
      expect(userAccount.usdtBalance).to.equal(depositAmount);
      expect(userAccount.isActive).to.be.true;
      expect(await toritoWallet.totalDeposits()).to.equal(depositAmount);
    });

    it("Should revert deposit with zero amount", async function () {
      await expect(toritoWallet.connect(user1).deposit(0))
        .to.be.revertedWith("Amount must be positive");
    });

    it("Should revert deposit without sufficient allowance", async function () {
      const depositAmount = ethers.parseUnits("20000", USDT_DECIMALS); // More than approved
      
      await expect(toritoWallet.connect(user1).deposit(depositAmount))
        .to.be.reverted;
    });
  });

  describe("Withdrawals", function () {
    beforeEach(async function () {
      const depositAmount = ethers.parseUnits("1000", USDT_DECIMALS);
      await toritoWallet.connect(user1).deposit(depositAmount);
    });

    it("Should allow users to withdraw USDT", async function () {
      const withdrawAmount = ethers.parseUnits("500", USDT_DECIMALS);
      
      await expect(toritoWallet.connect(user1).withdraw(withdrawAmount, INITIAL_RATE))
        .to.emit(toritoWallet, "Withdrawal")
        .withArgs(user1.address, withdrawAmount);

      const userAccount = await toritoWallet.getUserAccount(user1.address);
      expect(userAccount.usdtBalance).to.equal(ethers.parseUnits("500", USDT_DECIMALS));
    });

    it("Should revert withdrawal with insufficient balance", async function () {
      const withdrawAmount = ethers.parseUnits("2000", USDT_DECIMALS);
      
      await expect(toritoWallet.connect(user1).withdraw(withdrawAmount, INITIAL_RATE))
        .to.be.revertedWith("Insufficient balance");
    });

    it("Should revert withdrawal that would leave insufficient collateral", async function () {
      // First, request a loan
      const bobAmount = ethers.parseUnits("1000", BOB_DECIMALS); // 1000 BOB
      await toritoWallet.connect(user1).requestLoan(bobAmount, INITIAL_RATE);

      // Try to withdraw all USDT (should fail due to collateral requirement)
      const withdrawAmount = ethers.parseUnits("1000", USDT_DECIMALS);
      
      await expect(toritoWallet.connect(user1).withdraw(withdrawAmount, INITIAL_RATE))
        .to.be.revertedWith("Would leave insufficient collateral");
    });
  });

  describe("Loan Requests", function () {
    beforeEach(async function () {
      const depositAmount = ethers.parseUnits("1000", USDT_DECIMALS);
      await toritoWallet.connect(user1).deposit(depositAmount);
    });

    it("Should allow users to request BOB loans", async function () {
      const bobAmount = ethers.parseUnits("1000", BOB_DECIMALS); // 1000 BOB
      const expectedCollateral = await toritoWallet.calculateRequiredCollateral(bobAmount, INITIAL_RATE);
      
      await expect(toritoWallet.connect(user1).requestLoan(bobAmount, INITIAL_RATE))
        .to.emit(toritoWallet, "LoanRequested")
        .withArgs(user1.address, 1, bobAmount, expectedCollateral, INITIAL_RATE);

      const userAccount = await toritoWallet.getUserAccount(user1.address);
      expect(userAccount.bobDebt).to.equal(bobAmount);
      expect(userAccount.totalBobBorrowed).to.equal(bobAmount);

      const loanRequest = await toritoWallet.loanRequests(1);
      expect(loanRequest.user).to.equal(user1.address);
      expect(loanRequest.bobAmount).to.equal(bobAmount);
      expect(loanRequest.fulfilled).to.be.false;
    });

    it("Should revert loan request with insufficient collateral", async function () {
      const bobAmount = ethers.parseUnits("3500", BOB_DECIMALS); // 3500 BOB (more than max 3480 BOB)
      
      await expect(toritoWallet.connect(user1).requestLoan(bobAmount, INITIAL_RATE))
        .to.be.revertedWith("Insufficient collateral");
    });

    it("Should revert loan request for inactive account", async function () {
      const bobAmount = ethers.parseUnits("100", BOB_DECIMALS);
      
      await expect(toritoWallet.connect(user2).requestLoan(bobAmount, INITIAL_RATE))
        .to.be.revertedWith("Account not active");
    });
  });

  describe("Loan Fulfillment", function () {
    let loanId;

    beforeEach(async function () {
      const depositAmount = ethers.parseUnits("1000", USDT_DECIMALS);
      await toritoWallet.connect(user1).deposit(depositAmount);
      
      const bobAmount = ethers.parseUnits("1000", BOB_DECIMALS);
      const tx = await toritoWallet.connect(user1).requestLoan(bobAmount, INITIAL_RATE);
      const receipt = await tx.wait();
      loanId = 1; // First loan ID
    });

    it("Should allow owner to fulfill loans", async function () {
      await expect(toritoWallet.connect(owner).fulfillLoan(loanId))
        .to.emit(toritoWallet, "LoanFulfilled")
        .withArgs(loanId);

      const loanRequest = await toritoWallet.loanRequests(loanId);
      expect(loanRequest.fulfilled).to.be.true;
    });

    it("Should revert fulfillment by unauthorized user", async function () {
      await expect(toritoWallet.connect(user1).fulfillLoan(loanId))
        .to.be.revertedWithCustomError(toritoWallet, "OwnableUnauthorizedAccount");
    });

    it("Should revert fulfillment of non-existent loan", async function () {
      await expect(toritoWallet.connect(owner).fulfillLoan(999))
        .to.be.revertedWith("Loan does not exist");
    });
  });

  describe("Repayments", function () {
    beforeEach(async function () {
      const depositAmount = ethers.parseUnits("1000", USDT_DECIMALS);
      await toritoWallet.connect(user1).deposit(depositAmount);
      
      const bobAmount = ethers.parseUnits("1000", BOB_DECIMALS);
      await toritoWallet.connect(user1).requestLoan(bobAmount, INITIAL_RATE);
    });

    it("Should allow owner to record repayments", async function () {
      const repaymentAmount = ethers.parseUnits("500", BOB_DECIMALS);
      
      await expect(toritoWallet.connect(owner).recordRepayment(user1.address, repaymentAmount))
        .to.emit(toritoWallet, "RepaymentRecorded")
        .withArgs(user1.address, repaymentAmount);

      const userAccount = await toritoWallet.getUserAccount(user1.address);
      expect(userAccount.bobDebt).to.equal(ethers.parseUnits("500", BOB_DECIMALS));
      expect(userAccount.totalBobRepaid).to.equal(repaymentAmount);
    });

    it("Should revert repayment exceeding debt", async function () {
      const repaymentAmount = ethers.parseUnits("2000", BOB_DECIMALS);
      
      await expect(toritoWallet.connect(owner).recordRepayment(user1.address, repaymentAmount))
        .to.be.revertedWith("Repayment exceeds debt");
    });

    it("Should revert repayment by unauthorized user", async function () {
      const repaymentAmount = ethers.parseUnits("500", BOB_DECIMALS);
      
      await expect(toritoWallet.connect(user1).recordRepayment(user1.address, repaymentAmount))
        .to.be.revertedWithCustomError(toritoWallet, "OwnableUnauthorizedAccount");
    });
  });



  describe("Calculations", function () {
    it("Should calculate maximum borrowable amount correctly", async function () {
      const usdtBalance = ethers.parseUnits("1000", USDT_DECIMALS);
      const maxBorrowable = await toritoWallet.calculateMaxBorrowable(usdtBalance, INITIAL_RATE);
      
      // Expected: 1000 USDT * 6.96 BOB/USDT * 50% LTV = 3480 BOB
      // With 2 decimals for BOB: 3480 * 10^2 = 348000
      const expected = ethers.parseUnits("3480", BOB_DECIMALS);
      expect(maxBorrowable).to.equal(expected);
    });

    it("Should calculate required collateral correctly", async function () {
      const bobAmount = ethers.parseUnits("1000", BOB_DECIMALS); // 1000 BOB
      const requiredCollateral = await toritoWallet.calculateRequiredCollateral(bobAmount, INITIAL_RATE);
      
      // Expected: 1000 BOB / 6.96 BOB/USDT / 50% LTV = ~287.36 USDT
      const expected = ethers.parseUnits("287.356321", USDT_DECIMALS);
      expect(requiredCollateral).to.be.closeTo(expected, ethers.parseUnits("0.1", USDT_DECIMALS));
    });
  });

  describe("Admin Functions", function () {
    it("Should have correct owner", async function () {
      expect(await toritoWallet.owner()).to.equal(owner.address);
    });

    it("Should allow owner to transfer ownership", async function () {
      await toritoWallet.connect(owner).transferOwnership(user1.address);
      expect(await toritoWallet.owner()).to.equal(user1.address);
    });
  });
});
