import algosdk from "algosdk";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

/**
 * Send a test deposit to the deployed application address
 * This script sends 1 ALGO from the server account to the application address
 */
async function sendDeposit() {
  try {
    // Validate environment variables
    const requiredEnvVars = ["ALGOD_BASE_URL", "SERVER_MNEMONIC", "APP_ID"];
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        throw new Error(`Missing required environment variable: ${envVar}`);
      }
    }

    console.log("💰 Starting deposit transaction...\n");

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

    // Check current app balance
    const appInfo = await algodClient.accountInformation(appAddress).do();
    const appBalanceBefore = appInfo.amount / 1e6;
    console.log(`💰 App balance before: ${appBalanceBefore} ALGO\n`);

    // Get suggested parameters
    const suggestedParams = await algodClient.getTransactionParams().do();

    // Create payment transaction
    const depositAmount = 1e6; // 1 ALGO in microALGO
    const paymentTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      from: account.addr,
      to: appAddress,
      amount: depositAmount,
      suggestedParams,
      note: new Uint8Array(
        Buffer.from("Test deposit to smart contract", "utf8")
      ),
    });

    // Sign and send transaction
    const signedTxn = paymentTxn.signTxn(account.sk);
    const txId = paymentTxn.txID().toString();

    console.log(`📤 Sending payment transaction: ${txId}`);

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
    console.log("📋 Transaction Details:");
    console.log(`   Transaction ID: ${result.txId}`);
    console.log(`   Confirmed Round: ${confirmedTxn["confirmed-round"]}`);
    console.log(`   Amount: 1 ALGO\n`);

    // Check updated app balance
    const updatedAppInfo = await algodClient
      .accountInformation(appAddress)
      .do();
    const appBalanceAfter = updatedAppInfo.amount / 1e6;
    console.log(`💰 App balance after: ${appBalanceAfter} ALGO`);
    console.log(
      `📈 Balance increase: ${appBalanceAfter - appBalanceBefore} ALGO\n`
    );

    console.log("🔗 Explorer Links:");
    console.log(
      `   Transaction: https://testnet.algoexplorer.io/tx/${result.txId}`
    );
    console.log(
      `   Application: https://testnet.algoexplorer.io/address/${appAddress}\n`
    );

    console.log("✅ Deposit test completed successfully!");
    console.log(
      "   The application address has received the deposit and the balance has increased."
    );
  } catch (error) {
    console.error("❌ Error sending deposit:", error);
    process.exit(1);
  }
}

// Run the script
sendDeposit();
