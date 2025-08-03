const fs = require('fs');
const path = require('path');

async function extractABI() {
  try {
    // Read the compiled contract artifact
    const artifactPath = path.join(__dirname, '../artifacts/contracts/ToritoWallet.sol/ToritoWallet.json');
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    
    // Extract ABI
    const abi = artifact.abi;
    
    // Write ABI to a separate file for easy access
    const abiPath = path.join(__dirname, '../abi/ToritoWallet.json');
    
    // Create abi directory if it doesn't exist
    const abiDir = path.dirname(abiPath);
    if (!fs.existsSync(abiDir)) {
      fs.mkdirSync(abiDir, { recursive: true });
    }
    
    // Write formatted ABI
    fs.writeFileSync(abiPath, JSON.stringify(abi, null, 2));
    
    console.log('✅ ABI extracted successfully!');
    console.log(`📁 ABI saved to: ${abiPath}`);
    console.log('\n📋 ABI Preview:');
    console.log(JSON.stringify(abi, null, 2));
    
    // Extract function signatures
    console.log('\n🔧 Function Signatures:');
    abi.forEach(item => {
      if (item.type === 'function') {
        const inputs = item.inputs.map(input => `${input.type} ${input.name}`).join(', ');
        const outputs = item.outputs ? item.outputs.map(output => output.type).join(', ') : 'void';
        console.log(`${item.name}(${inputs}) -> ${outputs}`);
      }
    });
    
    // Extract events
    console.log('\n📡 Events:');
    abi.forEach(item => {
      if (item.type === 'event') {
        const inputs = item.inputs.map(input => `${input.indexed ? 'indexed ' : ''}${input.type} ${input.name}`).join(', ');
        console.log(`${item.name}(${inputs})`);
      }
    });
    
  } catch (error) {
    console.error('❌ Error extracting ABI:', error.message);
  }
}

extractABI();
