# ToritoWallet Smart Contract Integration Guide

## 📋 Contract Information

**Contract Name:** ToritoWallet  
**Network:** Sepolia Testnet (for deployment)  
**Contract Address:** `0x178150350c18612E604Ad429896f39aE785751C8`  

## 🔧 ABI (Application Binary Interface)

The complete ABI is available in `/abi/ToritoWallet.json`. For quick reference, here are the key method signatures:

### 👤 User Functions

#### Deposit USDT
```solidity
function deposit(uint256 amount) external
```
- **Parameters:** 
  - `amount`: USDT amount with 6 decimals (e.g., 1000000000 = 1000 USDT)
- **Requirements:** 
  - User must approve USDT transfer first
  - Contract checks allowance before attempting transfer
- **Process:**
  1. Checks user has approved sufficient allowance
  2. Transfers USDT from user to contract
  3. Emits `USDTDeposited` event
  4. Immediately supplies USDT to Aave for yield
  5. Updates user balance and emits `Deposit` event

#### Withdraw USDT
```solidity
function withdraw(uint256 amount, uint256 usdtToBobRate) external
```
- **Parameters:**
  - `amount`: USDT amount with 6 decimals
  - `usdtToBobRate`: Current exchange rate with 8 decimals (e.g., 696000000 = 6.96 BOB per USDT)
- **Requirements:** Sufficient balance and collateral

#### Request BOB Loan
```solidity
function requestLoan(uint256 bobAmount, uint256 usdtToBobRate) external returns (uint256 loanId)
```
- **Parameters:**
  - `bobAmount`: BOB amount with 2 decimals (e.g., 100000 = 1000.00 BOB)
  - `usdtToBobRate`: Current exchange rate with 8 decimals
- **Returns:** Loan ID for tracking

### 📊 View Functions

#### Get User Account
```solidity
function getUserAccount(address user) external view returns (UserAccount memory)
```
- **Returns:** User account struct with balances and status

#### Calculate Max Borrowable
```solidity
function calculateMaxBorrowable(uint256 usdtBalance, uint256 usdtToBobRate) public pure returns (uint256)
```
- **Parameters:**
  - `usdtBalance`: User's USDT balance (6 decimals)
  - `usdtToBobRate`: Exchange rate (8 decimals)
- **Returns:** Maximum BOB amount borrowable (2 decimals)

#### Calculate Required Collateral
```solidity
function calculateRequiredCollateral(uint256 bobAmount, uint256 usdtToBobRate) public pure returns (uint256)
```
- **Parameters:**
  - `bobAmount`: BOB loan amount (2 decimals)
  - `usdtToBobRate`: Exchange rate (8 decimals)
- **Returns:** Required USDT collateral (6 decimals)

#### Get Contract Stats
```solidity
function getContractStats() external view returns (uint256, uint256)
```
- **Returns:** 
  - Total deposits (USDT, 6 decimals)
  - Total BOB loans (BOB, 2 decimals)

#### Get User Loan IDs
```solidity
function getUserLoanIds(address user) external view returns (uint256[])
```
- **Returns:** Array of loan IDs for the user

### 🔒 Admin Functions (Owner Only)

#### Fulfill Loan
```solidity
function fulfillLoan(uint256 loanId) external
```
- **Parameters:** `loanId`: ID of the loan to fulfill

#### Record Repayment
```solidity
function recordRepayment(address user, uint256 bobAmount) external
```
- **Parameters:**
  - `user`: Address of the user making repayment
  - `bobAmount`: BOB amount repaid (2 decimals)

## 📡 Events

### User Events
```solidity
event Deposit(indexed address user, uint256 amount);
event USDTDeposited(indexed address user, uint256 amount);
event Withdrawal(indexed address user, uint256 amount);
event LoanRequested(indexed address user, uint256 loanId, uint256 bobAmount, uint256 usdtCollateral, uint256 rate);
```

### Admin Events
```solidity
event LoanFulfilled(indexed uint256 loanId);
event RepaymentRecorded(indexed address user, uint256 bobAmount);
```

## 📱 Mobile Frontend Integration Examples

### JavaScript/React Native

