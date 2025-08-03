const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying ToritoWallet contract...");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  // Contract addresses for Sepolia testnet
  const SEPOLIA_ADDRESSES = {
    USDT: "0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0", // Sepolia USDT
    AUSDT: "0x6ab707Aca953eDAeFBc4fD23bA73294241490620", // Sepolia aUSDT
    AAVE_POOL: "0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951" // Sepolia Aave Pool
  };

  // Mainnet addresses (for reference)
  const MAINNET_ADDRESSES = {
    USDT: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    AUSDT: "0x23878914EFE38d27C4D67Ab83ed1b93A74D4086a",
    AAVE_POOL: "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2"
  };

  // Use Sepolia addresses for deployment
  const addresses = SEPOLIA_ADDRESSES;

  console.log("Deployment parameters:");
  console.log("- USDT:", addresses.USDT);
  console.log("- aUSDT:", addresses.AUSDT);
  console.log("- Aave Pool:", addresses.AAVE_POOL);

  // Deploy the contract
  const ToritoWallet = await ethers.getContractFactory("ToritoWallet");
  const toritoWallet = await ToritoWallet.deploy(
    addresses.USDT,
    addresses.AUSDT,
    addresses.AAVE_POOL
  );

  await toritoWallet.waitForDeployment();
  const contractAddress = await toritoWallet.getAddress();

  console.log("\n✅ ToritoWallet deployed successfully!");
  console.log("Contract address:", contractAddress);
  console.log("Transaction hash:", toritoWallet.deploymentTransaction().hash);

  // Verify contract stats
  console.log("\n📊 Contract Stats:");
  const stats = await toritoWallet.getContractStats();
  console.log("- Total Deposits:", stats[0].toString());
  console.log("- Total BOB Loans:", stats[1].toString());

  console.log("\n🔧 Contract Functions Available:");
  console.log("- deposit(uint256 amount)");
  console.log("- withdraw(uint256 amount, uint256 usdtToBobRate)");
  console.log("- requestLoan(uint256 bobAmount, uint256 usdtToBobRate)");
  console.log("- fulfillLoan(uint256 loanId) [Owner Only]");
  console.log("- recordRepayment(address user, uint256 bobAmount) [Owner Only]");
  console.log("- calculateMaxBorrowable(uint256 usdtBalance, uint256 usdtToBobRate)");
  console.log("- calculateRequiredCollateral(uint256 bobAmount, uint256 usdtToBobRate)");

  console.log("\n📝 Next Steps:");
  console.log("1. Update your .env file with the deployed contract address");
  console.log("2. Verify the contract on Etherscan (optional)");
  console.log("3. Set up your backend to provide real-time exchange rates");
  console.log("4. Integrate rate parameter in all function calls");

  // Save deployment info
  const deploymentInfo = {
    contractAddress: contractAddress,
    deployer: deployer.address,
    network: "sepolia",
    deploymentTime: new Date().toISOString(),
    constructorArgs: {
      usdt: addresses.USDT,
      aUsdt: addresses.AUSDT,
      aavePool: addresses.AAVE_POOL
    }
  };

  console.log("\n💾 Deployment Info:");
  console.log(JSON.stringify(deploymentInfo, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });
