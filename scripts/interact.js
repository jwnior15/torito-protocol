const { ethers } = require("hardhat");

async function main() {
  // Replace with your deployed contract address
  const CONTRACT_ADDRESS = "0x..."; // Update after deployment
  
  console.log("🔗 Interacting with ToritoWallet contract...");
  console.log("Contract Address:", CONTRACT_ADDRESS);

  // Get signers
  const [deployer, user] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("User:", user.address);

  // Get contract instance
  const ToritoWallet = await ethers.getContractFactory("ToritoWallet");
  const contract = ToritoWallet.attach(CONTRACT_ADDRESS);

  try {
    // 1. Check contract stats
    console.log("\n📊 Contract Stats:");
    const stats = await contract.getContractStats();
    console.log("- Total Deposits:", ethers.formatUnits(stats[0], 6), "USDT");
    console.log("- Total BOB Loans:", ethers.formatUnits(stats[1], 2), "BOB");

    // 2. Check user account
    console.log("\n👤 User Account Info:");
    const userAccount = await contract.getUserAccount(user.address);
    console.log("- USDT Balance:", ethers.formatUnits(userAccount.usdtBalance, 6), "USDT");
    console.log("- BOB Debt:", ethers.formatUnits(userAccount.bobDebt, 2), "BOB");
    console.log("- Total Borrowed:", ethers.formatUnits(userAccount.totalBobBorrowed, 2), "BOB");
    console.log("- Total Repaid:", ethers.formatUnits(userAccount.totalBobRepaid, 2), "BOB");
    console.log("- Is Active:", userAccount.isActive);

    // 3. Calculate borrowing capacity (using example rate)
    if (userAccount.usdtBalance > 0) {
      const exampleRate = ethers.parseUnits("6.96", 8); // Example rate
      const maxBorrowable = await contract.calculateMaxBorrowable(userAccount.usdtBalance, exampleRate);
      console.log("- Max Borrowable (at 6.96 rate):", ethers.formatUnits(maxBorrowable, 2), "BOB");
    }

    // 4. Note about rate handling
    console.log("\n💱 Rate Handling:");
    console.log("- Rates are now passed as parameters to functions");
    console.log("- No on-chain rate storage - always use current market rates");
    console.log("- Backend should provide real-time rates for each transaction");

    // 5. Example calculations
    console.log("\n🧮 Example Calculations:");
    const exampleRate = ethers.parseUnits("6.96", 8); // 6.96 BOB per USDT
    const exampleUsdtAmount = ethers.parseUnits("1000", 6); // 1000 USDT
    const maxBorrowableExample = await contract.calculateMaxBorrowable(exampleUsdtAmount, exampleRate);
    console.log("- For 1000 USDT deposit, max borrowable:", ethers.formatUnits(maxBorrowableExample, 2), "BOB");

    const exampleBobAmount = ethers.parseUnits("1000", 2); // 1000 BOB
    const requiredCollateral = await contract.calculateRequiredCollateral(exampleBobAmount, exampleRate);
    console.log("- For 1000 BOB loan, required collateral:", ethers.formatUnits(requiredCollateral, 6), "USDT");

  } catch (error) {
    console.error("❌ Error interacting with contract:");
    console.error(error.message);
  }
}

// Example functions for different operations
async function exampleDeposit(contractAddress, userSigner, amount) {
  console.log(`\n💰 Example: Depositing ${ethers.formatUnits(amount, 6)} USDT...`);
  
  const ToritoWallet = await ethers.getContractFactory("ToritoWallet");
  const contract = ToritoWallet.attach(contractAddress);
  
  // Note: User must approve USDT spending first
  const tx = await contract.connect(userSigner).deposit(amount);
  const receipt = await tx.wait();
  
  console.log("✅ Deposit successful!");
  console.log("Transaction hash:", receipt.transactionHash);
}

async function exampleLoanRequest(contractAddress, userSigner, bobAmount, usdtToBobRate) {
  console.log(`\n🏦 Example: Requesting ${ethers.formatUnits(bobAmount, 2)} BOB loan...`);
  
  const ToritoWallet = await ethers.getContractFactory("ToritoWallet");
  const contract = ToritoWallet.attach(contractAddress);
  
  const tx = await contract.connect(userSigner).requestLoan(bobAmount, usdtToBobRate);
  const receipt = await tx.wait();
  
  // Extract loan ID from events
  const loanRequestedEvent = receipt.events?.find(e => e.event === 'LoanRequested');
  const loanId = loanRequestedEvent?.args?.loanId;
  
  console.log("✅ Loan request successful!");
  console.log("Loan ID:", loanId?.toString());
  console.log("Rate used:", ethers.formatUnits(usdtToBobRate, 8), "BOB per USDT");
  console.log("Transaction hash:", receipt.transactionHash);
}

async function exampleRepayment(contractAddress, ownerSigner, userAddress, bobAmount) {
  console.log(`\n💳 Example: Recording ${ethers.formatUnits(bobAmount, 2)} BOB repayment...`);
  
  const ToritoWallet = await ethers.getContractFactory("ToritoWallet");
  const contract = ToritoWallet.attach(contractAddress);
  
  const tx = await contract.connect(ownerSigner).recordRepayment(userAddress, bobAmount);
  const receipt = await tx.wait();
  
  console.log("✅ Repayment recorded successfully!");
  console.log("Transaction hash:", receipt.transactionHash);
}

// Run the main function
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = {
  exampleDeposit,
  exampleLoanRequest,
  exampleRepayment
};
