import algosdk from "algosdk";

// Browser-compatible text encoding for Buffer functionality
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

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
}

// Export singleton instance
export const algorandService = new AlgorandService();
