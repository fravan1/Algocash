import algosdk from "algosdk";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

// Explicitly resolve the .env path relative to where you run the script
const envPath = path.resolve(process.cwd(), ".env");
dotenv.config({ path: envPath });

/**
 * Send a deposit to the smart contract using application call with payment
 * This script sends an application call with a payment transaction attached
 */
async function sendDepositWithApp() {
  try {
    // Validate environment variables
    const requiredEnvVars = ["ALGOD_BASE_URL", "SERVER_MNEMONIC", "APP_ID"];
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        throw new Error(`Missing required environment variable: ${envVar}`);
      }
    }

    console.log("💰 Starting deposit transaction with app call...\n");

    // Initialize Algod client (AlgoNode doesn't require API key)
    const algodToken = ""; // AlgoNode doesn't require an API key
    const algodServer = process.env.ALGOD_BASE_URL!;
    const algodPort = 443;

    const algodClient = new algosdk.Algodv2(algodToken, algodServer, algodPort);

    // Get account from mnemonic
    const account = algosdk.mnemonicToSecretKey(process.env.SERVER_MNEMONIC!);
    const appId = parseInt(process.env.APP_ID!);
    const appAddress = algosdk.getApplicationAddress(appId);

    console.log(`📋 Transaction Details:`);
    console.log(`   From: ${account.addr}`);
    console.log(`   To: ${appAddress} (App ID: ${appId})`);
    console.log(`   Amount: 1 ALGO\n`);

    // Check sender balance
    const senderInfo = await algodClient.accountInformation(account.addr).do();
    const senderBalance = senderInfo.amount / 1e6;
    console.log(`💰 Sender balance: ${senderBalance} ALGO`);

    if (senderBalance < 1.1) {
      throw new Error(
        "Insufficient balance. Need at least 1.1 ALGO (1 for deposit + 0.1 for fees)"
      );
    }

    // Check app balance before
    const appInfo = await algodClient.accountInformation(appAddress).do();
    const appBalanceBefore = appInfo.amount / 1e6;
    console.log(`💰 App balance before: ${appBalanceBefore} ALGO\n`);

    // Get suggested parameters
    const suggestedParams = await algodClient.getTransactionParams().do();

    // Create payment transaction
    const depositAmount = 1 * 1e6; // Convert ALGO to microALGO
    const paymentTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      from: account.addr,
      to: appAddress,
      amount: depositAmount,
      suggestedParams,
      note: new TextEncoder().encode("Deposit to smart contract"),
    });

    // Create application call transaction
    const appCallTxn = algosdk.makeApplicationNoOpTxnFromObject({
      from: account.addr,
      suggestedParams,
      appIndex: appId,
    });

    // Create transaction group
    const txnGroup = [appCallTxn, paymentTxn];
    algosdk.assignGroupID(txnGroup);

    // Sign transactions
    const signedAppCall = appCallTxn.signTxn(account.sk);
    const signedPayment = paymentTxn.signTxn(account.sk);

    // Combine signed transactions
    const signedTxn = new Uint8Array(
      signedAppCall.length + signedPayment.length
    );
    signedTxn.set(signedAppCall, 0);
    signedTxn.set(signedPayment, signedAppCall.length);

    console.log(`📤 Sending transaction group...`);
    const result = await algodClient.sendRawTransaction(signedTxn).do();
    console.log(`✅ Transaction sent: ${result.txId}\n`);

    // Wait for confirmation
    console.log("⏳ Waiting for confirmation...");
    const confirmedTxn = await algosdk.waitForConfirmation(
      algodClient,
      result.txId,
      4
    );
    console.log("🎉 Deposit confirmed!\n");

    // Check app balance after
    const appInfoAfter = await algodClient.accountInformation(appAddress).do();
    const appBalanceAfter = appInfoAfter.amount / 1e6;
    const balanceIncrease = appBalanceAfter - appBalanceBefore;

    console.log(`📋 Transaction Details:`);
    console.log(`   Transaction ID: ${result.txId}`);
    console.log(`   Confirmed Round: ${confirmedTxn["confirmed-round"]}`);
    console.log(`   Amount: 1 ALGO\n`);

    console.log(`💰 App balance after: ${appBalanceAfter} ALGO`);
    console.log(`📈 Balance increase: ${balanceIncrease} ALGO\n`);

    console.log(`🔗 Explorer Links:`);
    console.log(
      `   Transaction: https://testnet.algoexplorer.io/tx/${result.txId}`
    );
    console.log(
      `   Application: https://testnet.algoexplorer.io/address/${appAddress}\n`
    );

    console.log(
      "✅ Deposit test completed successfully!\n   The application address has received the deposit and the balance has increased."
    );
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

// Run the script
sendDepositWithApp();
