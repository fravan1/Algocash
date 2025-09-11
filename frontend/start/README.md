# Algorand Frontend Interface

A React frontend application for interacting with your deployed Algorand smart contract using seed phrases.

## 🎯 Features

- **Wallet Connection**: Connect using your 25-word mnemonic phrase
- **Balance Checking**: View your account and contract balances
- **Deposit Functionality**: Send ALGO deposits to the smart contract
- **Contract Interactions**: Opt into app and call contract functions
- **Transaction Tracking**: View transaction details and explorer links

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd frontend/start
npm install
```

### 2. Set Up Environment

Create a `.env` file in the `frontend/start` directory:

```bash
# AlgoNode API Configuration (FREE - no API key needed!)
VITE_ALGOD_BASE_URL=https://testnet-api.algonode.cloud

# Application ID (from backend deployment)
VITE_APP_ID=745678570

# User's seed phrase (for frontend transactions)
# Replace with your actual 25-word mnemonic
VITE_USER_MNEMONIC=your_25_word_mnemonic_phrase_here
```

### 3. Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## 🔧 Configuration

### Environment Variables

| Variable              | Description               | Example                              |
| --------------------- | ------------------------- | ------------------------------------ |
| `VITE_ALGOD_BASE_URL` | Algorand API endpoint     | `https://testnet-api.algonode.cloud` |
| `VITE_APP_ID`         | Your deployed contract ID | `745678570`                          |
| `VITE_USER_MNEMONIC`  | Your 25-word seed phrase  | `word1 word2 ... word25`             |

### Backend Integration

This frontend works with the contract deployed from your backend:

1. **Deploy Contract**: Use `npm run deploy` in the backend
2. **Get APP_ID**: Copy the APP_ID from deployment output
3. **Update Frontend**: Set `VITE_APP_ID` in frontend `.env`

## 🎮 Usage

### 1. Connect Wallet

1. Enter your 25-word mnemonic phrase
2. Click "Connect Wallet"
3. Your account will be connected for transactions

### 2. View Balances

- **Your Balance**: Shows your account's ALGO balance
- **Contract Balance**: Shows the smart contract's ALGO balance

### 3. Send Deposits

1. Enter the amount of ALGO to deposit
2. Click "Send Deposit"
3. Wait for transaction confirmation
4. View transaction on AlgoExplorer

### 4. Contract Actions

- **Opt Into App**: Join the smart contract application
- **Call App**: Execute a NoOp transaction on the contract
- **Refresh Balances**: Update balance information

## 🔒 Security

### ⚠️ Important Security Notes

- **TestNet Only**: This interface is designed for TestNet only
- **Local Storage**: Mnemonics are stored locally in your browser
- **No Server Storage**: Your private keys never leave your browser
- **MainNet Warning**: Never use MainNet mnemonics in this interface

### Best Practices

1. **Use TestNet Only**: Always use TestNet ALGO and mnemonics
2. **Secure Storage**: Keep your mnemonics secure and private
3. **Regular Updates**: Keep dependencies updated
4. **Environment Variables**: Never commit `.env` files to version control

## 🛠️ Development

### Project Structure

```
frontend/start/
├── src/
│   ├── components/
│   │   └── ContractInterface.tsx    # Main contract interaction component
│   ├── services/
│   │   └── algorand.ts             # Algorand SDK service
│   ├── App.tsx                     # Main application component
│   └── main.tsx                    # Application entry point
├── .env                            # Environment variables
├── package.json                    # Dependencies and scripts
└── README.md                       # This file
```

### Available Scripts

| Script      | Command           | Description              |
| ----------- | ----------------- | ------------------------ |
| Development | `npm run dev`     | Start development server |
| Build       | `npm run build`   | Build for production     |
| Preview     | `npm run preview` | Preview production build |
| Lint        | `npm run lint`    | Run ESLint               |

## 🔗 Integration with Backend

### Workflow

1. **Backend**: Deploy contract using `npm run deploy`
2. **Backend**: Get APP_ID from deployment output
3. **Frontend**: Set `VITE_APP_ID` in `.env`
4. **Frontend**: Start development server
5. **Frontend**: Connect wallet and interact with contract

### Shared Configuration

Both backend and frontend use:

- Same AlgoNode API endpoint
- Same contract APP_ID
- Same TestNet network

## 🧪 Testing

### Test Sequence

1. **Connect Wallet**: Enter your TestNet mnemonic
2. **Check Balances**: Verify account and contract balances
3. **Send Deposit**: Send 1 ALGO to the contract
4. **Verify Transaction**: Check transaction on AlgoExplorer
5. **Test Actions**: Try opt-in and app call functions

### Expected Results

- ✅ Wallet connects successfully
- ✅ Balances display correctly
- ✅ Deposits are sent and confirmed
- ✅ Contract actions execute successfully
- ✅ All transactions appear on AlgoExplorer

## 🔍 Troubleshooting

### Common Issues

**"Invalid mnemonic"**

- Ensure you have exactly 25 words
- Check for typos in the mnemonic
- Verify it's a TestNet mnemonic

**"Insufficient balance"**

- Fund your account with TestNet ALGO
- Use the faucet: https://testnet.algoexplorer.io/dispenser

**"Transaction failed"**

- Check network connectivity
- Verify APP_ID is correct
- Ensure sufficient balance for fees

**"Environment variables not found"**

- Create `.env` file in frontend/start directory
- Ensure variables start with `VITE_`
- Restart development server after changes

## 📚 Next Steps

This frontend can be extended with:

1. **Enhanced UI**: Better styling and user experience
2. **More Functions**: Additional contract interactions
3. **Wallet Integration**: Connect with popular wallets
4. **State Management**: Redux or Zustand for complex state
5. **Error Handling**: Better error messages and recovery
6. **Mobile Support**: Responsive design improvements

## 📄 License

MIT License - see LICENSE file for details.

---

**Happy Building! 🚀**

For questions or issues, please refer to the Algorand documentation or community resources.
