import algosdk from "algosdk";

// Browser-compatible text encoding for Buffer functionality
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

// Cash storage interface
export interface CashTransaction {
  amount: number;
  timestamp: string;
  txId?: string;
  uniqueId?: string;
}

// Withdrawal interface
export interface WithdrawalData {
  amount: number;
  timestamp: string;
  txId?: string;
  withdrawn?: boolean;
  withdrawalTxId?: string;
  withdrawalTimestamp?: string;
}

// Algorand service for frontend interactions
export class AlgorandService {
  private algodClient: algosdk.Algodv2;
  private appId: number;
  private appAddress: string;

  constructor() {
    // Initialize Algod client (AlgoNode doesn't require API key)
    const algodToken = ""; // AlgoNode doesn't require an API key
    const algodServer =
      import.meta.env.VITE_ALGOD_BASE_URL ||
      "https://testnet-api.algonode.cloud";
    const algodPort = 443;

    this.algodClient = new algosdk.Algodv2(algodToken, algodServer, algodPort);
    this.appId = parseInt(import.meta.env.VITE_APP_ID || "745670578");
    this.appAddress = algosdk.getApplicationAddress(this.appId);
  }

  // Get account from mnemonic
  getAccountFromMnemonic(mnemonic: string): algosdk.Account {
    return algosdk.mnemonicToSecretKey(mnemonic);
  }

  // Get account balance
  async getAccountBalance(address: string): Promise<number> {
    try {
      const accountInfo = await this.algodClient
        .accountInformation(address)
        .do();
      return accountInfo.amount / 1e6; // Convert from microALGO to ALGO
    } catch (error) {
      console.error("Error getting account balance:", error);
      throw error;
    }
  }

  // Send deposit to application (group transaction)
  async sendDeposit(mnemonic: string, amount: number): Promise<string> {
    try {
      const account = this.getAccountFromMnemonic(mnemonic);

      // Check sender balance
      const senderBalance = await this.getAccountBalance(account.addr);
      if (senderBalance < amount + 0.1) {
        throw new Error(
          `Insufficient balance. Need at least ${
            amount + 0.1
          } ALGO (${amount} for deposit + 0.1 for fees)`
        );
      }

      // Get suggested parameters
      const suggestedParams = await this.algodClient
        .getTransactionParams()
        .do();

      // Create payment transaction
      const depositAmount = amount * 1e6; // Convert ALGO to microALGO
      const paymentTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        from: account.addr,
        to: this.appAddress,
        amount: depositAmount,
        suggestedParams,
        note: textEncoder.encode("Frontend deposit to smart contract"),
      });

      // Create application call transaction
      const appCallTxn = algosdk.makeApplicationNoOpTxnFromObject({
        from: account.addr,
        suggestedParams,
        appIndex: this.appId,
      });

      // Create transaction group
      const txnGroup = [appCallTxn, paymentTxn];
      algosdk.assignGroupID(txnGroup);

      // Sign transactions
      const signedAppCall = appCallTxn.signTxn(account.sk);
      const signedPayment = paymentTxn.signTxn(account.sk);

      // Combine signed transactions
      const signedTxn = new Uint8Array(
        signedAppCall.length + signedPayment.length
      );
      signedTxn.set(signedAppCall, 0);
      signedTxn.set(signedPayment, signedAppCall.length);

      const result = await this.algodClient.sendRawTransaction(signedTxn).do();

      // Wait for confirmation
      await algosdk.waitForConfirmation(this.algodClient, result.txId, 4);

