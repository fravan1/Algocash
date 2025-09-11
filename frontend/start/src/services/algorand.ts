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

  // Get application balance
  async getAppBalance(): Promise<number> {
    try {
      const accountInfo = await this.algodClient
        .accountInformation(this.appAddress)
        .do();
      return accountInfo.amount / 1e6; // Convert from microALGO to ALGO
    } catch (error) {
      console.error("Error getting app balance:", error);
      throw error;
    }
  }

  // Send deposit to application
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

      // Sign and send transaction
      const signedTxn = paymentTxn.signTxn(account.sk);
      const txId = paymentTxn.txID().toString();

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

  // Mint digital currency
  async mintCurrency(mnemonic: string, amount: number): Promise<string> {
    try {
      const account = this.getAccountFromMnemonic(mnemonic);

      // Get suggested parameters
      const suggestedParams = await this.algodClient
        .getTransactionParams()
        .do();

      // Create NoOp transaction with mint amount as argument
      const noOpTxn = algosdk.makeApplicationNoOpTxnFromObject({
        from: account.addr,
        suggestedParams,
        appIndex: this.appId,
        appArgs: [textEncoder.encode(amount.toString())],
      });

      // Sign and send transaction
      const signedTxn = noOpTxn.signTxn(account.sk);
      const txId = noOpTxn.txID().toString();

      const result = await this.algodClient.sendRawTransaction(signedTxn).do();

      // Wait for confirmation
      await algosdk.waitForConfirmation(this.algodClient, result.txId, 4);

      return result.txId;
    } catch (error) {
      console.error("Error minting currency:", error);
      throw error;
    }
  }

  // Get user's local state in the smart contract
  async getUserState(mnemonic: string): Promise<{
    balance: number;
    used: number;
    remaining: number;
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
        return { balance: 0, used: 0, remaining: 0 };
      }

      // Parse local state
      let balance = 0;
      let used = 0;

      if (appLocalState["key-value"]) {
        for (const kv of appLocalState["key-value"]) {
          const key = textDecoder.decode(new Uint8Array(kv.key));
          const value = kv.value.uint || 0;

          if (key === "balance") {
            balance = value / 1e6; // Convert from microALGO to ALGO
          } else if (key === "used") {
            used = value / 1e6; // Convert from microALGO to ALGO
          }
        }
      }

      const remaining = balance - used;

      return { balance, used, remaining };
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
