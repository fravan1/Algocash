import algosdk from "algosdk";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

// Explicitly resolve the .env path relative to where you run the script
const envPath = path.resolve(process.cwd(), ".env");
dotenv.config({ path: envPath });

/**
 * Check user's state in the smart contract
 * This script displays the user's balance, used amount, and remaining balance
 */
async function checkUserState() {
  try {
    // Validate environment variables
    const requiredEnvVars = ["ALGOD_BASE_URL", "SERVER_MNEMONIC", "APP_ID"];
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        throw new Error(`Missing required environment variable: ${envVar}`);
      }
    }

    console.log("👤 Checking user state in smart contract...\n");

    // Initialize Algod client (AlgoNode doesn't require API key)
    const algodToken = ""; // AlgoNode doesn't require an API key
    const algodServer = process.env.ALGOD_BASE_URL!;
    const algodPort = 443;

    const algodClient = new algosdk.Algodv2(algodToken, algodServer, algodPort);

    // Get account from mnemonic
    const account = algosdk.mnemonicToSecretKey(process.env.SERVER_MNEMONIC!);
    const appId = parseInt(process.env.APP_ID!);
    const appAddress = algosdk.getApplicationAddress(appId);

    console.log(`📋 User Details:`);
    console.log(`   Address: ${account.addr}`);
    console.log(`   App ID: ${appId}\n`);

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
        return;
      }

      // Get user's local state
      const userAppState = accountInfo["apps-local-state"].find(
        (app: any) => app.id === appId
      );

      if (!userAppState || !userAppState["key-value"]) {
        console.log("❌ No local state found for user.");
        return;
      }

      // Parse local state
      let userBalance = 0;
      let usedAmount = 0;

      for (const kv of userAppState["key-value"]) {
        const key = Buffer.from(kv.key, "base64").toString();
        const value = kv.value.uint || 0;

        if (key === "balance") {
          // User balance key
          userBalance = value / 1e6; // Convert from microALGO to ALGO
        } else if (key === "used") {
          // Used amount key
          usedAmount = value / 1e6; // Convert from microALGO to ALGO
        }
      }

      const remainingBalance = userBalance - usedAmount;

      console.log("💰 User State:");
      console.log(`   Deposited Balance: ${userBalance.toFixed(6)} ALGO`);
      console.log(`   Used Amount: ${usedAmount.toFixed(6)} ALGO`);
      console.log(
        `   Remaining Balance: ${remainingBalance.toFixed(6)} ALGO\n`
      );

      // Get contract's total balance
      const contractInfo = await algodClient
        .accountInformation(appAddress)
        .do();
      const contractBalance = contractInfo.amount / 1e6;

      console.log("📊 Contract Information:");
      console.log(`   Contract Balance: ${contractBalance.toFixed(6)} ALGO`);
      console.log(`   Contract Address: ${appAddress}\n`);

      console.log("🔗 Explorer Links:");
      console.log(
        `   User Account: https://testnet.algoexplorer.io/address/${account.addr}`
      );
      console.log(
        `   Contract: https://testnet.algoexplorer.io/address/${appAddress}\n`
      );

      if (remainingBalance > 0) {
        console.log(
          `✅ You can mint up to ${remainingBalance.toFixed(
            6
          )} digital currency`
        );
        console.log(`   Run: npm run mint ${remainingBalance.toFixed(2)}`);
      } else {
        console.log("ℹ️  No remaining balance available for minting");
        console.log("   Deposit more ALGO to mint additional digital currency");
      }
    } catch (error) {
      console.error("❌ Error checking user state:", error);
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ Error checking user state:", error);
    process.exit(1);
  }
}

// Run the script
checkUserState();
