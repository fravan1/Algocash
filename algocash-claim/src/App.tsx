import React, { useState, useEffect } from "react";
import algosdk from "algosdk";

// Configuration
const ALGOD_BASE_URL = "https://testnet-api.algonode.cloud";
const APP_ID = 745702881; // Your deployed contract ID
const SERVER_MNEMONIC =
  "stove sunset control drive donor render moral ask issue casual shy poverty woman enter bar evidence ranch rude obtain festival wide horror armor absent pattern"; // Your seed phrase

// Algorand service for blockchain interactions
class AlgorandService {
  private algodClient: algosdk.Algodv2;
  private appId: number;
  private privateKey: Uint8Array;
  private account: algosdk.Account;

  constructor() {
    this.algodClient = new algosdk.Algodv2("", ALGOD_BASE_URL, 443);
    this.appId = APP_ID;
    this.account = algosdk.mnemonicToSecretKey(SERVER_MNEMONIC);
    this.privateKey = this.account.sk;
  }

  // Verify unique code from blockchain
  async verifyUniqueCode(uniqueCode: string): Promise<{
    amount: number;
    valid: boolean;
    message: string;
  }> {
    try {
      const appInfo = await this.algodClient
        .getApplicationByID(this.appId)
        .do();

      if (!appInfo.params["global-state"]) {
        return {
          amount: 0,
          valid: false,
          message: "❌ No data found on blockchain",
        };
      }

      // Look for the unique code in global state
      for (const kv of appInfo.params["global-state"]) {
        const key = atob(kv.key); // Base64 decode

        if (key === uniqueCode) {
          try {
            const value = atob(kv.value.bytes || ""); // Base64 decode

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

  // Get transaction explorer URL
  getTransactionUrl(txId: string): string {
    return `https://testnet.algoexplorer.io/tx/${txId}`;
  }

  // Get account balance
  async getAccountBalance(): Promise<number> {
    try {
      const accountInfo = await this.algodClient
        .accountInformation(this.account.addr)
        .do();
      return accountInfo.amount / 1000000; // Convert to ALGO
    } catch (error) {
      console.error("Error getting balance:", error);
      return 0;
    }
  }

  // Withdraw funds and mark as used
  async withdrawAndMarkUsed(
    uniqueCode: string,
    destinationAddress: string,
    amount: number
  ): Promise<{
    success: boolean;
    txId?: string;
    error?: string;
  }> {
    try {
      // Check account balance first
      const accountInfo = await this.algodClient
        .accountInformation(this.account.addr)
        .do();
      const balance = accountInfo.amount;
      const minBalance = 100000; // 0.1 ALGO minimum balance
      const transactionFee = 2000; // 0.002 ALGO for transaction fees
      const requiredBalance = amount * 1000000 + minBalance + transactionFee;

      if (balance < requiredBalance) {
        return {
          success: false,
          error: `Insufficient balance. Required: ${
            requiredBalance / 1000000
          } ALGO, Available: ${
            balance / 1000000
          } ALGO. Please add more ALGO to your account.`,
        };
      }

      // Get suggested parameters
      const suggestedParams = await this.algodClient
        .getTransactionParams()
        .do();

      // Create payment transaction to send ALGO to destination
      const paymentTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        from: this.account.addr,
        to: destinationAddress,
        amount: amount * 1000000, // Convert ALGO to microALGO
        suggestedParams,
      });

      // Create application call to mark as used
      const appCallTxn = algosdk.makeApplicationNoOpTxnFromObject({
        from: this.account.addr,
        appIndex: this.appId,
        appArgs: [
          new Uint8Array(new TextEncoder().encode(uniqueCode)),
          new Uint8Array(new TextEncoder().encode(destinationAddress)),
          algosdk.encodeUint64(amount * 1000000), // Amount in microALGO
        ],
        suggestedParams,
      });

      // Group transactions
      const groupedTxn = algosdk.assignGroupID([paymentTxn, appCallTxn]);

      // Sign transactions
      const signedPaymentTxn = algosdk.signTransaction(
        groupedTxn[0],
        this.privateKey
      );
      const signedAppCallTxn = algosdk.signTransaction(
        groupedTxn[1],
        this.privateKey
      );

      // Send transactions
      const txns = [signedPaymentTxn.blob, signedAppCallTxn.blob];
      const { txId } = await this.algodClient.sendRawTransaction(txns).do();

      // Wait for confirmation
      await algosdk.waitForConfirmation(this.algodClient, txId, 4);

      return {
        success: true,
        txId: txId,
      };
    } catch (error) {
      console.error("Withdrawal error:", error);
      return {
        success: false,
        error: (error as Error).message || "Withdrawal failed",
      };
    }
  }
}

const App: React.FC = () => {
  const [uniqueCode, setUniqueCode] = useState<string>("");
  const [destinationAddress, setDestinationAddress] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");
  const [accountBalance, setAccountBalance] = useState<number>(0);
  const [verificationResult, setVerificationResult] = useState<{
    amount: number;
    valid: boolean;
    message: string;
  } | null>(null);

  const algorandService = new AlgorandService();

  // Extract unique code from URL on component mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const codeFromUrl =
      urlParams.get("id") || urlParams.get("code") || urlParams.get("unique");

    if (codeFromUrl) {
      setUniqueCode(codeFromUrl);
      setMessage("✅ Unique code loaded from URL");
    }

    // Load account balance
    const loadBalance = async () => {
      const balance = await algorandService.getAccountBalance();
      setAccountBalance(balance);
    };
    loadBalance();
  }, []);

  const handleVerifyCode = async () => {
    if (!uniqueCode.trim()) {
      setVerificationResult({
        amount: 0,
        valid: false,
        message: "Please enter a unique code",
      });
      return;
    }

    try {
      setLoading(true);
      const result = await algorandService.verifyUniqueCode(uniqueCode);
      setVerificationResult(result);
    } catch (error) {
      setVerificationResult({
        amount: 0,
        valid: false,
        message: `Error verifying code: ${error}`,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async () => {
    if (!verificationResult || !verificationResult.valid) {
      setMessage("❌ Please verify a valid unique code first");
      return;
    }

    if (!destinationAddress.trim()) {
      setMessage("❌ Please enter a destination address");
      return;
    }

    if (destinationAddress.trim().length < 10) {
      setMessage("❌ Please enter a valid Algorand address");
      return;
    }

    setLoading(true);
    setMessage("🔄 Processing claim...");

    try {
      // Call the withdrawal function directly
      const result = await algorandService.withdrawAndMarkUsed(
        uniqueCode,
        destinationAddress,
        verificationResult.amount
      );

      if (result.success) {
        setMessage(
          `✅ Claim successful! ${verificationResult.amount} ALGO sent to ${destinationAddress}. Transaction: ${result.txId}`
        );

        // Clear form
        setUniqueCode("");
        setDestinationAddress("");
        setVerificationResult(null);
      } else {
        throw new Error(result.error || "Withdrawal failed");
      }
    } catch (error) {
      setMessage(`❌ Error processing claim: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">$</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">AlgoCash</h1>
          <p className="text-gray-600">Claim Your Digital Note</p>
          <div className="mt-2 p-2 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              Account Balance:{" "}
              <span className="font-bold">
                {accountBalance.toFixed(4)} ALGO
              </span>
            </p>
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="space-y-6">
            {/* Unique Code Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Unique Code
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={uniqueCode}
                  onChange={(e) => setUniqueCode(e.target.value)}
                  placeholder="Enter unique code"
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  onClick={handleVerifyCode}
                  disabled={loading || !uniqueCode.trim()}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {loading ? "Verifying..." : "Verify"}
                </button>
              </div>
            </div>

            {/* Verification Result */}
            {verificationResult && (
              <div
                className={`p-4 rounded-lg ${
                  verificationResult.valid
                    ? "bg-green-50 border border-green-200"
                    : "bg-red-50 border border-red-200"
                }`}
              >
                <p
                  className={`text-sm font-semibold ${
                    verificationResult.valid ? "text-green-800" : "text-red-800"
                  }`}
                >
                  {verificationResult.message}
                </p>
                {verificationResult.valid && (
                  <p className="text-lg font-bold text-green-700 mt-1">
                    Amount: {verificationResult.amount} ALGO
                  </p>
                )}
              </div>
            )}

            {/* Destination Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Algorand Address
              </label>
              <input
                type="text"
                value={destinationAddress}
                onChange={(e) => setDestinationAddress(e.target.value)}
                placeholder="Enter your Algorand address"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
              />
            </div>

            {/* Claim Button */}
            <button
              onClick={handleClaim}
              disabled={
                loading ||
                !verificationResult?.valid ||
                !destinationAddress.trim()
              }
              className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-lg"
            >
              {loading ? "Processing..." : "Claim ALGO"}
            </button>

            {/* Help Text */}
            <div className="text-center">
              <p className="text-sm text-gray-500">
                Enter your unique code and Algorand address to claim your
                digital note
              </p>
            </div>
          </div>
        </div>

        {/* Messages */}
        {message && (
          <div className="mt-6 p-4 bg-white rounded-lg shadow-sm border border-gray-200">
            <p className="text-gray-800 text-sm font-medium">{message}</p>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-xs text-gray-500">
            Powered by Algorand Blockchain | TestNet Only
          </p>
        </div>
      </div>
    </div>
  );
};

export default App;
