import algosdk from "algosdk";
import * as dotenv from "dotenv";
import * as path from "path";

// Explicitly resolve the .env path relative to where you run the script
const envPath = path.resolve(process.cwd(), ".env");
dotenv.config({ path: envPath });

/**
 * Liquidity Pool Management Script
 * This script manages the liquidity pool wallet for withdrawals
 */

// Liquidity pool wallet configuration
const LIQUIDITY_POOL_MNEMONIC =
  process.env.SERVER_MNEMONIC || "liquidity pool mnemonic here";
const MIN_LIQUIDITY_THRESHOLD = 5.0; // Minimum ALGO to keep in liquidity pool

// Get liquidity pool account
function getLiquidityPoolAccount(): algosdk.Account {
  return algosdk.mnemonicToSecretKey(LIQUIDITY_POOL_MNEMONIC);
}

// Check liquidity pool balance
async function checkLiquidityPoolBalance(): Promise<number> {
  try {
    const algodToken = "";
    const algodServer = process.env.ALGOD_BASE_URL!;
    const algodPort = 443;
    const algodClient = new algosdk.Algodv2(algodToken, algodServer, algodPort);

    const liquidityAccount = getLiquidityPoolAccount();
    const accountInfo = await algodClient
      .accountInformation(liquidityAccount.addr)
      .do();

    return accountInfo.amount / 1e6; // Convert from microALGO to ALGO
  } catch (error) {
    console.error("Error checking liquidity pool balance:", error);
    throw error;
  }
}

// Send ALGO from liquidity pool to destination
async function sendFromLiquidityPool(
  destinationAddress: string,
  amount: number
): Promise<string> {
  try {
    const algodToken = "";
    const algodServer = process.env.ALGOD_BASE_URL!;
    const algodPort = 443;
    const algodClient = new algosdk.Algodv2(algodToken, algodServer, algodPort);

    const liquidityAccount = getLiquidityPoolAccount();

    // Check liquidity pool balance
    const currentBalance = await checkLiquidityPoolBalance();
    if (currentBalance < amount + 0.1) {
      throw new Error(
        `Insufficient liquidity. Pool has ${currentBalance} ALGO, need ${
          amount + 0.1
        } ALGO`
      );
    }

    // Get suggested parameters
    const suggestedParams = await algodClient.getTransactionParams().do();

    // Create payment transaction
    const paymentAmount = amount * 1e6; // Convert ALGO to microALGO
    const paymentTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      from: liquidityAccount.addr,
      to: destinationAddress,
      amount: paymentAmount,
      suggestedParams,
      note: new TextEncoder().encode("Withdrawal from liquidity pool"),
    });

    // Sign and send transaction
    const signedTxn = paymentTxn.signTxn(liquidityAccount.sk);
    const txId = paymentTxn.txID().toString();

    console.log(
      `📤 Sending ${amount} ALGO from liquidity pool to ${destinationAddress}`
    );
    const result = await algodClient.sendRawTransaction(signedTxn).do();
    console.log(`✅ Transaction sent: ${result.txId}`);

    // Wait for confirmation
    await algosdk.waitForConfirmation(algodClient, result.txId, 4);
    console.log("🎉 Withdrawal from liquidity pool confirmed!");

    return result.txId;
  } catch (error) {
    console.error("Error sending from liquidity pool:", error);
    throw error;
  }
}

// Replenish liquidity pool from contract
async function replenishLiquidityPool(amount: number): Promise<string> {
  try {
    const algodToken = "";
    const algodServer = process.env.ALGOD_BASE_URL!;
    const algodPort = 443;
    const algodClient = new algosdk.Algodv2(algodToken, algodServer, algodPort);

    const liquidityAccount = getLiquidityPoolAccount();
    const contractAccount = algosdk.mnemonicToSecretKey(
      process.env.SERVER_MNEMONIC!
    );
    const appId = parseInt(process.env.APP_ID!);
    const appAddress = algosdk.getApplicationAddress(appId);

    // Check contract balance
    const contractInfo = await algodClient.accountInformation(appAddress).do();
    const contractBalance = contractInfo.amount / 1e6;

    if (contractBalance < amount + 0.1) {
      throw new Error(
        `Insufficient contract balance. Contract has ${contractBalance} ALGO, need ${
          amount + 0.1
        } ALGO`
      );
    }

    // Get suggested parameters
    const suggestedParams = await algodClient.getTransactionParams().do();

    // Create payment transaction from contract to liquidity pool
    const paymentAmount = amount * 1e6; // Convert ALGO to microALGO
    const paymentTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      from: contractAccount.addr,
      to: liquidityAccount.addr,
      amount: paymentAmount,
      suggestedParams,
      note: new TextEncoder().encode("Replenish liquidity pool"),
    });

    // Sign and send transaction
    const signedTxn = paymentTxn.signTxn(contractAccount.sk);
    const txId = paymentTxn.txID().toString();

    console.log(`📤 Replenishing liquidity pool with ${amount} ALGO`);
    const result = await algodClient.sendRawTransaction(signedTxn).do();
    console.log(`✅ Transaction sent: ${result.txId}`);

    // Wait for confirmation
    await algosdk.waitForConfirmation(algodClient, result.txId, 4);
    console.log("🎉 Liquidity pool replenished!");

    return result.txId;
  } catch (error) {
    console.error("Error replenishing liquidity pool:", error);
    throw error;
  }
}