```javascript
import { ethers } from 'ethers';

// Contract setup
const contractAddress = '0x178150350c18612E604Ad429896f39aE785751C8';
const abi = require('./abi/ToritoWallet.json');

// Initialize contract
const provider = new ethers.JsonRpcProvider('https://sepolia.infura.io/v3/YOUR_KEY');
const signer = new ethers.Wallet(privateKey, provider);
const contract = new ethers.Contract(contractAddress, abi, signer);

// 1. Deposit USDT
async function depositUSDT(amount) {
  // amount should be in USDT units (e.g., 1000 for 1000 USDT)
  const amountWei = ethers.parseUnits(amount.toString(), 6);
  
  const usdtContract = new ethers.Contract(USDT_ADDRESS, ERC20_ABI, signer);
  
  // Check current allowance
  const currentAllowance = await usdtContract.allowance(signer.address, contractAddress);
  
  // Approve USDT transfer if needed
  if (currentAllowance < amountWei) {
    const approveTx = await usdtContract.approve(contractAddress, amountWei);
    await approveTx.wait();
  }
  
  // Deposit (contract will check allowance and emit USDTDeposited event)
  const tx = await contract.deposit(amountWei);
  const receipt = await tx.wait();
  
  // Listen for both events
  const usdtDepositedEvent = receipt.logs.find(log => 
    log.fragment && log.fragment.name === 'USDTDeposited'
  );
  const depositEvent = receipt.logs.find(log => 
    log.fragment && log.fragment.name === 'Deposit'
  );
  
  return { receipt, usdtDepositedEvent, depositEvent };
}

// 2. Request BOB loan
async function requestLoan(bobAmount, currentRate) {
  // bobAmount in BOB units (e.g., 1000 for 1000 BOB)
  // currentRate in BOB per USDT (e.g., 6.96)
  const bobAmountWei = ethers.parseUnits(bobAmount.toString(), 2);
  const rateWei = ethers.parseUnits(currentRate.toString(), 8);
  
  const tx = await contract.requestLoan(bobAmountWei, rateWei);
  const receipt = await tx.wait();
  
  // Extract loan ID from events
  const loanEvent = receipt.logs.find(log => 
    log.fragment && log.fragment.name === 'LoanRequested'
  );
  return loanEvent ? loanEvent.args.loanId : null;
}

// 3. Withdraw USDT
async function withdrawUSDT(amount, currentRate) {
  const amountWei = ethers.parseUnits(amount.toString(), 6);
  const rateWei = ethers.parseUnits(currentRate.toString(), 8);
  
  const tx = await contract.withdraw(amountWei, rateWei);
  return await tx.wait();
}

// 4. Get user account info
async function getUserInfo(userAddress) {
  const account = await contract.getUserAccount(userAddress);
  return {
    usdtBalance: ethers.formatUnits(account.usdtBalance, 6),
    bobDebt: ethers.formatUnits(account.bobDebt, 2),
    totalBorrowed: ethers.formatUnits(account.totalBobBorrowed, 2),
    totalRepaid: ethers.formatUnits(account.totalBobRepaid, 2),
    isActive: account.isActive
  };
}

// 5. Calculate borrowing capacity
async function getMaxBorrowable(usdtBalance, currentRate) {
  const balanceWei = ethers.parseUnits(usdtBalance.toString(), 6);
  const rateWei = ethers.parseUnits(currentRate.toString(), 8);
  
  const maxBorrowable = await contract.calculateMaxBorrowable(balanceWei, rateWei);
  return ethers.formatUnits(maxBorrowable, 2);
}
```

### Flutter/Dart

