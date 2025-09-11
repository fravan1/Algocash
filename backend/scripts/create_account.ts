import algosdk from "algosdk";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

/**
 * Generate a new Algorand account for TestNet
 * This script creates a new account and displays the address and mnemonic
 * The user should fund this account with TestNet ALGO from the faucet
 */
async function createAccount() {
  try {
    console.log("🔑 Generating new Algorand account...\n");

    // Generate a new account
    const account = algosdk.generateAccount();
    const address = account.addr;
    const mnemonic = algosdk.secretKeyToMnemonic(account.sk);

    console.log("✅ Account created successfully!\n");
    console.log("📋 Account Details:");
    console.log(`   Address: ${address}`);
    console.log(`   Mnemonic: ${mnemonic}\n`);

    console.log("⚠️  IMPORTANT SECURITY NOTES:");
    console.log("   • Save this mnemonic securely - it cannot be recovered!");
    console.log("   • Never commit mnemonics to source control");
    console.log("   • This is for TestNet only - do not use on MainNet\n");

    console.log("💰 Next Steps:");
    console.log("   1. Copy the mnemonic above");
    console.log("   2. Add it to your .env file as SERVER_MNEMONIC");
    console.log("   3. Fund this account with TestNet ALGO:");
    console.log(`      https://testnet.algoexplorer.io/dispenser`);
    console.log(`      Address: ${address}\n`);

    console.log("🔗 TestNet Explorer:");
    console.log(`   https://testnet.algoexplorer.io/address/${address}\n`);
  } catch (error) {
    console.error("❌ Error creating account:", error);
    process.exit(1);
  }
}

// Run the script
createAccount();
