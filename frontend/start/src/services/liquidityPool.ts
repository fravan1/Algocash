import algosdk from "algosdk";

/**
 * Frontend Liquidity Pool Service
 * Manages liquidity pool wallet for withdrawals
 */

export class LiquidityPoolService {
  private liquidityAccount: algosdk.Account;
  private algodClient: algosdk.Algodv2;

  constructor() {
    // Initialize Algod client
    const algodToken = "";
    const algodServer =
      import.meta.env.VITE_ALGOD_BASE_URL ||
      "https://testnet-api.algonode.cloud";
    const algodPort = 443;
    this.algodClient = new algosdk.Algodv2(algodToken, algodServer, algodPort);

    // Initialize liquidity pool account
    // Option 1: Use environment variable (recommended)
    const liquidityMnemonic = import.meta.env.VITE_LIQUIDITY_POOL_MNEMONIC;
    if (liquidityMnemonic) {
      this.liquidityAccount = algosdk.mnemonicToSecretKey(liquidityMnemonic);
    } else {
      // Option 2: Use main account (for testing)
      const mainMnemonic = import.meta.env.VITE_USER_MNEMONIC;
      if (mainMnemonic) {
        this.liquidityAccount = algosdk.mnemonicToSecretKey(mainMnemonic);
      } else {
        throw new Error("No liquidity pool mnemonic found");
      }
    }
  }

  // Get liquidity pool balance
  async getBalance(): Promise<number> {
    try {
      const accountInfo = await this.algodClient
        .accountInformation(this.liquidityAccount.addr)
        .do();
      return accountInfo.amount / 1e6; // Convert from microALGO to ALGO
    } catch (error) {
      console.error("Error getting liquidity pool balance:", error);
      throw error;
    }
  }

  // Send ALGO from liquidity pool to destination
  async sendToAddress(
    destinationAddress: string,
    amount: number
  ): Promise<string> {
    try {
      // Check balance
      const currentBalance = await this.getBalance();
      if (currentBalance < amount + 0.1) {
        throw new Error(
          `Insufficient liquidity. Pool has ${currentBalance} ALGO, need ${
            amount + 0.1
          } ALGO`
        );
      }

      // Get suggested parameters
      const suggestedParams = await this.algodClient
        .getTransactionParams()
        .do();

      // Create payment transaction
      const paymentAmount = amount * 1e6; // Convert ALGO to microALGO
      const paymentTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        from: this.liquidityAccount.addr,
        to: destinationAddress,
        amount: paymentAmount,
        suggestedParams,
        note: new TextEncoder().encode("Withdrawal from liquidity pool"),
      });

      // Sign and send transaction
      const signedTxn = paymentTxn.signTxn(this.liquidityAccount.sk);

      console.log(
        `📤 Sending ${amount} ALGO from liquidity pool to ${destinationAddress}`
      );
      const result = await this.algodClient.sendRawTransaction(signedTxn).do();
      console.log(`✅ Transaction sent: ${result.txId}`);

      // Wait for confirmation
      await algosdk.waitForConfirmation(this.algodClient, result.txId, 4);
      console.log("🎉 Withdrawal from liquidity pool confirmed!");

      return result.txId;
    } catch (error) {
      console.error("Error sending from liquidity pool:", error);
      throw error;
    }
  }

  // Get liquidity pool address
  getAddress(): string {
    return this.liquidityAccount.addr;
  }

  // Check if liquidity pool has sufficient balance
  async hasSufficientBalance(amount: number): Promise<boolean> {
    const balance = await this.getBalance();
    return balance >= amount + 0.1; // Need extra for fees
  }
}

// Export singleton instance
export const liquidityPoolService = new LiquidityPoolService();