```dart
import 'package:web3dart/web3dart.dart';

class ToritoWalletService {
  static const String contractAddress = '0x178150350c18612E604Ad429896f39aE785751C8';
  static const String rpcUrl = 'https://sepolia.infura.io/v3/YOUR_KEY';
  
  late Web3Client client;
  late DeployedContract contract;
  
  Future<void> initialize() async {
    client = Web3Client(rpcUrl, Client());
    
    // Load ABI
    final abiJson = await rootBundle.loadString('assets/abi/ToritoWallet.json');
    final abi = ContractAbi.fromJson(abiJson, 'ToritoWallet');
    
    contract = DeployedContract(abi, EthereumAddress.fromHex(contractAddress));
  }
  
  // Deposit USDT
  Future<String> deposit(double amount, Credentials credentials) async {
    final amountWei = BigInt.from(amount * 1000000); // 6 decimals
    
    final transaction = Transaction.callContract(
      contract: contract,
      function: contract.function('deposit'),
      parameters: [amountWei],
    );
    
    return await client.sendTransaction(credentials, transaction);
  }
  
  // Request loan
  Future<String> requestLoan(double bobAmount, double rate, Credentials credentials) async {
    final bobAmountWei = BigInt.from(bobAmount * 100); // 2 decimals
    final rateWei = BigInt.from(rate * 100000000); // 8 decimals
    
    final transaction = Transaction.callContract(
      contract: contract,
      function: contract.function('requestLoan'),
      parameters: [bobAmountWei, rateWei],
    );
    
    return await client.sendTransaction(credentials, transaction);
  }
  
  // Get user account
  Future<Map<String, dynamic>> getUserAccount(String userAddress) async {
    final result = await client.call(
      contract: contract,
      function: contract.function('getUserAccount'),
      params: [EthereumAddress.fromHex(userAddress)],
    );
    
    return {
      'usdtBalance': (result[0] as BigInt).toDouble() / 1000000,
      'bobDebt': (result[1] as BigInt).toDouble() / 100,
      'totalBorrowed': (result[2] as BigInt).toDouble() / 100,
      'totalRepaid': (result[3] as BigInt).toDouble() / 100,
      'isActive': result[4] as bool,
    };
  }
}
```

## 🔄 Backend API Integration

### Node.js/Express Example

```javascript
const express = require('express');
const { ethers } = require('ethers');

const app = express();
app.use(express.json());

// Contract setup
const contractAddress = '0x178150350c18612E604Ad429896f39aE785751C8';
const abi = require('./abi/ToritoWallet.json');
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const ownerWallet = new ethers.Wallet(process.env.OWNER_PRIVATE_KEY, provider);
const contract = new ethers.Contract(contractAddress, abi, ownerWallet);

// Fulfill loan endpoint
app.post('/api/loans/:loanId/fulfill', async (req, res) => {
  try {
    const { loanId } = req.params;
    
    // Fulfill loan on-chain
    const tx = await contract.fulfillLoan(loanId);
    await tx.wait();
    
    res.json({ success: true, txHash: tx.hash });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Record repayment endpoint
app.post('/api/repayments', async (req, res) => {
  try {
    const { userAddress, bobAmount } = req.body;
    const amountWei = ethers.parseUnits(bobAmount.toString(), 2);
    
    // Record repayment on-chain
    const tx = await contract.recordRepayment(userAddress, amountWei);
    await tx.wait();
    
    res.json({ success: true, txHash: tx.hash });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get current exchange rate endpoint
app.get('/api/exchange-rate', async (req, res) => {
  try {
    // Fetch from your rate provider (e.g., CoinGecko, your own API)
    const rate = await fetchCurrentUsdtToBobRate();
    res.json({ rate: rate, decimals: 8 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## 📊 Data Structures

### UserAccount Struct
```solidity
struct UserAccount {
    uint256 usdtBalance;      // USDT balance (6 decimals)
    uint256 bobDebt;          // Current BOB debt (2 decimals)
    uint256 totalBobBorrowed; // Total BOB borrowed (2 decimals)
    uint256 totalBobRepaid;   // Total BOB repaid (2 decimals)
    bool isActive;            // Account status
}
```

### LoanRequest Struct
```solidity
struct LoanRequest {
    address user;             // Borrower address
    uint256 bobAmount;        // BOB amount (2 decimals)
    uint256 usdtCollateral;   // USDT collateral (6 decimals)
    uint256 timestamp;        // Request timestamp
    bool fulfilled;           // Fulfillment status
    bool repaid;             // Repayment status
}
```

## ⚠️ Important Notes

1. **Decimal Handling:**
   - USDT: 6 decimals
   - BOB: 2 decimals  
   - Exchange Rate: 8 decimals

2. **Rate Validation:**
   - Rates must be between 1-100 BOB per USDT
   - Always fetch current rates from your API

3. **Collateral Ratio:**
   - LTV: 50% (users can borrow up to 50% of collateral value)

4. **Gas Estimation:**
   - Deposit: ~150,000 gas
   - Withdraw: ~200,000 gas
   - Request Loan: ~180,000 gas

5. **Event Monitoring:**
   - Monitor events for real-time updates
   - Use indexed parameters for efficient filtering

## 🚀 Deployment

Replace `0x178150350c18612E604Ad429896f39aE785751C8` with the actual contract address after deployment to Sepolia testnet.
