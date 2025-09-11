import algosdk from "algosdk";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

// Explicitly resolve the .env path relative to where you run the script
const envPath = path.resolve(process.cwd(), ".env");
dotenv.config({ path: envPath });

/**
 * Opt into the smart contract application
 * This script allows users to join the application and initialize their local state
 */
async function optIn() {
  try {
    // Validate environment variables
    const requiredEnvVars = ["ALGOD_BASE_URL", "SERVER_MNEMONIC", "APP_ID"];
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        throw new Error(`Missing required environment variable: ${envVar}`);
      }
    }

    console.log("🔗 Opting into smart contract application...\n");

    // Initialize Algod client (AlgoNode doesn't require API key)
    const algodToken = ""; // AlgoNode doesn't require an API key
    const algodServer = process.env.ALGOD_BASE_URL!;
    const algodPort = 443;

    const algodClient = new algosdk.Algodv2(algodToken, algodServer, algodPort);

    // Get account from mnemonic
    const account = algosdk.mnemonicToSecretKey(process.env.SERVER_MNEMONIC!);
    const appId = parseInt(process.env.APP_ID!);
    const appAddress = algosdk.getApplicationAddress(appId);

    console.log(`📋 Opt-in Details:`);
    console.log(`   User: ${account.addr}`);
    console.log(`   App ID: ${appId}`);
    console.log(`   Contract Address: ${appAddress}\n`);

    // Check if user has already opted in
    try {
      const accountInfo = await algodClient
        .accountInformation(account.addr)
        .do();
      const hasOptedIn = accountInfo["apps-local-state"]?.some(
        (app: any) => app.id === appId
      );

      if (hasOptedIn) {
        console.log("✅ User has already opted into the application.");
        console.log("   Run: npm run check-user-state to see current state");
        return;
      }
    } catch (error) {
      console.log(
        "⚠️  Could not check opt-in status, proceeding with opt-in..."
      );
    }

    // Get suggested parameters
    const suggestedParams = await algodClient.getTransactionParams().do();

    // Create opt-in transaction
    const optInTxn = algosdk.makeApplicationOptInTxnFromObject({
      from: account.addr,
      suggestedParams,
      appIndex: appId,
    });

    // Sign and send transaction
    const signedTxn = optInTxn.signTxn(account.sk);
    const txId = optInTxn.txID().toString();

    console.log(`📤 Sending opt-in transaction: ${txId}`);

    const result = await algodClient.sendRawTransaction(signedTxn).do();
    console.log(`✅ Transaction sent: ${result.txId}\n`);

    // Wait for confirmation
    console.log("⏳ Waiting for confirmation...");
    const confirmedTxn = await algosdk.waitForConfirmation(
      algodClient,
      result.txId,
      4
    );

    console.log("🎉 Opt-in successful!\n");
    console.log("📋 Transaction Details:");
    console.log(`   Transaction ID: ${result.txId}`);
    console.log(`   Confirmed Round: ${confirmedTxn["confirmed-round"]}\n`);

    console.log("🔗 Explorer Links:");
    console.log(
      `   Transaction: https://testnet.algoexplorer.io/tx/${result.txId}`
    );
    console.log(
      `   Application: https://testnet.algoexplorer.io/address/${appAddress}\n`
    );

    console.log("✅ Successfully opted into the application!");
    console.log("   Your balance variable has been initialized to 0 ALGO\n");

    console.log("📝 Next Steps:");
    console.log("   1. Deposit ALGO to the contract: npm run deposit");
    console.log("   2. Check your state: npm run check-user-state");
  } catch (error) {
    console.error("❌ Error opting into application:", error);
    process.exit(1);
  }
}

// Run the script
optIn();
