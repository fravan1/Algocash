import algosdk from "algosdk";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

/**
 * Check the balance of the deployed application address
 * This script displays the current balance and provides explorer links
 */
async function checkBalance() {
  try {
    // Validate environment variables
    const requiredEnvVars = ["ALGOD_BASE_URL", "APP_ID"];
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        throw new Error(`Missing required environment variable: ${envVar}`);
      }
    }

    console.log("💰 Checking application balance...\n");

    // Initialize Algod client (AlgoNode doesn't require API key)
    const algodToken = ""; // AlgoNode doesn't require an API key
    const algodServer = process.env.ALGOD_BASE_URL!;
    const algodPort = 443;

    const algodClient = new algosdk.Algodv2(algodToken, algodServer, algodPort);

    // Get application details
    const appId = parseInt(process.env.APP_ID!);
    const appAddress = algosdk.getApplicationAddress(appId);

    console.log(`📋 Application Details:`);
    console.log(`   APP_ID: ${appId}`);
    console.log(`   Address: ${appAddress}\n`);

    // Get account information
    const accountInfo = await algodClient.accountInformation(appAddress).do();
    const balance = accountInfo.amount / 1e6; // Convert from microALGO to ALGO

    console.log(`💰 Current Balance: ${balance} ALGO\n`);

    // Display additional account information
    console.log("📊 Account Information:");
    console.log(`   Minimum Balance: ${accountInfo["min-balance"] / 1e6} ALGO`);
    console.log(`   Total Assets: ${accountInfo.assets?.length || 0}`);
    console.log(
      `   Total Applications: ${accountInfo["total-apps-opted-in"] || 0}\n`
    );

    console.log("🔗 Explorer Links:");
    console.log(
      `   Application: https://testnet.algoexplorer.io/address/${appAddress}`
    );
    console.log(
      `   AlgoExplorer: https://testnet.algoexplorer.io/address/${appAddress}\n`
    );

    if (balance > 0) {
      console.log("✅ Application has received deposits!");
    } else {
      console.log("ℹ️  Application has no ALGO balance yet.");
      console.log("   Run the deposit script to send ALGO to this address.");
    }
  } catch (error) {
    console.error("❌ Error checking balance:", error);
    process.exit(1);
  }
}

// Run the script
checkBalance();