      return result.txId;
    } catch (error) {
      console.error("Error sending deposit:", error);
      throw error;
    }
  }

  // Opt into application
  async optIntoApp(mnemonic: string): Promise<string> {
    try {
      const account = this.getAccountFromMnemonic(mnemonic);

      // Get suggested parameters
      const suggestedParams = await this.algodClient
        .getTransactionParams()
        .do();

      // Create opt-in transaction
      const optInTxn = algosdk.makeApplicationOptInTxnFromObject({
        from: account.addr,
        suggestedParams,
        appIndex: this.appId,
      });

      // Sign and send transaction
      const signedTxn = optInTxn.signTxn(account.sk);
      const txId = optInTxn.txID().toString();

      const result = await this.algodClient.sendRawTransaction(signedTxn).do();

      // Wait for confirmation
      await algosdk.waitForConfirmation(this.algodClient, result.txId, 4);

      return result.txId;
    } catch (error) {
      console.error("Error opting into app:", error);
      throw error;
    }
  }

  // Call application (NoOp transaction)
  async callApp(mnemonic: string): Promise<string> {
    try {
      const account = this.getAccountFromMnemonic(mnemonic);

      // Get suggested parameters
      const suggestedParams = await this.algodClient
        .getTransactionParams()
        .do();

      // Create NoOp transaction
      const noOpTxn = algosdk.makeApplicationNoOpTxnFromObject({
        from: account.addr,
        suggestedParams,
        appIndex: this.appId,
      });

      // Sign and send transaction
      const signedTxn = noOpTxn.signTxn(account.sk);
      const txId = noOpTxn.txID().toString();

      const result = await this.algodClient.sendRawTransaction(signedTxn).do();

      // Wait for confirmation
      await algosdk.waitForConfirmation(this.algodClient, result.txId, 4);

      return result.txId;
    } catch (error) {
      console.error("Error calling app:", error);
      throw error;
    }
  }

  // Get user's balance variable in the smart contract
  async getUserState(mnemonic: string): Promise<{
    balance: number;
  }> {
    try {
      const account = this.getAccountFromMnemonic(mnemonic);

      // Get account information
      const accountInfo = await this.algodClient
        .accountInformation(account.addr)
        .do();

      // Find local state for this app
      const appLocalState = accountInfo["apps-local-state"]?.find(
        (app: any) => app.id === this.appId
      );

      if (!appLocalState) {
        return { balance: 0 };
      }

      // Parse local state - only look for balance variable
      let balance = 0;

      if (appLocalState["key-value"]) {
        console.log(
          "Frontend: Found local state keys:",
          appLocalState["key-value"]
        );
        for (const kv of appLocalState["key-value"]) {
          // Use the same approach as backend check_user_state.ts
          const key = atob(kv.key); // Base64 decode
          const value = kv.value.uint || 0;

          console.log(`Frontend: Key="${key}", Value=${value}`);

          if (key === "balance") {
            balance = value / 1e6; // Convert from microALGO to ALGO
            console.log(`Frontend: Found balance=${balance} ALGO`);
          }
        }
      } else {
        console.log("Frontend: No key-value pairs found in local state");
      }

      return { balance };
    } catch (error) {
      console.error("Error getting user state:", error);
      throw error;
    }
  }

  // Get application info
  getAppInfo() {
    return {
      appId: this.appId,
      appAddress: this.appAddress,
      explorerUrl: `https://testnet.algoexplorer.io/address/${this.appAddress}`,
    };
  }

  // Get transaction explorer URL
  getTransactionUrl(txId: string): string {
    return `https://testnet.algoexplorer.io/tx/${txId}`;
  }

  // ===== CASH STORAGE METHODS =====

  // Simple encryption function (same as backend)
  private encryptNumber(amount: number): string {
    const timestamp = Date.now();
    let hash = "";
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let seed = amount * 1000000 + timestamp;
    for (let i = 0; i < 12; i++) {
      seed = (seed * 9301 + 49297) % 233280; // Simple PRNG
      hash += chars[Math.floor((seed / 233280) * chars.length)];
    }
    return hash;
  }

  // Store cash on blockchain (same logic as backend)
  async storeCashOnBlockchain(
    mnemonic: string,
    amount: number
  ): Promise<{ txId: string; uniqueId: string }> {
    try {
      const account = this.getAccountFromMnemonic(mnemonic);

      // Validate amount
      if (amount < 0.1 || amount > 0.9) {
        throw new Error("Amount must be between 0.1 and 0.9 ALGO");
      }

      // Generate encrypted hash
      const encryptedHash = this.encryptNumber(amount);
      console.log(`🔐 Encrypted ${amount} to Hash: ${encryptedHash}`);

      // Check sender balance
      const senderBalance = await this.getAccountBalance(account.addr);
      if (senderBalance < 0.1) {
        throw new Error(
          "Insufficient balance. Need at least 0.1 ALGO for transaction fees"
        );
      }

      // Get suggested parameters
      const suggestedParams = await this.algodClient
        .getTransactionParams()
        .do();

      // Create application call transaction
      const appCallTxn = algosdk.makeApplicationNoOpTxnFromObject({
        from: account.addr,
        suggestedParams,
        appIndex: this.appId,
        appArgs: [textEncoder.encode(encryptedHash)], // Only send hash
      });

      // Sign and send transaction
      const signedTxn = appCallTxn.signTxn(account.sk);
      const txId = appCallTxn.txID().toString();

      console.log(`📤 Sending cash storage transaction: ${txId}`);
      const result = await this.algodClient.sendRawTransaction(signedTxn).do();
      console.log(`✅ Transaction sent: ${result.txId}`);

      // Wait for confirmation
      console.log("⏳ Waiting for confirmation...");
      await algosdk.waitForConfirmation(this.algodClient, result.txId, 4);
      console.log("🎉 Cash storage confirmed!");

      return { txId: result.txId, uniqueId: encryptedHash };
    } catch (error) {
      console.error("Error storing cash on blockchain:", error);
      throw error;
    }
  }

  // ===== WITHDRAWAL METHODS =====

  // Validate Algorand address
  private isValidAlgorandAddress(address: string): boolean {
    try {
      algosdk.decodeAddress(address);
      return true;
    } catch (error) {
      return false;
    }
  }

  // Withdraw to wallet
  async withdrawToWallet(
    mnemonic: string,
    uniqueCode: string,
    destinationAddress: string,
    amount: number
  ): Promise<string> {
    try {
      const account = this.getAccountFromMnemonic(mnemonic);

      // Validate destination address
      if (!this.isValidAlgorandAddress(destinationAddress)) {
        throw new Error("Invalid Algorand destination address");
      }

      // Check sender balance
      const senderBalance = await this.getAccountBalance(account.addr);
      if (senderBalance < amount + 0.1) {
        throw new Error(
          `Insufficient balance. Need at least ${
            amount + 0.1
          } ALGO (${amount} for withdrawal + 0.1 for fees)`
        );
      }

      // Get suggested parameters
      const suggestedParams = await this.algodClient
        .getTransactionParams()
        .do();

      // Create payment transaction
      const withdrawalAmount = amount * 1e6; // Convert ALGO to microALGO
      const paymentTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        from: account.addr,
        to: destinationAddress,
        amount: withdrawalAmount,
        suggestedParams,
        note: textEncoder.encode(`Withdrawal using code: ${uniqueCode}`),
      });

      // Sign and send transaction
      const signedTxn = paymentTxn.signTxn(account.sk);
      const txId = paymentTxn.txID().toString();

      console.log(`📤 Sending withdrawal transaction: ${txId}`);
      const result = await this.algodClient.sendRawTransaction(signedTxn).do();
      console.log(`✅ Transaction sent: ${result.txId}`);

      // Wait for confirmation
      console.log("⏳ Waiting for confirmation...");
      await algosdk.waitForConfirmation(this.algodClient, result.txId, 4);
      console.log("🎉 Withdrawal confirmed!");

      return result.txId;
    } catch (error) {
      console.error("Error processing withdrawal:", error);
      throw error;
    }
  }

  // ===== LOCAL STORAGE METHODS =====

  // Load encryption map from localStorage
  loadEncryptionMap(): Record<string, WithdrawalData> {
    try {
      const data = localStorage.getItem("encryption_map");
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error("Error loading encryption map:", error);
      return {};
    }
  }

  // Save encryption map to localStorage
  saveEncryptionMap(map: Record<string, WithdrawalData>): void {
    try {
      localStorage.setItem("encryption_map", JSON.stringify(map));
    } catch (error) {
      console.error("Error saving encryption map:", error);
    }
  }

  // Add cash to local storage
  addCashToStorage(uniqueId: string, amount: number, txId: string): void {
    const encryptionMap = this.loadEncryptionMap();
    encryptionMap[uniqueId] = {
      amount: amount,
      timestamp: new Date().toISOString(),
      txId: txId,
      withdrawn: false,
    };
    this.saveEncryptionMap(encryptionMap);
  }

  // Mark as withdrawn
  markAsWithdrawn(uniqueCode: string, withdrawalTxId: string): void {
    const encryptionMap = this.loadEncryptionMap();
    if (encryptionMap[uniqueCode]) {
      encryptionMap[uniqueCode].withdrawn = true;
      encryptionMap[uniqueCode].withdrawalTxId = withdrawalTxId;
      encryptionMap[uniqueCode].withdrawalTimestamp = new Date().toISOString();
      this.saveEncryptionMap(encryptionMap);
    }
  }

  // Verify unique code
  verifyUniqueCode(uniqueCode: string): {
    amount: number;
    valid: boolean;
    message: string;
  } {
    const encryptionMap = this.loadEncryptionMap();
    const decryptedData = encryptionMap[uniqueCode];

    if (!decryptedData) {
      return {
        amount: 0,
        valid: false,
        message: "❌ Unique code not found in our records",
      };
    }

    if (decryptedData.withdrawn) {
      return {
        amount: 0,
        valid: false,
        message: "❌ This unique code has already been withdrawn",
      };
    }

    return {
      amount: decryptedData.amount,
      valid: true,
      message: `✅ Unique code verified. Amount: ${decryptedData.amount} ALGO`,
    };
  }

  // Get all cash transactions
  getAllCashTransactions(): CashTransaction[] {
    const encryptionMap = this.loadEncryptionMap();
    return Object.entries(encryptionMap).map(([uniqueId, data]) => ({
      amount: data.amount,
      timestamp: data.timestamp,
      txId: data.txId,
      uniqueId: uniqueId,
    }));
  }

  // Get withdrawal history
  getWithdrawalHistory(): Array<{ uniqueCode: string; data: WithdrawalData }> {
    const encryptionMap = this.loadEncryptionMap();
    return Object.entries(encryptionMap)
      .filter(([_, data]) => data.withdrawn)
      .map(([uniqueCode, data]) => ({ uniqueCode, data }));
  }
}

// Export singleton instance
export const algorandService = new AlgorandService();
