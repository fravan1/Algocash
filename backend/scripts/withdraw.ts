import algosdk from "algosdk";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

// Explicitly resolve the .env path relative to where you run the script
const envPath = path.resolve(process.cwd(), ".env");
dotenv.config({ path: envPath });

/**
 * Withdrawal Script
 * This script allows you to:
 * 1. Verify unique code exists and decode the amount
 * 2. Send the decoded amount to destination wallet
 * 3. Track withdrawal transactions
 */

// All data is now stored on blockchain - no local storage needed!

// Validate Algorand address
function isValidAlgorandAddress(address: string): boolean {
  try {
    algosdk.decodeAddress(address);
    return true;
  } catch (error) {
    return false;
  }
}

// Verify unique code and get amount from blockchain
async function verifyAndDecodeUniqueCode(uniqueCode: string): Promise<{
  amount: number;
  valid: boolean;
  message: string;
}> {
  try {
    // Validate environment variables
    const requiredEnvVars = ["ALGOD_BASE_URL", "SERVER_MNEMONIC", "APP_ID"];
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        throw new Error(`Missing required environment variable: ${envVar}`);
      }
    }

    // Initialize Algod client
    const algodToken = "";
    const algodServer = process.env.ALGOD_BASE_URL!;
    const algodPort = 443;
    const algodClient = new algosdk.Algodv2(algodToken, algodServer, algodPort);

    const appId = parseInt(process.env.APP_ID!);

    // Get application information
    const appInfo = await algodClient.getApplicationByID(appId).do();

    if (!appInfo.params["global-state"]) {
      return {
        amount: 0,
        valid: false,
        message: "❌ No data found on blockchain",
      };
    }

    // Look for the unique code in global state
    for (const kv of appInfo.params["global-state"]) {
      const key = Buffer.from(kv.key, "base64").toString();

      if (key === uniqueCode) {
        try {
          const value = Buffer.from(kv.value.bytes || "", "base64").toString();

          // Check if it's a withdrawal flag (starts with "WITHDRAWN_")
          if (value.startsWith("WITHDRAWN_")) {
            return {
              amount: 0,
              valid: false,
              message: "❌ This unique code has already been withdrawn",
            };
          }

          // Otherwise, parse as JSON data
          const data = JSON.parse(value);

          return {
            amount: data.amount,
            valid: true,
            message: `✅ Unique code verified. Amount: ${data.amount} ALGO`,
          };
        } catch (error) {
          return {
            amount: 0,
            valid: false,
            message: "❌ Error parsing blockchain data",
          };
        }
      }
    }

    return {
      amount: 0,
      valid: false,
      message: "❌ Unique code not found in blockchain records",
    };
  } catch (error) {
    return {
      amount: 0,
      valid: false,
      message: `❌ Error verifying code: ${error}`,
    };
  }
}

// Mark unique code as withdrawn on blockchain
async function markAsWithdrawnOnBlockchain(
  uniqueCode: string,
  withdrawalTxId: string
): Promise<void> {
  try {
    // Validate environment variables
    const requiredEnvVars = ["ALGOD_BASE_URL", "SERVER_MNEMONIC", "APP_ID"];
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        throw new Error(`Missing required environment variable: ${envVar}`);
      }
    }

    // Initialize Algod client
    const algodToken = "";
    const algodServer = process.env.ALGOD_BASE_URL!;
    const algodPort = 443;
    const algodClient = new algosdk.Algodv2(algodToken, algodServer, algodPort);

    const account = algosdk.mnemonicToSecretKey(process.env.SERVER_MNEMONIC!);
    const appId = parseInt(process.env.APP_ID!);

    // First, get the current data for this unique code
    const appInfo = await algodClient.getApplicationByID(appId).do();

    if (!appInfo.params["global-state"]) {
      throw new Error("No global state found");
    }

    let currentData = null;
    for (const kv of appInfo.params["global-state"]) {
      const key = Buffer.from(kv.key, "base64").toString();
      if (key === uniqueCode) {
        const value = Buffer.from(kv.value.bytes || "", "base64").toString();
        currentData = JSON.parse(value);
        break;
      }
    }

    if (!currentData) {
      throw new Error("Unique code not found in blockchain");
    }

    // For simplicity, we'll just store a withdrawal flag
    // The full data will be maintained in local storage for now
    const withdrawalFlag = `WITHDRAWN_${withdrawalTxId}`;

    // Get suggested parameters
    const suggestedParams = await algodClient.getTransactionParams().do();

    // Create application call transaction to mark as withdrawn
    const appCallTxn = algosdk.makeApplicationNoOpTxnFromObject({
      from: account.addr,
      suggestedParams,
      appIndex: appId,
      appArgs: [
        new TextEncoder().encode(uniqueCode),
        new TextEncoder().encode(withdrawalFlag),
      ],
    });

    // Sign and send transaction
    const signedTxn = appCallTxn.signTxn(account.sk);
    const result = await algodClient.sendRawTransaction(signedTxn).do();

    // Wait for confirmation
    await algosdk.waitForConfirmation(algodClient, result.txId, 4);

    console.log(`✅ Withdrawal status updated on blockchain: ${result.txId}`);
  } catch (error) {
    console.error("❌ Error marking as withdrawn on blockchain:", error);
    throw error;
  }
}

