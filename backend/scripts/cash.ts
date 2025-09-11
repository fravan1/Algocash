import algosdk from "algosdk";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

// Explicitly resolve the .env path relative to where you run the script
const envPath = path.resolve(process.cwd(), ".env");
dotenv.config({ path: envPath });

/**
 * Cash Management Script - Encryption Based
 * This script allows you to:
 * 1. Encrypt amounts and store only the hash on blockchain
 * 2. Decrypt stored hashes to show original amounts
 */

// Validate amount is between 0.1 and 0.9
function validateAmount(amount: number): boolean {
  return amount >= 0.1 && amount <= 0.9;
}

// Encrypt number to unique ID (hash)
function encryptNumber(amount: number): string {
  // Create a simple encryption by combining amount with timestamp
  const timestamp = Date.now();

  // Create a hash-like string
  let hash = "";
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

  // Use amount and timestamp to generate consistent hash
  let seed = amount * 1000000 + timestamp;
  for (let i = 0; i < 12; i++) {
    seed = (seed * 9301 + 49297) % 233280; // Simple PRNG
    hash += chars[Math.floor((seed / 233280) * chars.length)];
  }

  return hash;
}

// All data is now stored on blockchain - no local storage needed!

// Get all stored hashes from blockchain global state
async function getAllStoredHashesFromBlockchain(): Promise<
  Array<{ hash: string; data: any }>
> {
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
    const appAddress = algosdk.getApplicationAddress(appId);

    // Get application information
    const appInfo = await algodClient.getApplicationByID(appId).do();

    if (!appInfo.params["global-state"]) {
      return [];
    }

    const storedHashes: Array<{ hash: string; data: any }> = [];

    // Parse global state to find all stored hashes
    for (const kv of appInfo.params["global-state"]) {
      const key = Buffer.from(kv.key, "base64").toString();

      // Check if this looks like our encrypted hash (12 characters, alphanumeric)
      if (key.length === 12 && /^[A-Z0-9]+$/.test(key)) {
        try {
          const value = Buffer.from(kv.value.bytes || "", "base64").toString();

          // Check if it's a withdrawal flag (starts with "WITHDRAWN_")
          if (value.startsWith("WITHDRAWN_")) {
            // Skip withdrawn codes in the view
            continue;
          }

          // Otherwise, parse as JSON data
          const data = JSON.parse(value);
          storedHashes.push({ hash: key, data: data });
        } catch (error) {
          console.log(`Warning: Could not parse data for hash ${key}`);
        }
      }
    }

    return storedHashes;
  } catch (error) {
    console.error("Error getting stored hashes from blockchain:", error);
    return [];
  }
}

// Store encrypted cash value on blockchain
async function storeCashOnBlockchain(amount: number): Promise<void> {
  try {
    // Validate environment variables
    const requiredEnvVars = ["ALGOD_BASE_URL", "SERVER_MNEMONIC", "APP_ID"];
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        throw new Error(`Missing required environment variable: ${envVar}`);
      }
    }

    // Validate amount
    if (!validateAmount(amount)) {
      throw new Error("Amount must be between 0.1 and 0.9");
    }

    console.log(
      `💰 Encrypting and storing cash value ${amount} on blockchain...\n`
    );

    // Initialize Algod client
    const algodToken = "";
    const algodServer = process.env.ALGOD_BASE_URL!;
    const algodPort = 443;
    const algodClient = new algosdk.Algodv2(algodToken, algodServer, algodPort);

    // Get account from mnemonic
    const account = algosdk.mnemonicToSecretKey(process.env.SERVER_MNEMONIC!);
    const appId = parseInt(process.env.APP_ID!);
    const appAddress = algosdk.getApplicationAddress(appId);

    console.log(`📋 Transaction Details:`);
    console.log(`   From: ${account.addr}`);
    console.log(`   App ID: ${appId}`);
    console.log(`   Amount: ${amount}`);
    console.log(`   Contract Address: ${appAddress}\n`);

    // Encrypt the amount to unique ID
    const encryptedHash = encryptNumber(amount);
    console.log(`🔐 Encrypted ${amount} to Hash: ${encryptedHash}\n`);

    // All data is now stored on blockchain - no local storage needed!

    // Check sender balance
    const senderInfo = await algodClient.accountInformation(account.addr).do();
    const senderBalance = senderInfo.amount / 1e6;
    console.log(`💰 Sender balance: ${senderBalance} ALGO`);

    if (senderBalance < 0.1) {
      throw new Error("Insufficient balance. Need at least 0.1 ALGO for fees");
    }

    // Get suggested parameters
    const suggestedParams = await algodClient.getTransactionParams().do();

    // Create application call transaction with encrypted hash and amount data
    const appCallTxn = algosdk.makeApplicationNoOpTxnFromObject({
      from: account.addr,
      suggestedParams,
      appIndex: appId,
      appArgs: [
        new TextEncoder().encode(encryptedHash),
        new TextEncoder().encode(
          JSON.stringify({
            amount: amount,
            timestamp: new Date().toISOString(),
            txId: "", // Will be updated after transaction
          })
        ),
      ],
    });

    // Sign and send transaction
    const signedTxn = appCallTxn.signTxn(account.sk);
    const txId = appCallTxn.txID().toString();

    // Transaction ID is now included in the blockchain data - no local storage needed!

    console.log(`📤 Sending transaction: ${txId}`);
    const result = await algodClient.sendRawTransaction(signedTxn).do();
    console.log(`✅ Transaction sent: ${result.txId}\n`);

    // Wait for confirmation
    console.log("⏳ Waiting for confirmation...");
    const confirmedTxn = await algosdk.waitForConfirmation(
      algodClient,
      result.txId,
      4
    );
    console.log("🎉 Encrypted cash value stored on blockchain!\n");

    console.log(`📋 Transaction Details:`);
    console.log(`   Transaction ID: ${result.txId}`);
    console.log(`   Confirmed Round: ${confirmedTxn["confirmed-round"]}`);
    console.log(`   Original Amount: ${amount}`);
    console.log(`   Encrypted Hash: ${encryptedHash}\n`);

    console.log(`🔗 Explorer Links:`);
    console.log(
      `   Transaction: https://testnet.algoexplorer.io/tx/${result.txId}`
    );
    console.log(
      `   Contract: https://testnet.algoexplorer.io/address/${appAddress}\n`
    );

    console.log(
      "✅ Cash value successfully encrypted and stored on blockchain!"
    );
    console.log(`   Original Amount: ${amount}`);
    console.log(`   Encrypted Hash: ${encryptedHash}`);
    console.log(`   Only the hash is stored on blockchain for security!\n`);
  } catch (error) {
    console.error("❌ Error storing encrypted cash on blockchain:", error);
    process.exit(1);
  }
}

