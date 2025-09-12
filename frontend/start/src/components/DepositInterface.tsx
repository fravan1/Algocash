import React, { useState, useEffect } from "react";
import { algorandService } from "../services/algorand";

interface DepositInterfaceProps {
  userMnemonic: string;
}

const DepositInterface: React.FC<DepositInterfaceProps> = ({
  userMnemonic,
}) => {
  const [userBalance, setUserBalance] = useState<number>(0);
  const [contractBalance, setContractBalance] = useState<number>(0);
  const [depositAmount, setDepositAmount] = useState<string>("1");
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");
  const [lastTxId, setLastTxId] = useState<string>("");
  const [showSuccessPopup, setShowSuccessPopup] = useState<boolean>(false);

  const appInfo = algorandService.getAppInfo();

  // Load balances on component mount
  useEffect(() => {
    loadBalances();
  }, [userMnemonic]);

  const loadBalances = async () => {
    try {
      setLoading(true);
      const account = algorandService.getAccountFromMnemonic(userMnemonic);
      const userBal = await algorandService.getAccountBalance(account.addr);
      const contractBal = await algorandService.getAccountBalance(
        appInfo.appAddress
      );

      setUserBalance(userBal);
      setContractBalance(contractBal);
    } catch (error) {
      setMessage(`Error loading balances: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeposit = async () => {
    try {
      setLoading(true);
      setMessage("Sending deposit...");

      const amount = parseFloat(depositAmount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error("Please enter a valid amount");
      }

      const txId = await algorandService.sendDeposit(userMnemonic, amount);
      setLastTxId(txId);
      setShowSuccessPopup(true);
      setMessage(`✅ Deposit successful! Transaction ID: ${txId}`);

      // Reload balances
      await loadBalances();
    } catch (error) {
      setMessage(`❌ Deposit failed: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">$</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Deposit to Contract</h1>
                <p className="text-sm text-gray-500">Send ALGO to smart contract</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Deposit to Contract
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Send ALGO to the smart contract to make it available for minting digital notes
          </p>
        </div>

        {/* Balance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Balance Overview */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Your Balance</h3>
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-green-600 font-bold text-sm">$</span>
              </div>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600 mb-2">
                {userBalance.toFixed(3)} ALGO
              </p>
              <p className="text-sm text-gray-500">Available for deposit</p>
            </div>
          </div>

          {/* Contract Balance */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Contract Balance</h3>
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-blue-600 font-bold text-sm">📦</span>
              </div>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-600 mb-2">
                {contractBalance.toFixed(4)} ALGO
              </p>
              <p className="text-sm text-gray-500">Total deposited</p>
            </div>
          </div>
        </div>

        {/* Deposit Form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 w-full max-w-md mx-auto mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-6 text-center">
            Send Deposit
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount (ALGO)
              </label>
              <input
                type="number"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter amount"
                step="0.001"
                min="0"
              />
            </div>
            <button
              onClick={handleDeposit}
              disabled={loading}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
            >
              {loading ? "Processing..." : "Send Deposit"}
            </button>
          </div>
        </div>

        {/* Back Button */}
        <div className="text-center">
          <button
            onClick={() => setMessage("Back to main menu!")}
            className="px-8 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium shadow-sm"
          >
            Back to Main Menu
          </button>
        </div>
      </div>

      {/* Top Right Utility Buttons */}
      <div className="fixed top-4 right-4 flex gap-2">
        <button
          onClick={loadBalances}
          disabled={loading}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 text-sm font-medium shadow-sm"
          title="Refresh Balances"
        >
          Refresh
        </button>
      </div>

      {/* Success Popup */}
      {showSuccessPopup && lastTxId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Deposit Successful!</h3>
                <p className="text-gray-600 mb-4">Your ALGO has been deposited to the contract</p>
                <div className="bg-gray-50 p-3 rounded-lg mb-4">
                  <p className="text-xs text-gray-500 mb-1">Transaction Hash:</p>
                  <p className="text-sm font-mono text-gray-800 break-all">{lastTxId}</p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowSuccessPopup(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Close
                  </button>
                  <a
                    href={algorandService.getTransactionUrl(lastTxId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-center"
                  >
                    View Transaction
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      {message && !showSuccessPopup && (
        <div className="fixed bottom-4 right-4 max-w-md p-4 bg-white border border-gray-200 rounded-lg shadow-lg">
          <p className="text-gray-800 text-sm font-medium">{message}</p>
        </div>
      )}
    </div>
  );
};

export default DepositInterface;
