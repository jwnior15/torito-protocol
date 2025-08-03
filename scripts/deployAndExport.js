const hre = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
  console.log("🚀 Deploying ToritoWallet to Sepolia...");
  
  // Sepolia testnet addresses
  const SEPOLIA_USDT = "0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0"; // Sepolia USDT
  const SEPOLIA_AUSDT = "0x6ab707Aca953eDAeFBc4fD23bA73294241490620"; // Sepolia aUSDT  
  const SEPOLIA_AAVE_POOL = "0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951"; // Sepolia Aave Pool
  
  // Deploy the contract
  const ToritoWallet = await hre.ethers.getContractFactory("ToritoWallet");
  const toritoWallet = await ToritoWallet.deploy(
    SEPOLIA_USDT,
    SEPOLIA_AUSDT,
    SEPOLIA_AAVE_POOL
  );
  
  await toritoWallet.waitForDeployment();
  const contractAddress = await toritoWallet.getAddress();
  
  console.log("✅ ToritoWallet deployed to:", contractAddress);
  
  // Create deployment info file
  const deploymentInfo = {
    contractAddress: contractAddress,
    network: "sepolia",
    deployedAt: new Date().toISOString(),
    constructor: {
      usdt: SEPOLIA_USDT,
      aUsdt: SEPOLIA_AUSDT,
      aavePool: SEPOLIA_AAVE_POOL
    },
    abi: "See /abi/ToritoWallet.json for full ABI",
    essentialAbi: "See /abi/ToritoWallet_Essential.json for mobile integration"
  };
  
  // Write deployment info
  const deploymentPath = path.join(__dirname, '../deployment/sepolia.json');
  const deploymentDir = path.dirname(deploymentPath);
  
  if (!fs.existsSync(deploymentDir)) {
    fs.mkdirSync(deploymentDir, { recursive: true });
  }
  
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  
  console.log("📄 Deployment info saved to:", deploymentPath);
  console.log("\n🔗 Integration Details:");
  console.log("Contract Address:", contractAddress);
  console.log("Network: Sepolia Testnet");
  console.log("Chain ID: 11155111");
  console.log("\n📱 For mobile integration:");
  console.log("- Use ABI from: /abi/ToritoWallet_Essential.json");
  console.log("- Update INTEGRATION_GUIDE.md with this address");
  console.log("\n🔧 Next steps:");
  console.log("1. Verify contract on Etherscan");
  console.log("2. Update frontend/backend with contract address");
  console.log("3. Test integration with testnet USDT");
  
  // Update integration guide with actual address
  try {
    const integrationGuidePath = path.join(__dirname, '../INTEGRATION_GUIDE.md');
    let content = fs.readFileSync(integrationGuidePath, 'utf8');
    content = content.replace(/<DEPLOY_ADDRESS_PLACEHOLDER>/g, contractAddress);
    fs.writeFileSync(integrationGuidePath, content);
    console.log("✅ Updated INTEGRATION_GUIDE.md with contract address");
  } catch (error) {
    console.log("⚠️  Could not update integration guide:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