// Auto-replenish if liquidity is low
async function autoReplenishIfNeeded(): Promise<void> {
  try {
    const currentBalance = await checkLiquidityPoolBalance();
    const liquidityAccount = getLiquidityPoolAccount();

    console.log(`💰 Liquidity pool balance: ${currentBalance} ALGO`);
    console.log(`🎯 Minimum threshold: ${MIN_LIQUIDITY_THRESHOLD} ALGO`);

    if (currentBalance < MIN_LIQUIDITY_THRESHOLD) {
      const replenishAmount = 10.0; // Replenish with 10 ALGO
      console.log(
        `⚠️ Liquidity pool is low. Replenishing with ${replenishAmount} ALGO...`
      );

      await replenishLiquidityPool(replenishAmount);

      const newBalance = await checkLiquidityPoolBalance();
      console.log(
        `✅ Liquidity pool replenished. New balance: ${newBalance} ALGO`
      );
    } else {
      console.log("✅ Liquidity pool has sufficient balance");
    }
  } catch (error) {
    console.error("Error in auto-replenish:", error);
    throw error;
  }
}

// Main function to handle command line arguments
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log("🏦 Liquidity Pool Management Script");
    console.log("=".repeat(40));
    console.log("");
    console.log("Usage:");
    console.log(
      "  npm run liquidity check                    - Check liquidity pool balance"
    );
    console.log(
      "  npm run liquidity send <address> <amount>  - Send ALGO from pool to address"
    );
    console.log(
      "  npm run liquidity replenish <amount>       - Replenish pool from contract"
    );
    console.log(
      "  npm run liquidity auto                     - Auto-replenish if needed"
    );
    console.log("");
    console.log("Examples:");
    console.log("  npm run liquidity check");
    console.log(
      "  npm run liquidity send 53FIEZ4Z5YUX67HYKTEXNOD4FFAK542RZZJ47H4YNDUBJWUK5FUA44GONY 0.5"
    );
    console.log("  npm run liquidity replenish 10");
    console.log("  npm run liquidity auto");
    console.log("");
    return;
  }

  const command = args[0].toLowerCase();

  try {
    switch (command) {
      case "check":
        const balance = await checkLiquidityPoolBalance();
        const liquidityAccount = getLiquidityPoolAccount();
        console.log(`💰 Liquidity Pool Balance: ${balance} ALGO`);
        console.log(`📍 Pool Address: ${liquidityAccount.addr}`);
        console.log(`🎯 Minimum Threshold: ${MIN_LIQUIDITY_THRESHOLD} ALGO`);
        break;

      case "send":
        if (args.length < 3) {
          console.log("❌ Please provide destination address and amount");
          console.log("Usage: npm run liquidity send <address> <amount>");
          return;
        }
        const destination = args[1];
        const sendAmount = parseFloat(args[2]);
        if (isNaN(sendAmount)) {
          console.log("❌ Invalid amount");
          return;
        }
        await sendFromLiquidityPool(destination, sendAmount);
        break;

      case "replenish":
        if (args.length < 2) {
          console.log("❌ Please provide amount to replenish");
          console.log("Usage: npm run liquidity replenish <amount>");
          return;
        }
        const replenishAmount = parseFloat(args[1]);
        if (isNaN(replenishAmount)) {
          console.log("❌ Invalid amount");
          return;
        }
        await replenishLiquidityPool(replenishAmount);
        break;

      case "auto":
        await autoReplenishIfNeeded();
        break;

      default:
        console.log(
          "❌ Unknown command. Use 'check', 'send', 'replenish', or 'auto'"
        );
    }
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

// Export functions for use in other scripts
export {
  checkLiquidityPoolBalance,
  sendFromLiquidityPool,
  replenishLiquidityPool,
  autoReplenishIfNeeded,
  getLiquidityPoolAccount,
};

// Run the script
if (require.main === module) {
  main();
}
