import algosdk from "algosdk";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

// Explicitly resolve the .env path relative to where you run the script
const envPath = path.resolve(process.cwd(), ".env");
dotenv.config({ path: envPath });

/**
 * Test mint transaction with debug information
 */
async function testMintDebug() {
  try {
    // Validate environment variables
    const requiredEnvVars = ["ALGOD_BASE_URL", "SERVER_MNEMONIC", "APP_ID"];
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        throw new Error(`Missing required environment variable: ${envVar}`);
      }
    }

    console.log("🧪 Testing mint transaction with debug info...\n");

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
    console.log(`   Transaction: NoOp with 1 argument (mint)\n`);

    // Get suggested parameters
    const suggestedParams = await algodClient.getTransactionParams().do();

    // Create mint transaction with 1 argument
    const mintAmount = 100000; // 0.1 ALGO in microALGO
    const textEncoder = new TextEncoder();
    const mintTxn = algosdk.makeApplicationNoOpTxnFromObject({
      from: account.addr,
      suggestedParams,
      appIndex: appId,
      appArgs: [textEncoder.encode(mintAmount.toString())],
    });

    console.log(`📋 Transaction Details:`);
    console.log(`   Type: Application Call (NoOp)`);
    console.log(`   Arguments: 1`);
    console.log(`   Argument 0: ${mintAmount} (${mintAmount / 1e6} ALGO)`);
    console.log(`   Group Size: 1\n`);

    // Sign and send transaction
    const signedTxn = mintTxn.signTxn(account.sk);
    const txId = mintTxn.txID().toString();

    console.log(`📤 Sending mint transaction: ${txId}`);

    const result = await algodClient.sendRawTransaction(signedTxn).do();
    console.log(`✅ Transaction sent: ${result.txId}\n`);

    // Wait for confirmation
    console.log("⏳ Waiting for confirmation...");
    const confirmedTxn = await algosdk.waitForConfirmation(
      algodClient,
      result.txId,
      4
    );

    console.log("🎉 Mint test successful!\n");
    console.log("📋 Transaction Details:");
    console.log(`   Transaction ID: ${result.txId}`);
    console.log(`   Confirmed Round: ${confirmedTxn["confirmed-round"]}\n`);

    console.log("🔗 Explorer Links:");
    console.log(
      `   Transaction: https://testnet.algoexplorer.io/tx/${result.txId}\n`
    );

    console.log("✅ Mint transaction works!");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

// Run the script
testMintDebug();
