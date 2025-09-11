import React, { useState, useEffect } from "react";
import { algorandService, CashTransaction } from "../services/algorand";

interface CashInterfaceProps {
  userMnemonic: string;
}

const CashInterface: React.FC<CashInterfaceProps> = ({ userMnemonic }) => {
  const [cashAmount, setCashAmount] = useState<string>("0.5");
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");
  const [lastTxId, setLastTxId] = useState<string>("");
  const [cashTransactions, setCashTransactions] = useState<CashTransaction[]>(
    []
  );
  const [userBalance, setUserBalance] = useState<number>(0);

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, [userMnemonic]);

  const loadData = async () => {
    try {
      setLoading(true);
      const account = algorandService.getAccountFromMnemonic(userMnemonic);
      const balance = await algorandService.getAccountBalance(account.addr);
      const transactions = algorandService.getAllCashTransactions();

      setUserBalance(balance);
      setCashTransactions(transactions);
    } catch (error) {
      setMessage(`Error loading data: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleStoreCash = async () => {
    try {
      setLoading(true);
      setMessage("Storing cash on blockchain...");

      const amount = parseFloat(cashAmount);
      if (isNaN(amount) || amount < 0.1 || amount > 0.9) {
        throw new Error("Amount must be between 0.1 and 0.9 ALGO");
      }

      // Store on blockchain
      const result = await algorandService.storeCashOnBlockchain(
        userMnemonic,
        amount
      );

      // Add to local storage
      algorandService.addCashToStorage(result.uniqueId, amount, result.txId);

      setLastTxId(result.txId);
      setMessage(`✅ Cash stored successfully! Unique ID: ${result.uniqueId}`);

      // Reload data
      await loadData();
    } catch (error) {
      setMessage(`❌ Error storing cash: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const totalStored = cashTransactions.reduce((sum, tx) => sum + tx.amount, 0);

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-gray-800 mb-4">
          💰 Cash Storage System
        </h2>
        <p className="text-gray-600 mb-6">
          Store amounts between 0.1-0.9 ALGO with unique encrypted codes on the
          blockchain
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

        {/* Store Cash Section */}
        <div className="bg-blue-50 p-6 rounded-lg mb-6">
          <h3 className="font-semibold text-blue-800 mb-4 text-xl">
            Store Cash
          </h3>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount (0.1 - 0.9 ALGO)
              </label>
              <input
                type="number"
                value={cashAmount}
                onChange={(e) => setCashAmount(e.target.value)}
                placeholder="0.5"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                step="0.1"
                min="0.1"
                max="0.9"
              />
            </div>
            <button
              onClick={handleStoreCash}
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg"
            >
              {loading ? "Storing..." : "Store Cash"}
            </button>
          </div>
          <p className="text-sm text-blue-600 mt-2">
            💡 This will generate a unique encrypted code and store it on the
            blockchain
          </p>
        </div>

        {/* Summary */}
        <div className="bg-purple-50 p-4 rounded-lg mb-6">
          <h3 className="font-semibold text-purple-800 mb-2">
            📊 Storage Summary
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-700">
                {cashTransactions.length}
              </p>
              <p className="text-sm text-purple-600">Total Stored</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-700">
                {totalStored.toFixed(4)}
              </p>
              <p className="text-sm text-purple-600">Total Amount (ALGO)</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-700">
                {cashTransactions.filter((tx) => !tx.txId).length}
              </p>
              <p className="text-sm text-purple-600">
                Available for Withdrawal
              </p>
            </div>
          </div>
        </div>

        {/* Cash Transactions Table */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-gray-800 text-xl">
              💼 Stored Cash Values
            </h3>
            <button
              onClick={loadData}
              disabled={loading}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Refresh
            </button>
          </div>

          {cashTransactions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 text-lg">No cash values stored yet</p>
              <p className="text-gray-400 text-sm mt-2">
                Store your first cash value to get started
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
                      Unique ID
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Stored Date
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
                  {cashTransactions.map((tx, index) => (
                    <tr
                      key={tx.uniqueId}
                      className="border-b border-gray-200 hover:bg-gray-50"
                    >
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-green-600">
                        {tx.amount} ALGO
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-blue-600">
                        {tx.uniqueId}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {new Date(tx.timestamp).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {tx.txId ? (
                          <a
                            href={algorandService.getTransactionUrl(tx.txId)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 underline font-mono"
                          >
                            {tx.txId.slice(0, 8)}...
                          </a>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                          ✅ Stored
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

export default CashInterface;