// Withdraw amount to destination wallet
async function withdrawToWallet(
  uniqueCode: string,
  destinationAddress: string
): Promise<void> {
  try {
    // Validate environment variables
    const requiredEnvVars = ["ALGOD_BASE_URL", "SERVER_MNEMONIC"];
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        throw new Error(`Missing required environment variable: ${envVar}`);
      }
    }

    console.log(`💰 Processing withdrawal request...\n`);

    // Validate destination address
    if (!isValidAlgorandAddress(destinationAddress)) {
      throw new Error("Invalid Algorand destination address");
    }

    // Verify unique code and get amount from blockchain
    const verification = await verifyAndDecodeUniqueCode(uniqueCode);
    if (!verification.valid) {
      throw new Error(verification.message);
    }

    const amount = verification.amount;
    console.log(verification.message);
    console.log(`🎯 Destination: ${destinationAddress}\n`);

    // Initialize Algod client
    const algodToken = "";
    const algodServer = process.env.ALGOD_BASE_URL!;
    const algodPort = 443;
    const algodClient = new algosdk.Algodv2(algodToken, algodServer, algodPort);

    // Get account from mnemonic
    const account = algosdk.mnemonicToSecretKey(process.env.SERVER_MNEMONIC!);

    console.log(`📋 Withdrawal Details:`);
    console.log(`   From: ${account.addr}`);
    console.log(`   To: ${destinationAddress}`);
    console.log(`   Amount: ${amount} ALGO`);
    console.log(`   Unique Code: ${uniqueCode}\n`);

    // Check sender balance
    const senderInfo = await algodClient.accountInformation(account.addr).do();
    const senderBalance = senderInfo.amount / 1e6;
    console.log(`💰 Sender balance: ${senderBalance} ALGO`);

    if (senderBalance < amount + 0.1) {
      throw new Error(
        `Insufficient balance. Need at least ${
          amount + 0.1
        } ALGO (${amount} for withdrawal + 0.1 for fees)`
      );
    }

    // Get suggested parameters
    const suggestedParams = await algodClient.getTransactionParams().do();

    // Create payment transaction
    const withdrawalAmount = amount * 1e6; // Convert ALGO to microALGO
    const paymentTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      from: account.addr,
      to: destinationAddress,
      amount: withdrawalAmount,
      suggestedParams,
      note: new TextEncoder().encode(`Withdrawal using code: ${uniqueCode}`),
    });

    // Sign and send transaction
    const signedTxn = paymentTxn.signTxn(account.sk);
    const txId = paymentTxn.txID().toString();

    console.log(`📤 Sending withdrawal transaction: ${txId}`);
    const result = await algodClient.sendRawTransaction(signedTxn).do();
    console.log(`✅ Transaction sent: ${result.txId}\n`);

    // Wait for confirmation
    console.log("⏳ Waiting for confirmation...");
    const confirmedTxn = await algosdk.waitForConfirmation(
      algodClient,
      result.txId,
      4
    );
    console.log("🎉 Withdrawal confirmed!\n");

    // Mark unique code as withdrawn on blockchain
    await markAsWithdrawnOnBlockchain(uniqueCode, result.txId);

    console.log(`📋 Withdrawal Details:`);
    console.log(`   Transaction ID: ${result.txId}`);
    console.log(`   Confirmed Round: ${confirmedTxn["confirmed-round"]}`);
    console.log(`   Amount: ${amount} ALGO`);
    console.log(`   Unique Code: ${uniqueCode}`);
    console.log(`   Destination: ${destinationAddress}\n`);

    console.log(`🔗 Explorer Links:`);
    console.log(
      `   Transaction: https://testnet.algoexplorer.io/tx/${result.txId}`
    );
    console.log(
      `   Destination: https://testnet.algoexplorer.io/address/${destinationAddress}\n`
    );

    console.log("✅ Withdrawal completed successfully!");
    console.log(`   ${amount} ALGO sent to ${destinationAddress}`);
    console.log(`   Unique code ${uniqueCode} has been marked as withdrawn\n`);
  } catch (error) {
    console.error("❌ Error processing withdrawal:", error);
    process.exit(1);
  }
}

