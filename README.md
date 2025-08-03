# Torito dApp - Smart Contract

A smart contract for a mobile e-wallet dApp that allows users to deposit USDT, earn yield through Aave, and take loans in Bolivianos (BOB) using their USDT as collateral.

## 🏗️ Architecture Overview

The system consists of:
- **Smart Contract**: Handles USDT deposits, Aave integration, and loan accounting
- **Off-chain Backend**: Updates exchange rates and processes loan fulfillments
- **Third-party Partner**: Handles BOB transfers to users' bank accounts

## 📋 Features

### Core Functionality
1. **USDT Deposits**: Users deposit USDT which is automatically supplied to Aave
2. **Yield Generation**: Deposited USDT earns yield through Aave's aUSDT
3. **BOB Loans**: Users can request loans in Bolivianos against their USDT collateral
4. **Real-time Exchange Rates**: Rates passed as parameters for each transaction
5. **Loan Tracking**: Complete tracking of loan requests, fulfillments, and repayments
6. **Collateral Management**: Automatic calculation of required collateral and borrowing limits

### Security Features
- **Access Control**: Role-based permissions for rate updates and admin functions
- **Reentrancy Protection**: Guards against reentrancy attacks
- **Collateral Validation**: Prevents withdrawals that would leave insufficient collateral
- **Input Validation**: Comprehensive parameter validation

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Git

### Installation

1. **Clone and setup**:
```bash
cd /home/jwnior15/Projects/personal/hackathon/toritoDApp
npm install
```

2. **Configure environment**:
```bash
cp .env.example .env
# Edit .env with your values
```

3. **Compile contracts**:
```bash
npm run compile
```

4. **Run tests**:
```bash
npm test
```

5. **Deploy to Sepolia**:
```bash
npm run deploy:sepolia
```

## 📊 Contract Details

### Main Contract: `ToritoWallet`

#### Key Parameters
- **LTV Ratio**: 50% (users can borrow up to 50% of their collateral value)
- **Rate Decimals**: 8 (exchange rates have 8 decimal places)
- **Supported Assets**: USDT (deposit) and BOB (loan currency)

#### Core Functions

##### User Functions
```solidity
function deposit(uint256 amount) external
function withdraw(uint256 amount, uint256 usdtToBobRate) external
function requestLoan(uint256 bobAmount, uint256 usdtToBobRate) external returns (uint256 loanId)
```

##### Admin Functions (Owner Only)
```solidity
function fulfillLoan(uint256 loanId) external
function recordRepayment(address user, uint256 bobAmount) external
```

##### View Functions
```solidity
function getUserAccount(address user) external view returns (UserAccount memory)
function calculateMaxBorrowable(uint256 usdtBalance, uint256 usdtToBobRate) public pure returns (uint256)
function calculateRequiredCollateral(uint256 bobAmount, uint256 usdtToBobRate) public pure returns (uint256)
function getContractStats() external view returns (uint256, uint256)
```

### Data Structures

#### UserAccount
```solidity
struct UserAccount {
    uint256 usdtBalance;        // User's USDT deposit balance
    uint256 bobDebt;           // Current debt in BOB
    uint256 totalBobBorrowed;  // Total BOB ever borrowed
    uint256 totalBobRepaid;    // Total BOB repaid
    bool isActive;             // Account status
}
```

#### LoanRequest
```solidity
struct LoanRequest {
    address user;              // Borrower address
    uint256 bobAmount;         // BOB amount requested
    uint256 usdtCollateral;    // USDT collateral used
    uint256 timestamp;         // Request timestamp
    bool fulfilled;            // Fulfillment status
    bool repaid;              // Repayment status
}
```

## 🔧 Integration Guide

### Backend Integration

#### 1. Real-time Rate Usage
```javascript
// Get current rate from your API
const currentRate = await fetchCurrentUsdtToBobRate(); // Your API call
const rate = ethers.parseUnits(currentRate.toString(), 8);
```

#### 2. Loan Fulfillment
```javascript
// Mark loan as fulfilled after BOB transfer
await contract.connect(ownerSigner).fulfillLoan(loanId);
```

#### 3. Repayment Recording
```javascript
// Record BOB repayment made off-chain
const repaymentAmount = ethers.parseUnits("500", 2); // 500 BOB
await contract.connect(ownerSigner).recordRepayment(userAddress, repaymentAmount);
```

