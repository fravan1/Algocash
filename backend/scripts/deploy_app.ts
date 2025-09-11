import algosdk from "algosdk";

import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

// Explicitly resolve the .env path relative to where you run the script
const envPath = path.resolve(process.cwd(), ".env");

// Debug: print CWD and check file existence
console.log("Running from CWD:", process.cwd());
console.log(".env path resolved to:", envPath);
console.log(".env exists?:", fs.existsSync(envPath));

dotenv.config({ path: envPath });

// Debug: show loaded values
console.log("ALGOD_BASE_URL:", process.env.ALGOD_BASE_URL);
console.log(
  "SERVER_MNEMONIC:",
  !!process.env.SERVER_MNEMONIC ? "[present]" : "[missing]"
);
console.log("APP_ID:", process.env.APP_ID ?? "[missing]");

/**
 * Deploy the Algorand stateful smart contract to TestNet
 * This script compiles the TEAL programs and creates the application
 */
async function deployApp() {
  try {
    // Validate environment variables
    const requiredEnvVars = ["ALGOD_BASE_URL", "SERVER_MNEMONIC"];
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        throw new Error(`Missing required environment variable: ${envVar}`);
      }
    }

    console.log("🚀 Starting application deployment...\n");

    // Initialize Algod client (AlgoNode doesn't require API key)
    const algodToken = ""; // AlgoNode doesn't require an API key
    const algodServer = process.env.ALGOD_BASE_URL!;
    const algodPort = 443;

    const algodClient = new algosdk.Algodv2(algodToken, algodServer, algodPort);

    // Get account from mnemonic
    const account = algosdk.mnemonicToSecretKey(process.env.SERVER_MNEMONIC!);
    console.log(`📋 Deploying from account: ${account.addr}\n`);

    // Check account balance
    const accountInfo = await algodClient.accountInformation(account.addr).do();
    const balance = accountInfo.amount / 1e6; // Convert from microALGO to ALGO
    console.log(`💰 Account balance: ${balance} ALGO\n`);

    if (balance < 0.1) {
      console.log(
        "⚠️  Warning: Low account balance. You may need more ALGO for deployment.\n"
      );
    }

    // Read and compile TEAL programs
    console.log("📝 Compiling TEAL programs...");

    const approvalProgramPath = path.join(
      __dirname,
      "../contracts/approval.teal"
    );
    const clearProgramPath = path.join(__dirname, "../contracts/clear.teal");

    const approvalProgramSource = fs.readFileSync(approvalProgramPath, "utf8");
    const clearProgramSource = fs.readFileSync(clearProgramPath, "utf8");

    const approvalProgram = await algodClient
      .compile(approvalProgramSource)
      .do();
    const clearProgram = await algodClient.compile(clearProgramSource).do();

    console.log("✅ TEAL programs compiled successfully\n");

    // Get suggested parameters
    const suggestedParams = await algodClient.getTransactionParams().do();

    // Create application creation transaction
    console.log("📦 Creating application...");

    const appCreateTxn = algosdk.makeApplicationCreateTxnFromObject({
      from: account.addr,
      suggestedParams,
      onComplete: algosdk.OnApplicationComplete.NoOpOC,
      approvalProgram: new Uint8Array(
        Buffer.from(approvalProgram.result, "base64")
      ),
      clearProgram: new Uint8Array(Buffer.from(clearProgram.result, "base64")),
      numGlobalByteSlices: 0,
      numGlobalInts: 0,
      numLocalByteSlices: 0,
      numLocalInts: 2, // User balance and used amount
    });

    // Sign and send transaction
    const signedTxn = appCreateTxn.signTxn(account.sk);
    const txId = appCreateTxn.txID().toString();

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

    const appId = confirmedTxn["application-index"];
    const appAddress = algosdk.getApplicationAddress(appId);

    console.log("🎉 Application deployed successfully!\n");
    console.log("📋 Deployment Details:");
    console.log(`   APP_ID: ${appId}`);
    console.log(`   Application Address: ${appAddress}`);
    console.log(`   Transaction ID: ${result.txId}`);
    console.log(`   Confirmed Round: ${confirmedTxn["confirmed-round"]}\n`);

    console.log("🔗 Explorer Links:");
    console.log(
      `   Transaction: https://testnet.algoexplorer.io/tx/${result.txId}`
    );
    console.log(
      `   Application: https://testnet.algoexplorer.io/address/${appAddress}\n`
    );

    console.log("📝 Next Steps:");
    console.log("   1. Add the APP_ID to your .env file:");
    console.log(`      APP_ID=${appId}`);
    console.log(
      "   2. Run the deposit script to test payments to the app address\n"
    );
  } catch (error) {
    console.error("❌ Error deploying application:", error);
    process.exit(1);
  }
}

// Run the script
deployApp();