// View withdrawal history from blockchain
async function viewWithdrawalHistory(): Promise<void> {
  try {
    console.log("📊 Viewing withdrawal history from blockchain...\n");

    // Validate environment variables
    const requiredEnvVars = ["ALGOD_BASE_URL", "SERVER_MNEMONIC", "APP_ID"];
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        throw new Error(`Missing required environment variable: ${envVar}`);
      }
    }

    // Initialize Algod client
    const algodToken = "";
    const algodServer = process.env.ALGOD_BASE_URL!;
    const algodPort = 443;
    const algodClient = new algosdk.Algodv2(algodToken, algodServer, algodPort);

    const appId = parseInt(process.env.APP_ID!);

    // Get application information
    const appInfo = await algodClient.getApplicationByID(appId).do();

    if (!appInfo.params["global-state"]) {
      console.log("📭 No withdrawals found.");
      return;
    }

    const withdrawnCodes: Array<{ code: string; txId: string }> = [];

    // Parse global state to find withdrawn codes
    for (const kv of appInfo.params["global-state"]) {
      const key = Buffer.from(kv.key, "base64").toString();
      const value = Buffer.from(kv.value.bytes || "", "base64").toString();

      // Check if this is a withdrawal flag (starts with "WITHDRAWN_")
      if (value.startsWith("WITHDRAWN_")) {
        const txId = value.replace("WITHDRAWN_", "");
        withdrawnCodes.push({ code: key, txId: txId });
      }
    }

    if (withdrawnCodes.length === 0) {
      console.log("📭 No withdrawals found.");
      console.log(
        "   Use: npm run withdraw <unique_code> <destination_address> to make your first withdrawal.\n"
      );
      return;
    }

    console.log("💰 Withdrawal History:");
    console.log("=".repeat(60));

    withdrawnCodes.forEach((item, index) => {
      console.log(`${index + 1}. WITHDRAWAL`);
      console.log(`   Unique Code: ${item.code}`);
      console.log(`   Transaction ID: ${item.txId}`);
      console.log(
        `   Explorer: https://testnet.algoexplorer.io/tx/${item.txId}`
      );
      console.log("");
    });

    console.log("📈 Summary:");
    console.log(`   Total Withdrawals: ${withdrawnCodes.length}\n`);
  } catch (error) {
    console.error("❌ Error viewing withdrawal history:", error);
    process.exit(1);
  }
}

// Main function to handle command line arguments
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log("💸 Withdrawal Script");
    console.log("=".repeat(25));
    console.log("");
    console.log("Usage:");
    console.log(
      "  npm run withdraw <unique_code> <destination_address>  - Withdraw using unique code"
    );
    console.log(
      "  npm run withdraw history                                - View withdrawal history"
    );
    console.log("");
    console.log("Examples:");
    console.log(
      "  npm run withdraw ABC123XYZ789 53FIEZ4Z5YUX67HYKTEXNOD4FFAK542RZZJ47H4YNDUBJWUK5FUA44GONY"
    );
    console.log(
      "  npm run withdraw UZD598EM02J4 7ZUECA7HFLZTXENRV24SHLU4AVPUTMTTDUFUBNBD64C73F3UHRTHAIOF6Q"
    );
    console.log("  npm run withdraw history");
    console.log("");
    return;
  }

  const firstArg = args[0].toLowerCase();

  // Check if first argument is "history"
  if (firstArg === "history") {
    await viewWithdrawalHistory();
    return;
  }

  // Otherwise, treat as withdrawal command
  if (args.length < 2) {
    console.log("❌ Please provide both unique code and destination address");
    console.log("Usage: npm run withdraw <unique_code> <destination_address>");
    return;
  }

  const uniqueCode = args[0];
  const destinationAddress = args[1];

  await withdrawToWallet(uniqueCode, destinationAddress);
}

// Test function with hardcoded values
async function testWithdrawal(): Promise<void> {
  // Hardcoded test values - change these as needed
  const testUniqueCode = "CELPEU1I0Q4I"; // Your existing unique code
  const testDestinationAddress =
    "XUXGCWYRGLV7KPQQAGKIMDWGVVUHAQI5TBHXBMODGDRONVMYP5DXF5WMEY"; // Your address

  console.log("🧪 Running test withdrawal with hardcoded values...\n");
  console.log(`Test Unique Code: ${testUniqueCode}`);
  console.log(`Test Destination: ${testDestinationAddress}\n`);

  await withdrawToWallet(testUniqueCode, testDestinationAddress);
}

// Run the script
if (process.argv.includes("--test")) {
  testWithdrawal();
} else {
  main();
}
