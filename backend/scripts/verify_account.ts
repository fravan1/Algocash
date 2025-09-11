import algosdk from "algosdk";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

/**
 * Verify an existing Algorand account and display its information
 * This script checks if your mnemonic is valid and shows account details
 */
async function verifyAccount() {
  try {
    // Check if mnemonic is provided
    if (!process.env.SERVER_MNEMONIC) {
      console.log("❌ No SERVER_MNEMONIC found in environment variables");
      console.log("\n📝 To use your existing account:");
      console.log("1. Create a .env file in the backend directory");
      console.log("2. Add your mnemonic like this:");
      console.log("   SERVER_MNEMONIC=your_25_word_mnemonic_phrase_here");
      console.log("3. Add the AlgoNode API URL (no API key needed):");
      console.log("   ALGOD_BASE_URL=https://testnet-api.algonode.cloud");
      console.log("\nExample .env file content:");
      console.log("ALGOD_BASE_URL=https://testnet-api.algonode.cloud");
      console.log(
        "SERVER_MNEMONIC=abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art"
      );
      return;
    }

    console.log("🔍 Verifying your Algorand account...\n");

    // Validate mnemonic and get account
    const account = algosdk.mnemonicToSecretKey(process.env.SERVER_MNEMONIC!);
    const address = account.addr;

    console.log("✅ Account verification successful!\n");
    console.log("📋 Account Details:");
    console.log(`   Address: ${address}\n`);

    // If API URL is provided, check balance
    if (process.env.ALGOD_BASE_URL) {
      console.log("💰 Checking account balance...\n");

      // Initialize Algod client (AlgoNode doesn't require API key)
      const algodToken = ""; // AlgoNode doesn't require an API key
      const algodServer = process.env.ALGOD_BASE_URL!;
      const algodPort = 443;

      const algodClient = new algosdk.Algodv2(
        algodToken,
        algodServer,
        algodPort
      );

      try {
        // Get account information
        const accountInfo = await algodClient.accountInformation(address).do();
        const balance = accountInfo.amount / 1e6; // Convert from microALGO to ALGO

        console.log(`💰 Current Balance: ${balance} ALGO\n`);

        if (balance < 0.1) {
          console.log("⚠️  Warning: Low account balance!");
          console.log(
            "   You may need more ALGO for deployment and transactions."
          );
          console.log(
            "   Fund your account at: https://testnet.algoexplorer.io/dispenser\n"
          );
        } else {
          console.log("✅ Account has sufficient balance for testing!\n");
        }

        console.log("🔗 TestNet Explorer:");
        console.log(`   https://testnet.algoexplorer.io/address/${address}\n`);

        console.log("📝 Next Steps:");
        console.log(
          "   1. If balance is low, fund your account with TestNet ALGO"
        );
        console.log("   2. Run: npm run deploy");
        console.log("   3. Run: npm run deposit");
      } catch (error) {
        console.log("⚠️  Could not check balance (API connection issue)");
        console.log("   Make sure your ALGOD_BASE_URL is correct\n");
      }
    } else {
      console.log("⚠️  API URL not found");
      console.log("   Add ALGOD_BASE_URL to your .env file");
      console.log("   to check balance and deploy contracts\n");
    }
  } catch (error) {
    console.error("❌ Error verifying account:", error);
    console.log("\n🔍 Troubleshooting:");
    console.log("   • Check that your mnemonic is exactly 25 words");
    console.log("   • Ensure all words are spelled correctly");
    console.log("   • Make sure there are no extra spaces or characters");
    process.exit(1);
  }
}

// Run the script
verifyAccount();
