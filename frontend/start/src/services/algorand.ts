import algosdk from "algosdk";
import { liquidityPoolService } from "./liquidityPool";

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
    this.appId = parseInt(import.meta.env.VITE_APP_ID || "745696331");
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
      explorerUrl: `https://testnet.explorer.perawallet.app/address/${this.appAddress}`,
    };
  }

  // Get transaction explorer URL
  getTransactionUrl(txId: string): string {
    return `https://testnet.explorer.perawallet.app/tx/${txId}`;
  }

  // Check if user has opted into the application
  async checkOptInStatus(mnemonic: string): Promise<boolean> {
    try {
      const account = this.getAccountFromMnemonic(mnemonic);
      const accountInfo = await this.algodClient
        .accountInformation(account.addr)
        .do();

      const hasOptedIn = accountInfo["apps-local-state"]?.some(
        (app: any) => app.id === this.appId
      );

      console.log(`🔍 Opt-in status for ${account.addr}: ${hasOptedIn}`);
      return hasOptedIn || false;
    } catch (error) {
      console.error("Error checking opt-in status:", error);
      return false;
    }
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
      if (![1, 2, 5, 10].includes(amount)) {
        throw new Error("Amount must be 1, 2, 5, or 10 ALGO");
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

      // Create the data to store
      const dataToStore = {
        amount: amount,
        timestamp: new Date().toISOString(),
        txId: "", // Will be updated after transaction
      };

      console.log("📦 Data to store:", dataToStore);
      console.log("🔐 Encrypted hash:", encryptedHash);

      // Create application call transaction with encrypted hash and amount data
      const appCallTxn = algosdk.makeApplicationNoOpTxnFromObject({
        from: account.addr,
        suggestedParams,
        appIndex: this.appId,
        appArgs: [
          textEncoder.encode(encryptedHash),
          textEncoder.encode(JSON.stringify(dataToStore)),
        ],
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

  // Withdraw to wallet (from contract balance)
  async withdrawToWallet(
    mnemonic: string,
    uniqueCode: string,
    destinationAddress: string,
    amount: number
  ): Promise<string> {
    try {
      const account = this.getAccountFromMnemonic(mnemonic);

      console.log(`💰 Processing withdrawal request using liquidity pool...\n`);
      console.log(`✅ Unique code: ${uniqueCode}`);
      console.log(`💰 Amount: ${amount} ALGO`);
      console.log(`🎯 Destination: ${destinationAddress}\n`);

      // Step 1: Send ALGO from liquidity pool to destination
      console.log("🏦 Step 1: Sending ALGO from liquidity pool...");
      const liquidityTxId = await liquidityPoolService.sendToAddress(
        destinationAddress,
        amount
      );
      console.log(`✅ Liquidity pool transaction: ${liquidityTxId}\n`);

      // Step 2: Mark as withdrawn in contract
      console.log("📝 Step 2: Marking as withdrawn in contract...");

      // Create application call to mark as withdrawn
      const withdrawalAmount = amount * 1e6; // Convert ALGO to microALGO
      const appCallTxn = algosdk.makeApplicationNoOpTxnFromObject({
        from: account.addr,
        suggestedParams: await this.algodClient.getTransactionParams().do(),
        appIndex: this.appId,
        appArgs: [
          textEncoder.encode(uniqueCode),
          textEncoder.encode(destinationAddress),
          algosdk.encodeUint64(withdrawalAmount),
        ],
      });

      // Sign and send the app call transaction
      const signedTxn = appCallTxn.signTxn(account.sk);
      const contractTxId = appCallTxn.txID().toString();

      console.log(`📤 Sending contract transaction: ${contractTxId}`);
      const result = await this.algodClient.sendRawTransaction(signedTxn).do();
      console.log(`✅ Contract transaction sent: ${result.txId}\n`);

      // Wait for confirmation
      console.log("⏳ Waiting for contract confirmation...");
      const confirmedTxn = await algosdk.waitForConfirmation(
        this.algodClient,
        result.txId,
        4
      );
      console.log("🎉 Withdrawal completed!\n");

      console.log(`📋 Withdrawal Summary:`);
      console.log(`   Liquidity Pool TX: ${liquidityTxId}`);
      console.log(`   Contract TX: ${result.txId}`);
      console.log(`   Amount: ${amount} ALGO`);
      console.log(`   Unique Code: ${uniqueCode}`);
      console.log(`   Destination: ${destinationAddress}\n`);

      console.log(`🔗 Explorer Links:`);
      console.log(
        `   Liquidity TX: https://testnet.algoexplorer.io/tx/${liquidityTxId}`
      );
      console.log(
        `   Contract TX: https://testnet.algoexplorer.io/tx/${result.txId}`
      );
      console.log(
        `   Destination: https://testnet.algoexplorer.io/address/${destinationAddress}\n`
      );

      return result.txId;
    } catch (error) {
      console.error("Error processing withdrawal:", error);
      throw error;
    }
  }

  // ===== BLOCKCHAIN-ONLY METHODS =====

  // Get all stored cash values from blockchain global state
  async getAllStoredCashFromBlockchain(): Promise<CashTransaction[]> {
    try {
      console.log("🔍 Fetching stored cash from blockchain...");

      // Get application information
      const appInfo = await this.algodClient
        .getApplicationByID(this.appId)
        .do();

      console.log("📋 App Info:", appInfo);
      console.log("📋 Global State:", appInfo.params["global-state"]);

      if (!appInfo.params["global-state"]) {
        console.log("❌ No global state found");
        return [];
      }

      const cashTransactions: CashTransaction[] = [];

      // Parse global state to find all stored hashes
      for (const kv of appInfo.params["global-state"]) {
        const key = atob(kv.key); // Base64 decode
        console.log(`🔑 Processing key: "${key}"`);

        // Check if this looks like our encrypted hash (12 characters, alphanumeric)
        if (key.length === 12 && /^[A-Z0-9]+$/.test(key)) {
          console.log(`✅ Found valid hash: ${key}`);
          try {
            const value = atob(kv.value.bytes || ""); // Base64 decode
            console.log(`📄 Raw value: "${value}"`);

            // Check if it's a withdrawal flag (starts with "WITHDRAWN_")
            if (value.startsWith("WITHDRAWN_")) {
              console.log(`⏭️ Skipping withdrawn code: ${key}`);
              // Skip withdrawn codes in the view
              continue;
            }

            // Otherwise, parse as JSON data
            const data = JSON.parse(value);
            console.log(`📊 Parsed data:`, data);

            cashTransactions.push({
              amount: data.amount,
              timestamp: data.timestamp,
              txId: data.txId,
              uniqueId: key,
            });

            console.log(`✅ Added transaction: ${key} = ${data.amount} ALGO`);
          } catch (error) {
            console.log(
              `❌ Warning: Could not parse data for hash ${key}:`,
              error
            );
          }
        } else {
          console.log(
            `⏭️ Skipping non-hash key: "${key}" (length: ${key.length})`
          );
        }
      }

      console.log(
        `📈 Total cash transactions found: ${cashTransactions.length}`
      );
      return cashTransactions;
    } catch (error) {
      console.error("❌ Error getting stored cash from blockchain:", error);
      return [];
    }
  }

  // Verify unique code from blockchain
  async verifyUniqueCodeFromBlockchain(uniqueCode: string): Promise<{
    amount: number;
    valid: boolean;
    message: string;
  }> {
    try {
      // Get application information
      const appInfo = await this.algodClient
        .getApplicationByID(this.appId)
        .do();

      if (!appInfo.params["global-state"]) {
        return {
          amount: 0,
          valid: false,
          message: "❌ No data found on blockchain",
        };
      }

      // Look for the unique code in global state
      for (const kv of appInfo.params["global-state"]) {
        const key = atob(kv.key); // Base64 decode

        if (key === uniqueCode) {
          try {
            const value = atob(kv.value.bytes || ""); // Base64 decode

            // Check if it's a withdrawal flag (starts with "WITHDRAWN_")
            if (value.startsWith("WITHDRAWN_")) {
              return {
                amount: 0,
                valid: false,
                message: "❌ This unique code has already been withdrawn",
              };
            }

            // Otherwise, parse as JSON data
            const data = JSON.parse(value);

            return {
              amount: data.amount,
              valid: true,
              message: `✅ Unique code verified. Amount: ${data.amount} ALGO`,
            };
          } catch (error) {
            return {
              amount: 0,
              valid: false,
              message: "❌ Error parsing blockchain data",
            };
          }
        }
      }

      return {
        amount: 0,
        valid: false,
        message: "❌ Unique code not found in blockchain records",
      };
    } catch (error) {
      return {
        amount: 0,
        valid: false,
        message: `❌ Error verifying code: ${error}`,
      };
    }
  }

  // Get withdrawal history from blockchain
  async getWithdrawalHistoryFromBlockchain(): Promise<
    Array<{ uniqueCode: string; data: WithdrawalData }>
  > {
    try {
      // Get application information
      const appInfo = await this.algodClient
        .getApplicationByID(this.appId)
        .do();

      if (!appInfo.params["global-state"]) {
        return [];
      }

      const withdrawalHistory: Array<{
        uniqueCode: string;
        data: WithdrawalData;
      }> = [];

      // Parse global state to find withdrawn codes
      for (const kv of appInfo.params["global-state"]) {
        const key = atob(kv.key); // Base64 decode
        const value = atob(kv.value.bytes || ""); // Base64 decode

        // Check if this is a withdrawal flag (starts with "WITHDRAWN_")
        if (value.startsWith("WITHDRAWN_")) {
          const txId = value.replace("WITHDRAWN_", "");
          withdrawalHistory.push({
            uniqueCode: key,
            data: {
              amount: 0, // We don't store the original amount in withdrawal flags
              timestamp: new Date().toISOString(),
              withdrawn: true,
              withdrawalTxId: txId,
              withdrawalTimestamp: new Date().toISOString(),
            },
          });
        }
      }

      return withdrawalHistory;
    } catch (error) {
      console.error("Error getting withdrawal history from blockchain:", error);
      return [];
    }
  }

  // Mark unique code as withdrawn on blockchain
  async markAsWithdrawnOnBlockchain(
    uniqueCode: string,
    withdrawalTxId: string
  ): Promise<void> {
    try {
      // Get suggested parameters
      const suggestedParams = await this.algodClient
        .getTransactionParams()
        .do();

      // Create application call transaction to mark as withdrawn
      const appCallTxn = algosdk.makeApplicationNoOpTxnFromObject({
        from: this.getAccountFromMnemonic(import.meta.env.VITE_USER_MNEMONIC)
          .addr,
        suggestedParams,
        appIndex: this.appId,
        appArgs: [
          textEncoder.encode(uniqueCode),
          textEncoder.encode(`WITHDRAWN_${withdrawalTxId}`),
        ],
      });

      // Sign and send transaction
      const account = this.getAccountFromMnemonic(
        import.meta.env.VITE_USER_MNEMONIC
      );
      const signedTxn = appCallTxn.signTxn(account.sk);
      const result = await this.algodClient.sendRawTransaction(signedTxn).do();

      // Wait for confirmation
      await algosdk.waitForConfirmation(this.algodClient, result.txId, 4);

      console.log(`✅ Withdrawal status updated on blockchain: ${result.txId}`);
    } catch (error) {
      console.error("❌ Error marking as withdrawn on blockchain:", error);
      throw error;
    }
  }
}

// Export singleton instance
export const algorandService = new AlgorandService();
