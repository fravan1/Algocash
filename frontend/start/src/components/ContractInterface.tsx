import React, { useState, useEffect } from "react";
import { algorandService } from "../services/algorand";

interface ContractInterfaceProps {
  userMnemonic: string;
}

const ContractInterface: React.FC<ContractInterfaceProps> = ({
  userMnemonic,
}) => {
  const [userBalance, setUserBalance] = useState<number>(0);
  const [appBalance, setAppBalance] = useState<number>(0);
  const [depositAmount, setDepositAmount] = useState<string>("1");
  const [mintAmount, setMintAmount] = useState<string>("0.1");
  const [userState, setUserState] = useState<{
    balance: number;
    used: number;
    remaining: number;
  }>({ balance: 0, used: 0, remaining: 0 });
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");
  const [lastTxId, setLastTxId] = useState<string>("");

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
      const appBal = await algorandService.getAppBalance();
      const userStateData = await algorandService.getUserState(userMnemonic);

      setUserBalance(userBal);
      setAppBalance(appBal);
      setUserState(userStateData);
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
      setMessage(`✅ Deposit successful! Transaction ID: ${txId}`);

      // Reload balances
      await loadBalances();
    } catch (error) {
      setMessage(`❌ Deposit failed: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleOptIn = async () => {
    try {
      setLoading(true);
      setMessage("Opting into application...");

      const txId = await algorandService.optIntoApp(userMnemonic);
      setLastTxId(txId);
      setMessage(`✅ Opt-in successful! Transaction ID: ${txId}`);
    } catch (error) {
      setMessage(`❌ Opt-in failed: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCallApp = async () => {
    try {
      setLoading(true);
      setMessage("Calling application...");

      const txId = await algorandService.callApp(userMnemonic);
      setLastTxId(txId);
      setMessage(`✅ App call successful! Transaction ID: ${txId}`);
    } catch (error) {
      setMessage(`❌ App call failed: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleMint = async () => {
    try {
      setLoading(true);
      setMessage("Minting digital currency...");

      const amount = parseFloat(mintAmount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error("Please enter a valid mint amount");
      }

      if (amount > userState.remaining) {
        throw new Error(
          `Cannot mint ${amount} ALGO. Remaining balance: ${userState.remaining.toFixed(
            4
          )} ALGO`
        );
      }

      const txId = await algorandService.mintCurrency(userMnemonic, amount);
      setLastTxId(txId);
      setMessage(
        `✅ Mint successful! Minted ${amount} ALGO. Transaction ID: ${txId}`
      );

      // Reload balances and user state
      await loadBalances();
    } catch (error) {
      setMessage(`❌ Mint failed: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          Smart Contract Interface
        </h2>

        {/* App Info */}
        <div className="bg-blue-50 p-4 rounded-lg mb-4">
          <h3 className="font-semibold text-blue-800 mb-2">
            Contract Information
          </h3>
          <p className="text-sm text-blue-700">
            <strong>App ID:</strong> {appInfo.appId}
          </p>
          <p className="text-sm text-blue-700">
            <strong>Contract Address:</strong> {appInfo.appAddress}
          </p>
          <a
            href={appInfo.explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline text-sm"
          >
            View on AlgoExplorer →
          </a>
        </div>

        {/* Balances */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="font-semibold text-green-800 mb-2">
              Your Account Balance
            </h3>
            <p className="text-2xl font-bold text-green-700">
              {userBalance.toFixed(4)} ALGO
            </p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <h3 className="font-semibold text-purple-800 mb-2">
              Contract Balance
            </h3>
            <p className="text-2xl font-bold text-purple-700">
              {appBalance.toFixed(4)} ALGO
            </p>
          </div>
        </div>

        {/* User State in Contract */}
        <div className="bg-blue-50 p-4 rounded-lg mb-6">
          <h3 className="font-semibold text-blue-800 mb-3">
            Your Contract State
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-sm text-blue-600 mb-1">Deposited Balance</p>
              <p className="text-xl font-bold text-blue-700">
                {userState.balance.toFixed(4)} ALGO
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-blue-600 mb-1">Used Amount</p>
              <p className="text-xl font-bold text-blue-700">
                {userState.used.toFixed(4)} ALGO
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-blue-600 mb-1">Remaining Balance</p>
              <p className="text-xl font-bold text-blue-700">
                {userState.remaining.toFixed(4)} ALGO
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-4">
          {/* Deposit */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-800 mb-3">Send Deposit</h3>
            <div className="flex gap-2 mb-3">
              <input
                type="number"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder="Amount in ALGO"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                step="0.1"
                min="0.1"
              />
              <button
                onClick={handleDeposit}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Sending..." : "Send Deposit"}
              </button>
            </div>
          </div>

          {/* Mint Currency */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-800 mb-3">
              Mint Digital Currency
            </h3>
            <div className="flex gap-2 mb-3">
              <input
                type="number"
                value={mintAmount}
                onChange={(e) => setMintAmount(e.target.value)}
                placeholder="Amount to mint"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                step="0.1"
                min="0.1"
                max={userState.remaining}
              />
              <button
                onClick={handleMint}
                disabled={loading || userState.remaining <= 0}
                className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Minting..." : "Mint Currency"}
              </button>
            </div>
            <p className="text-sm text-gray-600">
              You can mint up to {userState.remaining.toFixed(4)} ALGO (your
              remaining balance)
            </p>
          </div>

          {/* App Actions */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-800 mb-3">
              Contract Actions
            </h3>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={handleOptIn}
                disabled={loading}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Processing..." : "Opt Into App"}
              </button>
              <button
                onClick={handleCallApp}
                disabled={loading}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Processing..." : "Call App (NoOp)"}
              </button>
              <button
                onClick={loadBalances}
                disabled={loading}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Refresh Balances
              </button>
            </div>
          </div>
        </div>

        {/* Messages */}
        {message && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
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

export default ContractInterface;