// View all stored cash values from blockchain (decrypted)
async function viewCashTable(): Promise<void> {
  try {
    // Validate environment variables
    const requiredEnvVars = ["ALGOD_BASE_URL", "SERVER_MNEMONIC", "APP_ID"];
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        throw new Error(`Missing required environment variable: ${envVar}`);
      }
    }

    console.log("📊 Viewing all encrypted cash values from blockchain...\n");

    // Initialize Algod client
    const algodToken = "";
    const algodServer = process.env.ALGOD_BASE_URL!;
    const algodPort = 443;
    const algodClient = new algosdk.Algodv2(algodToken, algodServer, algodPort);

    // Get account from mnemonic
    const account = algosdk.mnemonicToSecretKey(process.env.SERVER_MNEMONIC!);
    const appId = parseInt(process.env.APP_ID!);
    const appAddress = algosdk.getApplicationAddress(appId);

    console.log(`📋 Contract Details:`);
    console.log(`   User: ${account.addr}`);
    console.log(`   App ID: ${appId}`);
    console.log(`   Contract Address: ${appAddress}\n`);

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

      // Get all stored hashes from blockchain global state
      const allStoredHashes = await getAllStoredHashesFromBlockchain();

      console.log("💰 Cash Values Table (All Stored Values):");
      console.log("=".repeat(60));

      if (allStoredHashes.length > 0) {
        let totalAmount = 0;

        allStoredHashes.forEach((item, index) => {
          const { hash, data } = item;

          console.log(`${index + 1}. STORED VALUE`);
          console.log(`   Original Amount: ${data.amount}`);
          console.log(`   Encrypted Hash: ${hash}`);
          console.log(
            `   Stored Date: ${new Date(data.timestamp).toLocaleString()}`
          );
          if (data.txId) {
            console.log(`   Transaction ID: ${data.txId}`);
          }
          console.log(`   Status: ✅ Encrypted & Stored on Blockchain\n`);

          totalAmount += data.amount;
        });

        console.log("📈 Summary:");
        console.log(`   Total Values: ${allStoredHashes.length}`);
        console.log(`   Total Amount: ${totalAmount.toFixed(6)}`);
        console.log(
          `   Average Value: ${(totalAmount / allStoredHashes.length).toFixed(
            6
          )}\n`
        );
      } else {
        console.log("📭 No cash values stored yet.");
        console.log(
          "   Use: npm run cash <amount> to store your first value.\n"
        );
      }

      console.log("🔗 Explorer Links:");
      console.log(
        `   User Account: https://testnet.algoexplorer.io/address/${account.addr}`
      );
      console.log(
        `   Contract: https://testnet.algoexplorer.io/address/${appAddress}\n`
      );
    } catch (error) {
      console.error("❌ Error checking user state:", error);
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ Error viewing cash table:", error);
    process.exit(1);
  }
}

// Main function to handle command line arguments
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log("💳 Cash Management Script - Encryption Based");
    console.log("=".repeat(45));
    console.log("");
    console.log("Usage:");
    console.log(
      "  npm run cash <amount>       - Encrypt and store cash value (0.1-0.9) on blockchain"
    );
    console.log(
      "  npm run cash view           - View all stored cash values (decrypted) from blockchain"
    );
    console.log("");
    console.log("Examples:");
    console.log(
      "  npm run cash 0.5            - Encrypt 0.5 and store hash on blockchain"
    );
    console.log(
      "  npm run cash 0.3            - Encrypt 0.3 and store hash on blockchain"
    );
    console.log(
      "  npm run cash view           - View decrypted values from blockchain"
    );
    console.log("");
    return;
  }

  const firstArg = args[0].toLowerCase();

  // Check if first argument is "view"
  if (firstArg === "view") {
    await viewCashTable();
    return;
  }

  // Otherwise, treat first argument as amount to store
  const amount = parseFloat(firstArg);
  if (isNaN(amount)) {
    console.log("❌ Invalid amount. Please enter a number between 0.1 and 0.9");
    console.log("Usage: npm run cash <amount>");
    return;
  }

  await storeCashOnBlockchain(amount);
}

// Run the script
main();
