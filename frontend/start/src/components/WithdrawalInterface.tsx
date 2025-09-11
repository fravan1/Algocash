import React, { useState, useEffect } from "react";
import { algorandService, WithdrawalData } from "../services/algorand";

interface WithdrawalInterfaceProps {
  userMnemonic: string;
}

const WithdrawalInterface: React.FC<WithdrawalInterfaceProps> = ({
  userMnemonic,
}) => {
  const [uniqueCode, setUniqueCode] = useState<string>("");
  const [destinationAddress, setDestinationAddress] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");
  const [lastTxId, setLastTxId] = useState<string>("");
  const [withdrawalHistory, setWithdrawalHistory] = useState<
    Array<{ uniqueCode: string; data: WithdrawalData }>
  >([]);
  const [userBalance, setUserBalance] = useState<number>(0);
  const [verificationResult, setVerificationResult] = useState<{
    amount: number;
    valid: boolean;
    message: string;
  } | null>(null);

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, [userMnemonic]);

  const loadData = async () => {
    try {
      setLoading(true);
      const account = algorandService.getAccountFromMnemonic(userMnemonic);
      const balance = await algorandService.getAccountBalance(account.addr);
      const history = algorandService.getWithdrawalHistory();

      setUserBalance(balance);
      setWithdrawalHistory(history);
    } catch (error) {
      setMessage(`Error loading data: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = () => {
    if (!uniqueCode.trim()) {
      setVerificationResult({
        amount: 0,
        valid: false,
        message: "Please enter a unique code",
      });
      return;
    }

    const result = algorandService.verifyUniqueCode(uniqueCode);
    setVerificationResult(result);
  };

  const handleWithdraw = async () => {
    try {
      if (!verificationResult || !verificationResult.valid) {
        setMessage("❌ Please verify a valid unique code first");
        return;
      }

      if (!destinationAddress.trim()) {
        setMessage("❌ Please enter a destination address");
        return;
      }

      setLoading(true);
      setMessage("Processing withdrawal...");

      const amount = verificationResult.amount;

      // Process withdrawal
      const txId = await algorandService.withdrawToWallet(
        userMnemonic,
        uniqueCode,
        destinationAddress,
        amount
      );

      // Mark as withdrawn
      algorandService.markAsWithdrawn(uniqueCode, txId);

      setLastTxId(txId);
      setMessage(
        `✅ Withdrawal successful! ${amount} ALGO sent to ${destinationAddress}`
      );

      // Clear form
      setUniqueCode("");
      setDestinationAddress("");
      setVerificationResult(null);

      // Reload data
      await loadData();
    } catch (error) {
      setMessage(`❌ Error processing withdrawal: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const totalWithdrawn = withdrawalHistory.reduce(
    (sum, item) => sum + item.data.amount,
    0
  );

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-gray-800 mb-4">
          💸 Withdrawal System
        </h2>
        <p className="text-gray-600 mb-6">
          Withdraw stored cash using unique codes to any Algorand address
        </p>

        {/* User Balance */}
        <div className="bg-green-50 p-4 rounded-lg mb-6">
          <h3 className="font-semibold text-green-800 mb-2">
            Your Account Balance
          </h3>
          <p className="text-2xl font-bold text-green-700">
            {userBalance.toFixed(4)} ALGO
          </p>
        </div>

        {/* Withdrawal Form */}
        <div className="bg-blue-50 p-6 rounded-lg mb-6">
          <h3 className="font-semibold text-blue-800 mb-4 text-xl">
            Process Withdrawal
          </h3>

          <div className="space-y-4">
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
                  placeholder="Enter unique code (e.g., ABC123XYZ789)"
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={handleVerifyCode}
                  disabled={loading || !uniqueCode.trim()}
                  className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                >
                  Verify
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
                Destination Address
              </label>
              <input
                type="text"
                value={destinationAddress}
                onChange={(e) => setDestinationAddress(e.target.value)}
                placeholder="Enter Algorand address (e.g., 53FIEZ4Z5YUX67HYKTEXNOD4FFAK542RZZJ47H4YNDUBJWUK5FUA44GONY)"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              />
            </div>

            {/* Withdraw Button */}
            <button
              onClick={handleWithdraw}
              disabled={
                loading ||
                !verificationResult?.valid ||
                !destinationAddress.trim()
              }
              className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg"
            >
              {loading ? "Processing..." : "Withdraw"}
            </button>
          </div>

          <p className="text-sm text-blue-600 mt-4">
            💡 Verify your unique code first, then enter the destination address
            to withdraw
          </p>
        </div>

        {/* Summary */}
        <div className="bg-purple-50 p-4 rounded-lg mb-6">
          <h3 className="font-semibold text-purple-800 mb-2">
            📊 Withdrawal Summary
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-700">
                {withdrawalHistory.length}
              </p>
              <p className="text-sm text-purple-600">Total Withdrawals</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-700">
                {totalWithdrawn.toFixed(4)}
              </p>
              <p className="text-sm text-purple-600">Total Withdrawn (ALGO)</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-700">
                {withdrawalHistory.length > 0
                  ? (totalWithdrawn / withdrawalHistory.length).toFixed(4)
                  : "0"}
              </p>
              <p className="text-sm text-purple-600">Average Withdrawal</p>
            </div>
          </div>
        </div>

        {/* Withdrawal History */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-gray-800 text-xl">
              📋 Withdrawal History
            </h3>
            <button
              onClick={loadData}
              disabled={loading}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Refresh
            </button>
          </div>

          {withdrawalHistory.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 text-lg">No withdrawals found</p>
              <p className="text-gray-400 text-sm mt-2">
                Process your first withdrawal to see history here
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead>
                  <tr className="bg-gray-200">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      #
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Unique Code
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Withdrawal Date
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Transaction ID
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {withdrawalHistory.map((item, index) => (
                    <tr
                      key={item.uniqueCode}
                      className="border-b border-gray-200 hover:bg-gray-50"
                    >
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-green-600">
                        {item.data.amount} ALGO
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-blue-600">
                        {item.uniqueCode}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {item.data.withdrawalTimestamp
                          ? new Date(
                              item.data.withdrawalTimestamp
                            ).toLocaleString()
                          : "-"}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {item.data.withdrawalTxId ? (
                          <a
                            href={algorandService.getTransactionUrl(
                              item.data.withdrawalTxId
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 underline font-mono"
                          >
                            {item.data.withdrawalTxId.slice(0, 8)}...
                          </a>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-semibold">
                          ✅ Withdrawn
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Messages */}
        {message && (
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800 text-sm">{message}</p>
            {lastTxId && (
              <a
                href={algorandService.getTransactionUrl(lastTxId)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline text-sm mt-2 block"
              >
                View Transaction on AlgoExplorer →
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default WithdrawalInterface;
