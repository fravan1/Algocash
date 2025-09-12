import algosdk from "algosdk";
import * as dotenv from "dotenv";
import * as path from "path";

// Explicitly resolve the .env path relative to where you run the script
const envPath = path.resolve(process.cwd(), ".env");
dotenv.config({ path: envPath });

/**
 * Setup Liquidity Pool Script
 * This script helps you set up the liquidity pool wallet
 */

// Generate a new liquidity pool wallet
function generateLiquidityPoolWallet(): algosdk.Account {
  return algosdk.generateAccount();
}

// Fund liquidity pool from main account
async function fundLiquidityPool(
  liquidityAccount: algosdk.Account,
  amount: number
): Promise<string> {
  try {
    const algodToken = "";
    const algodServer = process.env.ALGOD_BASE_URL!;
    const algodPort = 443;
    const algodClient = new algosdk.Algodv2(algodToken, algodServer, algodPort);

    const mainAccount = algosdk.mnemonicToSecretKey(
      process.env.SERVER_MNEMONIC!
    );

    // Check main account balance
    const mainInfo = await algodClient
      .accountInformation(mainAccount.addr)
      .do();
    const mainBalance = mainInfo.amount / 1e6;

    if (mainBalance < amount + 0.1) {
      throw new Error(
        `Insufficient balance. Main account has ${mainBalance} ALGO, need ${
          amount + 0.1
        } ALGO`
      );
    }

    // Get suggested parameters
    const suggestedParams = await algodClient.getTransactionParams().do();

    // Create payment transaction
    const paymentAmount = amount * 1e6; // Convert ALGO to microALGO
    const paymentTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      from: mainAccount.addr,
      to: liquidityAccount.addr,
      amount: paymentAmount,
      suggestedParams,
      note: new TextEncoder().encode("Initial liquidity pool funding"),
    });

    // Sign and send transaction
    const signedTxn = paymentTxn.signTxn(mainAccount.sk);
    const txId = paymentTxn.txID().toString();

    console.log(`📤 Funding liquidity pool with ${amount} ALGO...`);
    const result = await algodClient.sendRawTransaction(signedTxn).do();
    console.log(`✅ Transaction sent: ${result.txId}`);

    // Wait for confirmation
    await algosdk.waitForConfirmation(algodClient, result.txId, 4);
    console.log("🎉 Liquidity pool funded!");

    return result.txId;
  } catch (error) {
    console.error("Error funding liquidity pool:", error);
    throw error;
  }
}

// Main setup function
async function setupLiquidityPool() {
  try {
    console.log("🏦 Setting up Liquidity Pool Wallet...\n");

    // Validate environment variables
    const requiredEnvVars = ["ALGOD_BASE_URL", "SERVER_MNEMONIC"];
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        throw new Error(`Missing required environment variable: ${envVar}`);
      }
    }

    // Generate new liquidity pool wallet
    const liquidityAccount = generateLiquidityPoolWallet();

    console.log("🔑 Generated Liquidity Pool Wallet:");
    console.log(`   Address: ${liquidityAccount.addr}`);
    console.log(
      `   Mnemonic: ${algosdk.secretKeyToMnemonic(liquidityAccount.sk)}\n`
    );

    // Fund the liquidity pool
    const fundingAmount = 10.0; // Fund with 10 ALGO
    console.log(`💰 Funding liquidity pool with ${fundingAmount} ALGO...`);
    const txId = await fundLiquidityPool(liquidityAccount, fundingAmount);

    console.log("\n✅ Liquidity Pool Setup Complete!");
    console.log("=".repeat(50));
    console.log(`📍 Pool Address: ${liquidityAccount.addr}`);
    console.log(
      `🔑 Pool Mnemonic: ${algosdk.secretKeyToMnemonic(liquidityAccount.sk)}`
    );
    console.log(`💰 Initial Balance: ${fundingAmount} ALGO`);
    console.log(`📝 Transaction ID: ${txId}\n`);

    console.log("📋 Next Steps:");
    console.log("1. Add the liquidity pool mnemonic to your .env file:");
    console.log(
      `   LIQUIDITY_POOL_MNEMONIC=${algosdk.secretKeyToMnemonic(
        liquidityAccount.sk
      )}`
    );
    console.log("2. Update the liquidity_pool.ts script with the mnemonic");
    console.log("3. Test the liquidity pool: npm run liquidity check\n");

    console.log("🔗 Explorer Links:");
    console.log(
      `   Pool Address: https://testnet.algoexplorer.io/address/${liquidityAccount.addr}`
    );
    console.log(`   Transaction: https://testnet.algoexplorer.io/tx/${txId}\n`);
  } catch (error) {
    console.error("❌ Error setting up liquidity pool:", error);
    process.exit(1);
  }
}

// Run the script
setupLiquidityPool();
