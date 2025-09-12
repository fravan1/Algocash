import algosdk from "algosdk";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";
import { sendFromLiquidityPool, autoReplenishIfNeeded } from "./liquidity_pool";

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

          // Check if it's used (value is "USED")
          if (value === "USED") {
            return {
              amount: 0,
              valid: false,
              message: "❌ This unique code has already been used",
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
  destinationAddress: string,
  amount: number
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

    // Mark as used in the smart contract
    const usedFlag = "USED";

    // Get suggested parameters
    const suggestedParams = await algodClient.getTransactionParams().do();

    // Create application call transaction to mark as used
    const appCallTxn = algosdk.makeApplicationNoOpTxnFromObject({
      from: account.addr,
      suggestedParams,
      appIndex: appId,
      appArgs: [
        new TextEncoder().encode(uniqueCode),
        new TextEncoder().encode(destinationAddress),
        algosdk.encodeUint64(amount * 1e6), // amount in microALGO
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

// Withdraw amount to destination wallet using liquidity pool
async function withdrawToWallet(
  uniqueCode: string,
  destinationAddress: string
): Promise<void> {
  try {
    // Validate environment variables
    const requiredEnvVars = ["ALGOD_BASE_URL", "SERVER_MNEMONIC", "APP_ID"];
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        throw new Error(`Missing required environment variable: ${envVar}`);
      }
    }

    console.log(`💰 Processing withdrawal request using liquidity pool...\n`);

    // Get amount from unique code
    const verification = await verifyAndDecodeUniqueCode(uniqueCode);
    if (!verification.valid) {
      throw new Error(verification.message);
    }

    const amount = verification.amount;
    console.log(`✅ Unique code: ${uniqueCode}`);
    console.log(`💰 Amount: ${amount} ALGO`);
    console.log(`🎯 Destination: ${destinationAddress}\n`);

    // Initialize Algod client
    const algodToken = "";
    const algodServer = process.env.ALGOD_BASE_URL!;
    const algodPort = 443;
    const algodClient = new algosdk.Algodv2(algodToken, algodServer, algodPort);

    // Get account from mnemonic
    const account = algosdk.mnemonicToSecretKey(process.env.SERVER_MNEMONIC!);

    console.log(`📋 Withdrawal Details:`);
    console.log(`   From: Liquidity Pool`);
    console.log(`   To: ${destinationAddress}`);
    console.log(`   Amount: ${amount} ALGO`);
    console.log(`   Unique Code: ${uniqueCode}\n`);

    // Step 1: Send ALGO from liquidity pool to destination
    console.log("🏦 Step 1: Sending ALGO from liquidity pool...");
    const liquidityTxId = await sendFromLiquidityPool(
      destinationAddress,
      amount
    );
    console.log(`✅ Liquidity pool transaction: ${liquidityTxId}\n`);

    // Step 2: Mark as withdrawn in contract
    console.log("📝 Step 2: Marking as withdrawn in contract...");
    await markAsWithdrawnOnBlockchain(uniqueCode, destinationAddress, amount);
    console.log("🎉 Withdrawal completed!\n");

    // Step 3: Auto-replenish liquidity pool if needed
    console.log("🔄 Step 3: Checking liquidity pool balance...");
    await autoReplenishIfNeeded();

    console.log(`📋 Withdrawal Summary:`);
    console.log(`   Liquidity Pool TX: ${liquidityTxId}`);
    console.log(`   Amount: ${amount} ALGO`);
    console.log(`   Unique Code: ${uniqueCode}`);
    console.log(`   Destination: ${destinationAddress}\n`);

    console.log(`🔗 Explorer Links:`);
    console.log(
      `   Liquidity TX: https://testnet.algoexplorer.io/tx/${liquidityTxId}`
    );
    console.log(
      `   Destination: https://testnet.algoexplorer.io/address/${destinationAddress}\n`
    );

    console.log("✅ Withdrawal completed successfully!");
    console.log(
      `   ${amount} ALGO sent to ${destinationAddress} from liquidity pool`
    );
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

      // Check if this is a used code (value is "USED")
      if (value === "USED") {
        withdrawnCodes.push({ code: key, txId: "Used" });
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
