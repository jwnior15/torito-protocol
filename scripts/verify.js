const hre = require("hardhat");

async function main() {
  // Contract address from deployment
  const contractAddress = "0xf252908A210a9569531e940f1BB0eaD52B3FA081";

  // Constructor arguments (same as deployment)
  const SEPOLIA_USDT = "0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0";
  const SEPOLIA_AUSDT = "0x6ab707Aca953eDAeFBc4fD23bA73294241490620";
  const SEPOLIA_AAVE_POOL = "0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951";

  console.log("🔍 Verifying ToritoWallet contract...");
  console.log("Contract Address:", contractAddress);
  console.log("Network: Sepolia");

  try {
    await hre.run("verify:verify", {
      address: contractAddress,
      constructorArguments: [SEPOLIA_USDT, SEPOLIA_AUSDT, SEPOLIA_AAVE_POOL],
    });

    console.log("✅ Contract verified successfully!");
    console.log(
      `🔗 View on Etherscan: https://sepolia.etherscan.io/address/${contractAddress}`
    );
  } catch (error) {
    if (error.message.toLowerCase().includes("already verified")) {
      console.log("✅ Contract is already verified!");
      console.log(
        `🔗 View on Etherscan: https://sepolia.etherscan.io/address/${contractAddress}`
      );
    } else {
      console.error("❌ Verification failed:", error.message);
      console.log("\n🔧 Troubleshooting:");
      console.log("1. Make sure ETHERSCAN_API_KEY is set in .env");
      console.log("2. Wait a few minutes after deployment before verifying");
      console.log("3. Check that constructor arguments match deployment");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
