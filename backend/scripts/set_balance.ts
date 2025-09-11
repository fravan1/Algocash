import algosdk from "algosdk";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

// Explicitly resolve the .env path relative to where you run the script
const envPath = path.resolve(process.cwd(), ".env");
dotenv.config({ path: envPath });

/**
 * Set user's balance in the smart contract for testing
 * This script manually sets the user's balance to test minting functionality
 */
async function setBalance() {
  try {
    // Validate environment variables
    const requiredEnvVars = ["ALGOD_BASE_URL", "SERVER_MNEMONIC", "APP_ID"];
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        throw new Error(`Missing required environment variable: ${envVar}`);
      }
    }

    console.log("💰 Setting user balance for testing...\n");

    // Initialize Algod client (AlgoNode doesn't require API key)
    const algodToken = ""; // AlgoNode doesn't require an API key
    const algodServer = process.env.ALGOD_BASE_URL!;
    const algodPort = 443;

    const algodClient = new algosdk.Algodv2(algodToken, algodServer, algodPort);

    // Get account from mnemonic
    const account = algosdk.mnemonicToSecretKey(process.env.SERVER_MNEMONIC!);
    const appId = parseInt(process.env.APP_ID!);

    console.log(`📋 Transaction Details:`);
    console.log(`   User: ${account.addr}`);
    console.log(`   App ID: ${appId}`);
    console.log(`   Setting balance to: 1 ALGO\n`);

    // Get suggested parameters
    const suggestedParams = await algodClient.getTransactionParams().do();

    // Create application call transaction with balance as argument
    const balanceAmount = 1 * 1e6; // Convert ALGO to microALGO
    const appCallTxn = algosdk.makeApplicationNoOpTxnFromObject({
      from: account.addr,
      suggestedParams,
      appIndex: appId,
      appArgs: [
        new TextEncoder().encode("set_balance"),
        new TextEncoder().encode(balanceAmount.toString()),
      ],
    });

    // Sign and send transaction
    const signedTxn = appCallTxn.signTxn(account.sk);
    const txId = appCallTxn.txID().toString();

    console.log(`📤 Sending transaction: ${txId}`);
    const result = await algodClient.sendRawTransaction(signedTxn).do();
    console.log(`✅ Transaction sent: ${result.txId}\n`);

    // Wait for confirmation
    console.log("⏳ Waiting for confirmation...");
    const confirmedTxn = await algosdk.waitForConfirmation(
      algodClient,
      result.txId,
      4
    );
    console.log("🎉 Balance set successfully!\n");

    console.log(`📋 Transaction Details:`);
    console.log(`   Transaction ID: ${result.txId}`);
    console.log(`   Confirmed Round: ${confirmedTxn["confirmed-round"]}\n`);

    console.log(`🔗 Explorer Links:`);
    console.log(
      `   Transaction: https://testnet.algoexplorer.io/tx/${result.txId}\n`
    );

    console.log("✅ Balance set successfully!");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

// Run the script
setBalance();
