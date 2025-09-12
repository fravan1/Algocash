import React, { useState, useEffect } from "react";
import { algorandService } from "../services/algorand";

interface DigitalNote {
  id: string;
  amount: number;
  status: "active" | "used";
  mintedAt: string;
}

interface MintInterfaceProps {
  userMnemonic: string;
}

const MintInterface: React.FC<MintInterfaceProps> = ({ userMnemonic }) => {
  const [userBalance, setUserBalance] = useState<number>(0);
  const [contractBalance, setContractBalance] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");
  const [lastTxId, setLastTxId] = useState<string>("");

  // Modal states
  const [showMintModal, setShowMintModal] = useState<boolean>(false);
  const [selectedDenomination, setSelectedDenomination] = useState<number>(1);
  const [mintQuantity, setMintQuantity] = useState<number>(1);
  const [digitalNotes, setDigitalNotes] = useState<DigitalNote[]>([]);

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

  const handleMintNotes = () => {
    const totalAmount = selectedDenomination * mintQuantity;

    if (totalAmount > contractBalance) {
      setMessage(
        `❌ Insufficient balance. Available: ${contractBalance.toFixed(4)} ALGO`
      );
      return;
    }

    // Create new digital notes
    const newNotes: DigitalNote[] = [];
    for (let i = 0; i < mintQuantity; i++) {
      const noteId = `NOTE_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;
      newNotes.push({
        id: noteId,
        amount: selectedDenomination,
        status: "active",
        mintedAt: new Date().toISOString(),
      });
    }

    setDigitalNotes((prev) => [...prev, ...newNotes]);
    setMessage(
      `✅ Minted ${mintQuantity} notes of ${selectedDenomination} ALGO each (Total: ${totalAmount} ALGO)`
    );
    setShowMintModal(false);

    // Reset form
    setSelectedDenomination(1);
    setMintQuantity(1);
  };

  const getNotesSummary = () => {
    const total = digitalNotes.length;
    const used = digitalNotes.filter((note) => note.status === "used").length;
    const remaining = total - used;
    const totalValue = digitalNotes.reduce((sum, note) => sum + note.amount, 0);
    const usedValue = digitalNotes
      .filter((note) => note.status === "used")
      .reduce((sum, note) => sum + note.amount, 0);
    const remainingValue = totalValue - usedValue;

    return { total, used, remaining, totalValue, usedValue, remainingValue };
  };

  const summary = getNotesSummary();

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
                <h1 className="text-xl font-bold text-gray-900">Mint Digital Notes</h1>
                <p className="text-sm text-gray-500">Convert ALGO into digital cash</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Mint Digital Notes
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Convert your ALGO into digital cash notes with unique denominations
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
              <p className="text-sm text-gray-500">
                Available for transactions
              </p>
            </div>
          </div>

          {/* Escrow Balance */}
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
              <p className="text-sm text-gray-500">Available for minting</p>
            </div>
          </div>
        </div>

        {/* MINT Button */}
        <div className="text-center mb-8">
          <button
            onClick={() => setShowMintModal(true)}
            disabled={loading || contractBalance <= 0}
            className="px-12 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-xl shadow-lg hover:shadow-xl transition-all duration-200"
          >
            MINT DIGITAL NOTES
          </button>
          <p className="text-gray-600 text-center mt-4">
            Available to mint: {contractBalance.toFixed(4)} ALGO
          </p>
        </div>

        {/* Summary of Notes */}
        {digitalNotes.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">
              Digital Notes Summary
            </h3>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-xl font-bold text-gray-900">
                  {summary.total}
                </p>
                <p className="text-sm text-gray-600">Total Notes</p>
                <p className="text-xs text-gray-500">
                  {summary.totalValue.toFixed(4)} ALGO
                </p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <p className="text-xl font-bold text-red-600">
                  {summary.used}
                </p>
                <p className="text-sm text-gray-600">Used</p>
                <p className="text-xs text-gray-500">
                  {summary.usedValue.toFixed(4)} ALGO
                </p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-xl font-bold text-green-600">
                  {summary.remaining}
                </p>
                <p className="text-sm text-gray-600">Available</p>
                <p className="text-xs text-gray-500">
                  {summary.remainingValue.toFixed(4)} ALGO
                </p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-xl font-bold text-blue-600">
                  {contractBalance.toFixed(4)}
                </p>
                <p className="text-sm text-gray-600">Contract</p>
                <p className="text-xs text-gray-500">For minting</p>
              </div>
            </div>

            {/* Notes List */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-4 px-6 text-lg font-semibold">
                      Unique ID
                    </th>
                    <th className="text-left py-4 px-6 text-lg font-semibold">
                      Amount
                    </th>
                    <th className="text-left py-4 px-6 text-lg font-semibold">
                      Status
                    </th>
                    <th className="text-left py-4 px-6 text-lg font-semibold">
                      Minted At
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {digitalNotes.slice(0, 10).map((note) => (
                    <tr key={note.id} className="border-b border-gray-100">
                      <td className="py-4 px-6 font-mono text-sm">
                        {note.id.slice(0, 20)}...
                      </td>
                      <td className="py-4 px-6 text-lg font-semibold">
                        {note.amount} ALGO
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${
                            note.status === "active"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {note.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-gray-500">
                        {new Date(note.mintedAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {digitalNotes.length > 10 && (
                <p className="text-center text-gray-500 text-sm mt-4">
                  Showing first 10 notes. Total: {digitalNotes.length}
                </p>
              )}
            </div>
          </div>
        )}

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

      {/* Messages */}
      {message && (
        <div className="fixed bottom-4 right-4 max-w-md p-4 bg-white border border-gray-200 rounded-lg shadow-lg">
          <p className="text-gray-800 text-sm font-medium">{message}</p>
          {lastTxId && (
            <a
              href={algorandService.getTransactionUrl(lastTxId)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline text-sm mt-2 block"
            >
              View Transaction →
            </a>
          )}
        </div>
      )}

      {/* Enhanced Mint Modal */}
      {showMintModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span className="text-blue-600 font-bold text-lg">$</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Mint Digital Notes</h3>
                  <p className="text-sm text-gray-500">Convert ALGO into digital cash notes</p>
                </div>
              </div>
              <button
                onClick={() => setShowMintModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6">

              <div className="space-y-6">
                {/* Available Balance */}
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <p className="text-blue-600 mb-1 text-sm font-medium">Available Balance</p>
                  <p className="text-2xl font-bold text-blue-700">{contractBalance.toFixed(4)} ALGO</p>
                </div>

                {/* Denominations */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-4">
                    Select Denomination & Quantity
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[1, 2, 5, 10].map((denom) => {
                      const maxQuantity = Math.floor(contractBalance / denom);
                      return (
                        <div
                          key={denom}
                          className={`border-2 rounded-lg p-4 transition-colors cursor-pointer ${
                            selectedDenomination === denom
                              ? "border-blue-500 bg-blue-50"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                          onClick={() => {
                            setSelectedDenomination(denom);
                            setMintQuantity(1);
                          }}
                        >
                          <div className="text-center">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                              <span className="text-blue-600 font-bold text-lg">{denom}</span>
                            </div>
                            <p className="font-semibold text-gray-900">{denom} ALGO</p>
                            <p className="text-xs text-gray-500">Max: {maxQuantity}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Quantity Input */}
                {selectedDenomination > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Quantity
                    </label>
                    <input
                      type="number"
                      value={mintQuantity}
                      onChange={(e) => setMintQuantity(parseInt(e.target.value) || 1)}
                      min="1"
                      max={Math.floor(contractBalance / selectedDenomination)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                )}

                {/* Selected Summary */}
                {selectedDenomination > 0 && mintQuantity > 0 && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-600 mb-2 text-sm font-medium">Selected</p>
                    <p className="text-lg font-bold text-gray-900">
                      {mintQuantity} × {selectedDenomination} ALGO = {(selectedDenomination * mintQuantity).toFixed(4)} ALGO
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowMintModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleMintNotes}
                    disabled={loading || selectedDenomination === 0 || mintQuantity === 0}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    {loading ? "Minting..." : "Mint Notes"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MintInterface;
