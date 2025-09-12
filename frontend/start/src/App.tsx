// src/App.tsx
import React, { useState, useEffect } from "react";
import ContractInterface from "./components/ContractInterface";
import CashInterface from "./components/CashInterface";
import WithdrawalInterface from "./components/WithdrawalInterface";
import MintInterface from "./components/MintInterface";
import DepositInterface from "./components/DepositInterface";

type ActiveTab = "contract" | "cash" | "withdrawal" | "mint" | "deposit";

const App: React.FC = () => {
  const [userMnemonic, setUserMnemonic] = useState<string>("");
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [activeTab, setActiveTab] = useState<ActiveTab>("contract");

  // Load mnemonic from environment variables on component mount
  useEffect(() => {
    const envMnemonic = import.meta.env.VITE_USER_MNEMONIC;
    if (envMnemonic && envMnemonic.trim().split(" ").length === 25) {
      setUserMnemonic(envMnemonic);
      setIsConnected(true);
    } else {
      setError(
        "No valid mnemonic found in environment variables. Please check your .env file."
      );
    }
  }, []);

  const handleConnect = () => {
    if (userMnemonic.trim().split(" ").length === 25) {
      setIsConnected(true);
      setError("");
    } else {
      setError("Please enter a valid 25-word mnemonic phrase");
    }
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    setUserMnemonic("");
    setError("");
  };

  const renderActiveComponent = () => {
    switch (activeTab) {
      case "contract":
        return <ContractInterface userMnemonic={userMnemonic} />;
      case "cash":
        return <CashInterface userMnemonic={userMnemonic} />;
      case "withdrawal":
        return <WithdrawalInterface userMnemonic={userMnemonic} />;
      case "mint":
        return <MintInterface userMnemonic={userMnemonic} />;
      case "deposit":
        return <DepositInterface userMnemonic={userMnemonic} />;
      default:
        return <ContractInterface userMnemonic={userMnemonic} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            AlgoCash - Smart Contract Platform
          </h1>
          <p className="text-lg text-gray-600">
            Store, manage, and withdraw cash using encrypted unique codes on
            Algorand blockchain
          </p>
        </div>

        {!isConnected ? (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">
                Wallet Connection
              </h2>

              <div className="space-y-4">
                {error ? (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h3 className="font-semibold text-red-800 mb-2">
                      Connection Error
                    </h3>
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                ) : (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-800 mb-2">
                      Loading Wallet...
                    </h3>
                    <p className="text-sm text-blue-700">
                      Connecting using mnemonic from environment variables...
                    </p>
                  </div>
                )}

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h3 className="font-semibold text-yellow-800 mb-2">
                    Security Notice
                  </h3>
                  <p className="text-sm text-yellow-700">
                    This is for TestNet only. Your mnemonic is loaded from the
                    .env file. Make sure you're using a TestNet mnemonic, not
                    MainNet.
                  </p>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-800 mb-2">
                    Environment Setup
                  </h3>
                  <p className="text-sm text-gray-700">
                    Make sure your{" "}
                    <code className="bg-gray-200 px-1 rounded">.env</code> file
                    contains:
                  </p>
                  <pre className="text-xs bg-gray-100 p-2 rounded mt-2 overflow-x-auto">
                    {`VITE_USER_MNEMONIC=your_25_word_mnemonic_phrase_here
VITE_APP_ID=745702881
VITE_ALGOD_BASE_URL=https://testnet-api.algonode.cloud`}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div>
            {/* Active Component */}
            {renderActiveComponent()}
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-12">
          <p className="text-gray-500 text-sm">
            Built with React, TypeScript, and Algorand SDK | TestNet Only
          </p>
        </div>
      </div>
    </div>
  );
};

export default App;