### Frontend Integration

#### 1. User Deposit
```javascript
// Approve USDT spending
await usdtContract.connect(userSigner).approve(contractAddress, amount);

// Deposit USDT
await contract.connect(userSigner).deposit(amount);
```

#### 2. Loan Request
```javascript
// Get current rate and request BOB loan
const currentRate = await fetchCurrentUsdtToBobRate(); // Your API call
const rate = ethers.parseUnits(currentRate.toString(), 8);
const bobAmount = ethers.parseUnits("1000", 2); // 1000 BOB
const tx = await contract.connect(userSigner).requestLoan(bobAmount, rate);
const receipt = await tx.wait();

// Extract loan ID from events
const loanRequestedEvent = receipt.events?.find(e => e.event === 'LoanRequested');
const loanId = loanRequestedEvent?.args?.loanId;
```

#### 3. Account Information
```javascript
// Get user account details
const account = await contract.getUserAccount(userAddress);
console.log("USDT Balance:", account.usdtBalance.toString());
console.log("BOB Debt:", account.bobDebt.toString());

// Get borrowing capacity (with current rate)
const currentRate = await fetchCurrentUsdtToBobRate(); // Your API call
const rate = ethers.parseUnits(currentRate.toString(), 8);
const maxBorrowable = await contract.calculateMaxBorrowable(account.usdtBalance, rate);
console.log("Max Borrowable BOB:", maxBorrowable.toString());
```

## 🔄 Rate-as-Parameter Approach

This contract has been refactored to use a **rate-as-parameter** approach instead of storing exchange rates on-chain:

### Benefits:
- **Gas Efficiency**: No storage writes for rate updates
- **Real-time Rates**: Always use the most current exchange rate
- **Flexibility**: Different rates can be used for different transactions
- **Reduced Complexity**: No rate updater role or on-chain rate management

### Implementation:
- `withdraw()` and `requestLoan()` functions now require a `usdtToBobRate` parameter
- Calculation functions (`calculateMaxBorrowable`, `calculateRequiredCollateral`) are now `pure` functions
- Backend/frontend must fetch current rates and pass them to contract calls
- Rate validation ensures rates are within reasonable bounds (1-100 BOB per USDT)

## 🧪 Testing

The project includes comprehensive tests covering:
- Contract deployment and initialization
- USDT deposits and withdrawals
- Loan requests and validations
- Owner-only admin functions
- Edge cases and error conditions

Run tests:
```bash
npm test
```

## 🚀 Deployment

### Sepolia Testnet

1. **Configure environment**:
```bash
# .env file
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/your-api-key
PRIVATE_KEY=your-private-key-without-0x
```

2. **Deploy**:
```bash
npm run deploy:sepolia
```

### Contract Addresses

#### Sepolia Testnet
- USDT: `0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0`
- aUSDT: `0x6ab707Aca953eDAeFBc4fD23bA73294241490620`
- Aave Pool: `0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951`

#### Mainnet (for reference)
- USDT: `0xdAC17F958D2ee523a2206206994597C13D831ec7`
- aUSDT: `0x23878914EFE38d27C4D67Ab83ed1b93A74D4086a`
- Aave Pool: `0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2`

## 📈 Example Calculations

### Borrowing Capacity
```
User deposits: 1000 USDT
Exchange rate: 6.96 BOB/USDT
LTV ratio: 50%

Max borrowable = 1000 * 6.96 * 0.5 = 3,480 BOB
```

### Required Collateral
```
Loan request: 1000 BOB
Exchange rate: 6.96 BOB/USDT
LTV ratio: 50%

Required collateral = (1000 / 6.96) / 0.5 = 287.36 USDT
```

## 🔒 Security Considerations

1. **Rate Updates**: Only authorized backend can update exchange rates
2. **Collateral Checks**: Withdrawals are blocked if they would leave insufficient collateral
3. **Reentrancy Protection**: All state-changing functions are protected
4. **Input Validation**: Comprehensive parameter validation throughout
5. **Access Control**: Role-based permissions for sensitive operations

## 📞 Support

For questions or issues:
1. Check the test files for usage examples
2. Review the contract comments for detailed function descriptions
3. Ensure proper environment configuration

## 📄 License

MIT License - see LICENSE file for details.
