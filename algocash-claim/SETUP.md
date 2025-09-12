# 🔧 AlgoCash Claim Website - Setup Guide

## ✅ Ready to Use!

**The website is already configured with your seed phrase and ready to work!**

### Current Configuration

The frontend is using the same seed phrase as your backend:

- **APP_ID**: 745702881 (your deployed contract)
- **SERVER_MNEMONIC**: Already configured from your backend
- **Network**: Algorand TestNet

### No Setup Required

Everything is already configured and ready to use!

### Step 3: Test the Setup

1. Start the development server:

   ```bash
   npm run dev
   ```

2. Visit: `http://localhost:3001`

3. Test with a valid unique code from your minted notes

## 🔒 Security Note

**This is for TestNet only!** Never use real private keys in production or with real money.

## 🎯 How It Works Now

1. **User scans QR code** → lands on claim page with unique code pre-filled
2. **User verifies code** → checks blockchain for validity and amount
3. **User enters address** → their Algorand wallet address
4. **User clicks Claim** → frontend directly:
   - Sends ALGO to user's address
   - Marks unique code as "USED" in smart contract
   - Shows transaction ID and success message

## 🚀 Ready to Deploy

After adding your private key, the website is ready to deploy to any static hosting service.

## 📱 QR Code Usage

Generate QR codes with URLs like:

```
https://your-domain.com/?id=UNIQUE_CODE_HERE
```

When users scan, they'll land on your claim page with the code pre-filled!
