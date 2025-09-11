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

// Load encryption mapping
const ENCRYPTION_MAP_FILE = path.join(__dirname, "../encryption_map.json");

function loadEncryptionMap(): Record<
  string,
  {
    amount: number;
    timestamp: string;
    txId?: string;
    withdrawn?: boolean;
    withdrawalTxId?: string;
    withdrawalTimestamp?: string;
  }
> {
  try {
    if (fs.existsSync(ENCRYPTION_MAP_FILE)) {
      const data = fs.readFileSync(ENCRYPTION_MAP_FILE, "utf8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.log("Creating new encryption map file...");
  }
  return {};
}

// Save encryption mapping
function saveEncryptionMap(
  map: Record<
    string,
    {
      amount: number;
      timestamp: string;
      txId?: string;
      withdrawn?: boolean;
      withdrawalTxId?: string;
      withdrawalTimestamp?: string;
    }
  >
): void {
  fs.writeFileSync(ENCRYPTION_MAP_FILE, JSON.stringify(map, null, 2));
}

// Validate Algorand address
function isValidAlgorandAddress(address: string): boolean {
  try {
    algosdk.decodeAddress(address);
    return true;
  } catch (error) {
    return false;
  }
}

// Verify unique code and get amount
function verifyAndDecodeUniqueCode(uniqueCode: string): {
  amount: number;
  valid: boolean;
  message: string;
} {
  const encryptionMap = loadEncryptionMap();
  const decryptedData = encryptionMap[uniqueCode];

  if (!decryptedData) {
    return {
      amount: 0,
      valid: false,
      message: "❌ Unique code not found in our records",
    };
  }

  if (decryptedData.withdrawn) {
    return {
      amount: 0,
      valid: false,
      message: "❌ This unique code has already been withdrawn",
    };
  }

  return {
    amount: decryptedData.amount,
    valid: true,
    message: `✅ Unique code verified. Amount: ${decryptedData.amount} ALGO`,
  };
}

// Mark unique code as withdrawn
function markAsWithdrawn(uniqueCode: string, withdrawalTxId: string): void {
  const encryptionMap = loadEncryptionMap();
  if (encryptionMap[uniqueCode]) {
    encryptionMap[uniqueCode].withdrawn = true;
    encryptionMap[uniqueCode].withdrawalTxId = withdrawalTxId;
    encryptionMap[uniqueCode].withdrawalTimestamp = new Date().toISOString();
    saveEncryptionMap(encryptionMap);
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

    // Verify unique code and get amount
    const verification = verifyAndDecodeUniqueCode(uniqueCode);
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

    // Mark unique code as withdrawn
    markAsWithdrawn(uniqueCode, result.txId);

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

// View withdrawal history
async function viewWithdrawalHistory(): Promise<void> {
  try {
    console.log("📊 Viewing withdrawal history...\n");

    const encryptionMap = loadEncryptionMap();
    const withdrawnCodes = Object.entries(encryptionMap).filter(
      ([_, data]) => data.withdrawn
    );

    if (withdrawnCodes.length === 0) {
      console.log("📭 No withdrawals found.");
      console.log(
        "   Use: npm run withdraw <unique_code> <destination_address> to make your first withdrawal.\n"
      );
      return;
    }

    console.log("💰 Withdrawal History:");
    console.log("=".repeat(60));

    let totalWithdrawn = 0;
    withdrawnCodes.forEach(([uniqueCode, data], index) => {
      console.log(`${index + 1}. WITHDRAWAL`);
      console.log(`   Amount: ${data.amount} ALGO`);
      console.log(`   Unique Code: ${uniqueCode}`);
      console.log(
        `   Withdrawal Date: ${new Date(
          data.withdrawalTimestamp || ""
        ).toLocaleString()}`
      );
      if (data.withdrawalTxId) {
        console.log(`   Transaction ID: ${data.withdrawalTxId}`);
        console.log(
          `   Explorer: https://testnet.algoexplorer.io/tx/${data.withdrawalTxId}`
        );
      }
      console.log("");

      totalWithdrawn += data.amount;
    });

    console.log("📈 Summary:");
    console.log(`   Total Withdrawals: ${withdrawnCodes.length}`);
    console.log(`   Total Amount Withdrawn: ${totalWithdrawn.toFixed(6)} ALGO`);
    console.log(
      `   Average Withdrawal: ${(
        totalWithdrawn / withdrawnCodes.length
      ).toFixed(6)} ALGO\n`
    );
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
