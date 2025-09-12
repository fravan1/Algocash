# 🏦 Liquidity Pool Setup Guide

## 📋 **Current Architecture**

### **Backend Liquidity Pool:**

- **Location**: Backend scripts (`liquidity_pool.ts`)
- **Wallet**: Uses `SERVER_MNEMONIC` from backend `.env`
- **Address**: `53FIEZ4Z5YUX67HYKTEXNOD4FFAK542RZZJ47H4YNDUBJWUK5FUA44GONY`
- **Balance**: ~29.68 ALGO

### **Frontend Integration:**

- **Service**: `src/services/liquidityPool.ts`
- **Integration**: Updated `src/services/algorand.ts`
- **Configuration**: Environment variables

## 🔧 **Setup Options**

### **Option 1: Backend-Only Liquidity Pool (Recommended)**

**Keep liquidity pool on backend, frontend calls backend API:**

```typescript
// Frontend calls backend
const response = await fetch("/api/withdraw", {
  method: "POST",
  body: JSON.stringify({
    uniqueCode: "ABC123",
    destinationAddress: "user_wallet_address",
  }),
});
```

**Benefits:**

- ✅ More secure (private keys stay on server)
- ✅ Easier to manage
- ✅ Better for production

### **Option 2: Frontend Liquidity Pool**

**Frontend manages its own liquidity pool:**

1. **Create `.env` file in frontend:**

```bash
# User Configuration
VITE_USER_MNEMONIC=your_25_word_mnemonic_phrase_here

# Contract Configuration
VITE_APP_ID=745696331

# Network Configuration
VITE_ALGOD_BASE_URL=https://testnet-api.algonode.cloud

# Liquidity Pool Configuration (Optional)
# If not provided, will use VITE_USER_MNEMONIC as liquidity pool
VITE_LIQUIDITY_POOL_MNEMONIC=your_liquidity_pool_25_word_mnemonic_phrase_here
```

2. **Generate new liquidity pool wallet:**

```bash
# In backend
npm run setup-liquidity
```

3. **Add the generated mnemonic to frontend `.env`:**

```bash
VITE_LIQUIDITY_POOL_MNEMONIC=wise siren truly stuff brick shrimp record slight month element slight inform stereo benefit farm saddle drip six thumb enforce stomach include toe ability relax
```

## 🚀 **How It Works**

### **Withdrawal Process:**

1. **Step 1**: Frontend calls `liquidityPoolService.sendToAddress()`
2. **Step 2**: Liquidity pool sends ALGO to destination
3. **Step 3**: Frontend calls contract to mark as withdrawn
4. **Step 4**: Contract updates global state

### **Benefits:**

- ✅ No more "unavailable Account" errors
- ✅ Works with any destination address
- ✅ Wallet-to-wallet transfers
- ✅ Auto-replenishment available

## 📝 **Current Status**

- ✅ Backend liquidity pool system ready
- ✅ Frontend liquidity pool service created
- ✅ Frontend integration updated
- ✅ New contract deployed (APP_ID: 745696331)
- ✅ Ready for testing

## 🧪 **Testing**

1. **Test backend liquidity pool:**

```bash
npm run liquidity check
npm run liquidity send <address> <amount>
```

2. **Test frontend integration:**

- Start frontend: `npm run dev`
- Test withdrawal with any address
- Check console for liquidity pool transactions

## 🔒 **Security Notes**

- **Backend Option**: Private keys stay on server (more secure)
- **Frontend Option**: Private keys in browser (less secure, but works)
- **Recommendation**: Use backend option for production
