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

// Store mapping locally for decryption
const ENCRYPTION_MAP_FILE = path.join(__dirname, "../encryption_map.json");

// Load encryption mapping
function loadEncryptionMap(): Record<
  string,
  { amount: number; timestamp: string; txId?: string }
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
  map: Record<string, { amount: number; timestamp: string; txId?: string }>
): void {
  fs.writeFileSync(ENCRYPTION_MAP_FILE, JSON.stringify(map, null, 2));
}

// Get all stored hashes from blockchain (we'll need to track them differently)
function getAllStoredHashes(): string[] {
  // For now, we'll get all hashes from our local mapping
  // In a real system, you'd query the blockchain for all transactions
  const encryptionMap = loadEncryptionMap();
  return Object.keys(encryptionMap);
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

    // Store mapping for decryption (we'll add txId after transaction is created)
    const encryptionMap = loadEncryptionMap();
    encryptionMap[encryptedHash] = {
      amount: amount,
      timestamp: new Date().toISOString(),
    };
    saveEncryptionMap(encryptionMap);

    // Check sender balance
    const senderInfo = await algodClient.accountInformation(account.addr).do();
    const senderBalance = senderInfo.amount / 1e6;
    console.log(`💰 Sender balance: ${senderBalance} ALGO`);

    if (senderBalance < 0.1) {
      throw new Error("Insufficient balance. Need at least 0.1 ALGO for fees");
    }

    // Get suggested parameters
    const suggestedParams = await algodClient.getTransactionParams().do();

    // Create application call transaction with only the encrypted hash
    const appCallTxn = algosdk.makeApplicationNoOpTxnFromObject({
      from: account.addr,
      suggestedParams,
      appIndex: appId,
      appArgs: [new TextEncoder().encode(encryptedHash)],
    });

    // Sign and send transaction
    const signedTxn = appCallTxn.signTxn(account.sk);
    const txId = appCallTxn.txID().toString();

    // Update encryption map with transaction ID
    encryptionMap[encryptedHash].txId = txId;
    saveEncryptionMap(encryptionMap);

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

      // Get all stored hashes from our local mapping
      const allHashes = getAllStoredHashes();
      const encryptionMap = loadEncryptionMap();

      console.log("💰 Cash Values Table (All Stored Values):");
      console.log("=".repeat(60));

      if (allHashes.length > 0) {
        let totalAmount = 0;

        allHashes.forEach((hash, index) => {
          const decryptedData = encryptionMap[hash];

          if (decryptedData) {
            console.log(`${index + 1}. STORED VALUE`);
            console.log(`   Original Amount: ${decryptedData.amount}`);
            console.log(`   Encrypted Hash: ${hash}`);
            console.log(
              `   Stored Date: ${new Date(
                decryptedData.timestamp
              ).toLocaleString()}`
            );
            if (decryptedData.txId) {
              console.log(`   Transaction ID: ${decryptedData.txId}`);
            }
            console.log(`   Status: ✅ Encrypted & Stored on Blockchain\n`);

            totalAmount += decryptedData.amount;
          } else {
            console.log(`${index + 1}. STORED VALUE`);
            console.log(`   Encrypted Hash: ${hash}`);
            console.log(
              `   Status: ⚠️  Hash found but decryption data missing\n`
            );
          }
        });

        console.log("📈 Summary:");
        console.log(`   Total Values: ${allHashes.length}`);
        console.log(`   Total Amount: ${totalAmount.toFixed(6)}`);
        console.log(
          `   Average Value: ${(totalAmount / allHashes.length).toFixed(6)}\n`
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
