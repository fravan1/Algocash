# Algorand Digital Currency Minting Contract

A smart contract that allows users to deposit ALGO and mint digital currency. Users can mint up to their deposited amount, with the contract tracking balances and used amounts.

## 🎯 Overview

This project demonstrates:

- A smart contract that accepts ALGO deposits and tracks user balances
- Digital currency minting functionality with balance validation
- User state management (deposited amount, used amount, remaining balance)
- TypeScript scripts for deployment, testing, and interaction
- Complete workflow from contract creation to currency minting
- Integration with Algorand TestNet using AlgoNode API

## 📁 Project Structure

```
backend/
├── contracts/
│   ├── approval.teal      # Main application logic with minting
│   └── clear.teal         # Clear state program
├── scripts/
│   ├── create_account.ts  # Generate TestNet account
│   ├── deploy_app.ts      # Compile & deploy contract
│   ├── send_deposit.ts    # Send test payment to app
│   ├── check_balance.ts   # Check app balance
│   ├── opt_in.ts          # Opt into the application
│   ├── mint_currency.ts   # Mint digital currency
│   └── check_user_state.ts # Check user's state and balances
├── .env.example           # Environment variables template
├── package.json           # Dependencies and scripts
└── README.md             # This file
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Set Up Environment

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your configuration
# No API key needed - AlgoNode provides free access!
```

### 3. Generate Test Account

```bash
npm run create-account
```

This will:

- Generate a new Algorand account
- Display the address and mnemonic
- Provide instructions for funding

### 4. Fund Your Account

1. Copy the address from step 3
2. Visit the [TestNet Faucet](https://testnet.algoexplorer.io/dispenser)
3. Enter your address and request ALGO
4. Add the mnemonic to your `.env` file as `SERVER_MNEMONIC`

### 5. Deploy the Contract

```bash
npm run deploy
```

This will:

- Compile the TEAL programs
- Deploy the contract to TestNet
- Print the `APP_ID` and application address
- Add the `APP_ID` to your `.env` file

### 6. Opt Into Application

```bash
npm run opt-in
```

This will:

- Opt your account into the smart contract
- Initialize your local state (balance: 0, used: 0)
- Display transaction details and explorer links

### 7. Test Deposit

```bash
npm run deposit
```

This will:

- Send 1 ALGO to the application address
- Wait for confirmation
- Display transaction details and explorer links

### 8. Check User State

```bash
npm run check-user-state
```

This will:

- Display your deposited balance, used amount, and remaining balance
- Show how much digital currency you can mint
- Display contract information and explorer links

### 9. Mint Digital Currency

```bash
npm run mint 0.5
```

This will:

- Mint 0.5 digital currency (up to your remaining balance)
- Update your used amount
- Display transaction details and explorer links

### 10. Check Balance (Optional)

```bash
npm run check-balance
```

This will:

- Display the current balance of the application address
- Show account information and explorer links

## 📋 Available Scripts

| Script           | Command                    | Description                      |
| ---------------- | -------------------------- | -------------------------------- |
| Create Account   | `npm run create-account`   | Generate new TestNet account     |
| Deploy Contract  | `npm run deploy`           | Deploy smart contract to TestNet |
| Opt In           | `npm run opt-in`           | Opt into the smart contract      |
| Send Deposit     | `npm run deposit`          | Send test payment to app address |
| Check User State | `npm run check-user-state` | Check user's balances and state  |
| Mint Currency    | `npm run mint <amount>`    | Mint digital currency            |
| Check Balance    | `npm run check-balance`    | Check application balance        |

## 🔧 Environment Variables

Required variables in `.env`:

```bash
# AlgoNode API Configuration (FREE - no API key needed!)
ALGOD_BASE_URL=https://testnet-api.algonode.cloud

# Server Account (your existing 25-word mnemonic)
SERVER_MNEMONIC=your_25_word_mnemonic_phrase_here

# Application ID (set after deployment)
APP_ID=your_app_id_here
```

## 🔗 Explorer Links

After deployment and deposits, you can view your transactions and application on:

- **AlgoExplorer TestNet**: https://testnet.algoexplorer.io/
- **AlgoNode**: https://algonode.cloud/ (Free API provider)

## 🛡️ Security Notes

### ⚠️ Important Warnings

- **Never commit mnemonics or API keys to source control**
- This demo uses a server-managed mnemonic for simplicity
- In production, use proper key management and user-signed transactions

### 🔒 Trust Model

This demo centralizes trust by using a server-managed account. In a production system:

1. **Users would sign their own transactions** using their wallets
2. **Grouped transactions** would be used for atomic operations
3. **Smart contracts** would handle the escrow logic
4. **No server-side private keys** would be required

The current approach is suitable for:

- ✅ Testing and development
- ✅ Hackathon demonstrations
- ✅ Proof of concept validation

## 📖 Smart Contract Details

### Approval Program (`contracts/approval.teal`)

The approval program handles:

- **NoOp transactions**: Main application logic (currently accepts all)
- **OptIn transactions**: Users joining the application
- **CloseOut transactions**: Users leaving the application
- **Update/Delete**: Currently rejected for security

### Clear Program (`contracts/clear.teal`)

The clear program handles:

- **Clear state transactions**: When users opt out of the application
- **Balance recovery**: Returns minimum balance requirement to users

## 🧪 Testing the Workflow

### Complete Test Sequence

1. **Generate Account**: `npm run create-account`
2. **Fund Account**: Use TestNet faucet
3. **Deploy Contract**: `npm run deploy`
4. **Send Deposit**: `npm run deposit`
5. **Verify on Explorer**: Check transaction and balance

### Expected Results

- ✅ Contract deploys successfully with APP_ID
- ✅ Application address receives deposits
- ✅ Balance increases by deposited amount
- ✅ All transactions confirmed on TestNet

## 🔍 Troubleshooting

### Common Issues

**"Insufficient balance"**

- Fund your account with more TestNet ALGO
- Check the faucet: https://testnet.algoexplorer.io/dispenser

**"Missing environment variable"**

- Ensure all required variables are set in `.env`
- Copy from `.env.example` if needed

**"Transaction failed"**

- Check network connectivity
- Verify ALGOD_BASE_URL is correct
- Ensure account has sufficient balance for fees

### Getting Help

- Check the [Algorand Developer Portal](https://developer.algorand.org/)
- Visit [Algorand Discord](https://discord.gg/algorand)
- Review [AlgoNode Documentation](https://algonode.cloud/)

## 📚 Next Steps

This minimal contract can be extended with:

1. **State Management**: Store user balances and data
2. **Business Logic**: Implement deposit/withdrawal rules
3. **User Interface**: Build a web app for interaction
4. **Security**: Add proper authorization and validation
5. **Integration**: Connect with wallets and payment systems

## 📄 License

MIT License - see LICENSE file for details.

---

**Happy Building! 🚀**

For questions or issues, please refer to the Algorand documentation or community resources.
