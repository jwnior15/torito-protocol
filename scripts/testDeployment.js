const hre = require("hardhat");

async function main() {
  const contractAddress = "0x178150350c18612E604Ad429896f39aE785751C8";
  
  console.log("🧪 Testing deployed contract...");
  console.log("Contract Address:", contractAddress);
  
  // Get contract instance
  const ToritoWallet = await hre.ethers.getContractFactory("ToritoWallet");
  const contract = ToritoWallet.attach(contractAddress);
  
  try {
    // Test basic contract functions
    console.log("\n📊 Testing contract functions:");
    
    // 1. Check owner
    const owner = await contract.owner();
    console.log("✅ Owner:", owner);
    
    // 2. Check contract stats
    const stats = await contract.getContractStats();
    console.log("✅ Total Deposits:", hre.ethers.formatUnits(stats[0], 6), "USDT");
    console.log("✅ Total BOB Loans:", hre.ethers.formatUnits(stats[1], 2), "BOB");
    
    // 3. Check constants
    const ltvRatio = await contract.LTV_RATIO();
    console.log("✅ LTV Ratio:", ltvRatio.toString() + "%");
    
    // 4. Test calculation functions
    const exampleRate = hre.ethers.parseUnits("6.96", 8); // 6.96 BOB per USDT
    const exampleBalance = hre.ethers.parseUnits("1000", 6); // 1000 USDT
    
    const maxBorrowable = await contract.calculateMaxBorrowable(exampleBalance, exampleRate);
    console.log("✅ Max borrowable for 1000 USDT:", hre.ethers.formatUnits(maxBorrowable, 2), "BOB");
    
    const requiredCollateral = await contract.calculateRequiredCollateral(
      hre.ethers.parseUnits("1000", 2), // 1000 BOB
      exampleRate
    );
    console.log("✅ Required collateral for 1000 BOB:", hre.ethers.formatUnits(requiredCollateral, 6), "USDT");
    
    // 5. Check token addresses
    const usdtAddress = await contract.usdt();
    const aUsdtAddress = await contract.aUsdt();
    const aavePoolAddress = await contract.aavePool();
    
    console.log("\n🔗 Contract Configuration:");
    console.log("USDT Address:", usdtAddress);
    console.log("aUSDT Address:", aUsdtAddress);
    console.log("Aave Pool Address:", aavePoolAddress);
    
    console.log("\n🎉 Contract deployment test successful!");
    console.log("🔗 View on Etherscan: https://sepolia.etherscan.io/address/" + contractAddress);
    
  } catch (error) {
    console.error("❌ Contract test failed:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
