import algosdk from "algosdk";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

// Explicitly resolve the .env path relative to where you run the script
const envPath = path.resolve(process.cwd(), ".env");
dotenv.config({ path: envPath });

/**
 * Test simple NoOp transaction to see if the contract accepts it
 */
async function testNoOp() {
  try {
    // Validate environment variables
    const requiredEnvVars = ["ALGOD_BASE_URL", "SERVER_MNEMONIC", "APP_ID"];
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        throw new Error(`Missing required environment variable: ${envVar}`);
      }
    }

    console.log("🧪 Testing simple NoOp transaction...\n");

    // Initialize Algod client (AlgoNode doesn't require API key)
    const algodToken = ""; // AlgoNode doesn't require an API key
    const algodServer = process.env.ALGOD_BASE_URL!;
    const algodPort = 443;

    const algodClient = new algosdk.Algodv2(algodToken, algodServer, algodPort);

    // Get account from mnemonic
    const account = algosdk.mnemonicToSecretKey(process.env.SERVER_MNEMONIC!);
    const appId = parseInt(process.env.APP_ID!);

    console.log(`📋 Test Details:`);
    console.log(`   From: ${account.addr}`);
    console.log(`   App ID: ${appId}`);
    console.log(`   Transaction: Simple NoOp (no arguments)\n`);

    // Get suggested parameters
    const suggestedParams = await algodClient.getTransactionParams().do();

    // Create simple NoOp transaction (no arguments)
    const noOpTxn = algosdk.makeApplicationNoOpTxnFromObject({
      from: account.addr,
      suggestedParams,
      appIndex: appId,
    });

    // Sign and send transaction
    const signedTxn = noOpTxn.signTxn(account.sk);
    const txId = noOpTxn.txID().toString();

    console.log(`📤 Sending NoOp transaction: ${txId}`);

    const result = await algodClient.sendRawTransaction(signedTxn).do();
    console.log(`✅ Transaction sent: ${result.txId}\n`);

    // Wait for confirmation
    console.log("⏳ Waiting for confirmation...");
    const confirmedTxn = await algosdk.waitForConfirmation(
      algodClient,
      result.txId,
      4
    );

    console.log("🎉 NoOp test successful!\n");
    console.log("📋 Transaction Details:");
    console.log(`   Transaction ID: ${result.txId}`);
    console.log(`   Confirmed Round: ${confirmedTxn["confirmed-round"]}\n`);

    console.log("🔗 Explorer Links:");
    console.log(
      `   Transaction: https://testnet.algoexplorer.io/tx/${result.txId}\n`
    );

    console.log("✅ Simple NoOp transaction works!");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

// Run the script
testNoOp();
