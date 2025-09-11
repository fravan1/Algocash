import algosdk from "algosdk";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

// Explicitly resolve the .env path relative to where you run the script
const envPath = path.resolve(process.cwd(), ".env");
dotenv.config({ path: envPath });

/**
 * Mint digital currency using the smart contract
 * This script allows users to mint currency up to their deposited amount
 */
async function mintCurrency() {
  try {
    // Validate environment variables
    const requiredEnvVars = ["ALGOD_BASE_URL", "SERVER_MNEMONIC", "APP_ID"];
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        throw new Error(`Missing required environment variable: ${envVar}`);
      }
    }

    // Get mint amount from command line arguments
    const mintAmount = process.argv[2];
    if (!mintAmount || isNaN(parseFloat(mintAmount))) {
      console.log("Usage: npm run mint <amount>");
      console.log("Example: npm run mint 0.5");
      process.exit(1);
    }

    const amount = parseFloat(mintAmount);
    console.log(`🪙 Minting ${amount} digital currency...\n`);

    // Initialize Algod client (AlgoNode doesn't require API key)
    const algodToken = ""; // AlgoNode doesn't require an API key
    const algodServer = process.env.ALGOD_BASE_URL!;
    const algodPort = 443;

    const algodClient = new algosdk.Algodv2(algodToken, algodServer, algodPort);

    // Get account from mnemonic
    const account = algosdk.mnemonicToSecretKey(process.env.SERVER_MNEMONIC!);
    const appId = parseInt(process.env.APP_ID!);
    const appAddress = algosdk.getApplicationAddress(appId);

    console.log(`📋 Mint Details:`);
    console.log(`   From: ${account.addr}`);
    console.log(`   App ID: ${appId}`);
    console.log(`   Amount: ${amount} digital currency\n`);

    // Check if user has opted into the app
    try {
      const accountInfo = await algodClient
        .accountInformation(account.addr)
        .do();
      const hasOptedIn = accountInfo["apps-local-state"]?.some(
        (app: any) => app.id === appId
      );

      if (!hasOptedIn) {
        console.log("❌ User has not opted into the application yet.");
        console.log("   Run: npm run opt-in");
        process.exit(1);
      }
    } catch (error) {
      console.log("❌ Error checking opt-in status:", error);
      process.exit(1);
    }

    // Get suggested parameters
    const suggestedParams = await algodClient.getTransactionParams().do();

    // Create mint transaction
    const mintAmountMicro = Math.floor(amount * 1e6); // Convert to micro units
    const textEncoder = new TextEncoder();
    const mintTxn = algosdk.makeApplicationNoOpTxnFromObject({
      from: account.addr,
      suggestedParams,
      appIndex: appId,
      appArgs: [textEncoder.encode(mintAmountMicro.toString())],
    });

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

    console.log("🎉 Mint successful!\n");
    console.log("📋 Transaction Details:");
    console.log(`   Transaction ID: ${result.txId}`);
    console.log(`   Confirmed Round: ${confirmedTxn["confirmed-round"]}`);
    console.log(`   Minted Amount: ${amount} digital currency\n`);

    console.log("🔗 Explorer Links:");
    console.log(
      `   Transaction: https://testnet.algoexplorer.io/tx/${result.txId}`
    );
    console.log(
      `   Application: https://testnet.algoexplorer.io/address/${appAddress}\n`
    );

    console.log("✅ Digital currency minted successfully!");
    console.log("   Run: npm run check-user-state to see updated balances");
  } catch (error) {
    console.error("❌ Error minting currency:", error);
    process.exit(1);
  }
}

// Run the script
mintCurrency();
