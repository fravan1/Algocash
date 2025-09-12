import React, { useState, useEffect } from "react";
import { algorandService } from "../services/algorand";

interface DigitalNote {
  id: string;
  amount: number;
  status: "active" | "used";
  mintedAt: string;
}

interface ContractInterfaceProps {
  userMnemonic: string;
}

const ContractInterface: React.FC<ContractInterfaceProps> = ({
  userMnemonic,
}) => {
  const [userBalance, setUserBalance] = useState<number>(0);
  const [contractBalance, setContractBalance] = useState<number>(0);
  const [depositAmount, setDepositAmount] = useState<string>("1");
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");
  const [lastTxId, setLastTxId] = useState<string>("");
  const [showSuccessPopup, setShowSuccessPopup] = useState<boolean>(false);

  // Mint states
  const [showMintModal, setShowMintModal] = useState<boolean>(false);
  const [digitalNotes, setDigitalNotes] = useState<DigitalNote[]>([]);

  // Individual denomination quantities
  const [denominationQuantities, setDenominationQuantities] = useState<{
    [key: number]: number;
  }>({
    1: 0,
    2: 0,
    5: 0,
    10: 0,
  });

  const appInfo = algorandService.getAppInfo();

  // Load balances on component mount
  useEffect(() => {
    loadBalances();
    loadDigitalNotes();
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

  const loadDigitalNotes = async () => {
    try {
      const cashTransactions =
        await algorandService.getAllStoredCashFromBlockchain();
      const notes: DigitalNote[] = cashTransactions.map((tx) => ({
        id: tx.uniqueId || `NOTE_${Date.now()}`,
        amount: tx.amount,
        status: "active" as const,
        mintedAt: tx.timestamp,
      }));
      setDigitalNotes(notes);
    } catch (error) {
      console.error("Error loading digital notes:", error);
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

  const handleMintNotes = async () => {
    // Calculate total amount from all denominations
    const totalAmount = Object.entries(denominationQuantities).reduce(
      (sum, [denom, qty]) => sum + parseInt(denom) * qty,
      0
    );

    if (totalAmount === 0) {
      setMessage("Please select at least one note to mint");
      return;
    }

    if (totalAmount > contractBalance) {
      setMessage(
        `❌ Insufficient contract balance. Available: ${contractBalance.toFixed(
          4
        )} ALGO, Requested: ${totalAmount.toFixed(4)} ALGO`
      );
      return;
    }

    // Validate individual denominations
    for (const [denomStr, qty] of Object.entries(denominationQuantities)) {
      const denomination = parseInt(denomStr);
      if (qty > 0 && ![1, 2, 5, 10].includes(denomination)) {
        setMessage(
          `❌ Invalid denomination: ${denomination} ALGO. Only 1, 2, 5, 10 ALGO are allowed`
        );
        return;
      }
    }

    setLoading(true);
    setMessage("Minting digital notes...");

    try {
      // Create new digital notes with unique IDs and store them on-chain
      const newNotes: DigitalNote[] = [];
      const mintedIds: string[] = [];

      // Process each denomination
      for (const [denomStr, qty] of Object.entries(denominationQuantities)) {
        const denomination = parseInt(denomStr);
        if (qty > 0) {
          for (let i = 0; i < qty; i++) {
            // Store each note on blockchain with unique ID
            const result = await algorandService.storeCashOnBlockchain(
              userMnemonic,
              denomination
            );

            const noteId = result.uniqueId;
            mintedIds.push(noteId);

            newNotes.push({
              id: noteId,
              amount: denomination,
              status: "active",
              mintedAt: new Date().toISOString(),
            });
          }
        }
      }

      setDigitalNotes((prev) => [...prev, ...newNotes]);
      setMessage(
        `✅ Minted ${newNotes.length} notes (Total: ${totalAmount} ALGO)`
      );
      setShowMintModal(false);

      // Reset form
      setDenominationQuantities({ 1: 0, 2: 0, 5: 0, 10: 0 });

      // Reload balances and digital notes
      await loadBalances();
      await loadDigitalNotes();
    } catch (error: any) {
      setMessage(`❌ Minting failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
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

  // Calculate total from denomination quantities
  const getTotalFromQuantities = () => {
    return Object.entries(denominationQuantities).reduce(
      (sum, [denom, qty]) => sum + parseInt(denom) * qty,
      0
    );
  };

  const getTotalNotes = () => {
    return Object.values(denominationQuantities).reduce(
      (sum, qty) => sum + qty,
      0
    );
  };

  // Update denomination quantity
  const updateDenominationQuantity = (
    denomination: number,
    quantity: number
  ) => {
    setDenominationQuantities((prev) => ({
      ...prev,
      [denomination]: Math.max(0, quantity),
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">$</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">AlgoCash</h1>
                <p className="text-sm text-gray-500">Smart Contract Platform</p>
              </div>
            </div>

            {/* Utility Buttons */}
            <div className="flex items-center space-x-3">
              <button
                onClick={handleOptIn}
                disabled={loading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium transition-colors"
              >
                Opt In
              </button>
              <button
                onClick={async () => {
                  await loadBalances();
                  await loadDigitalNotes();
                }}
                disabled={loading}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 text-sm font-medium transition-colors"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Digital Cash Management
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Store, manage, and withdraw cash using encrypted unique codes on
            Algorand blockchain
          </p>
        </div>

        {/* Balance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Balance Overview */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Your Balance
              </h3>
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
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Contract Balance
              </h3>
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

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {/* Mint Button */}
          <button
            onClick={() => {
              setMessage(""); // Clear any previous messages
              setShowMintModal(true);
            }}
            disabled={loading || contractBalance <= 0}
            className="flex items-center justify-center px-6 py-4 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:border-blue-300"
          >
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
              <span className="text-blue-600 font-bold text-sm">$</span>
            </div>
            <div className="text-left">
              <p className="font-semibold text-gray-900">Mint Notes</p>
              <p className="text-xs text-gray-500">Create digital cash</p>
            </div>
          </button>

          {/* Withdrawal Button */}
          <button
            onClick={() => setMessage("Withdrawal feature coming soon!")}
            className="flex items-center justify-center px-6 py-4 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 hover:border-green-300"
          >
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
              <svg
                className="w-4 h-4 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            </div>
            <div className="text-left">
              <p className="font-semibold text-gray-900">Withdraw</p>
              <p className="text-xs text-gray-500">Coming soon</p>
            </div>
          </button>

          {/* Deposit Button */}
          <button
            onClick={handleDeposit}
            disabled={loading}
            className="flex items-center justify-center px-6 py-4 bg-blue-600 text-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700"
          >
            <div className="w-8 h-8 bg-white bg-opacity-20 rounded-lg flex items-center justify-center mr-3">
              <svg
                className="w-4 h-4 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
            </div>
            <div className="text-left">
              <p className="font-semibold">Deposit</p>
              <p className="text-xs text-blue-100">Add ALGO to contract</p>
            </div>
          </button>
        </div>

        {/* Quick Deposit Form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Quick Deposit
          </h3>
          <div className="flex gap-4">
            <div className="flex-1">
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
            <div className="flex items-end">
              <button
                onClick={handleDeposit}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
              >
                {loading ? "Processing..." : "Deposit"}
              </button>
            </div>
          </div>
        </div>

        {/* Minted Notes List */}
        {digitalNotes.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">
              Your Minted Digital Notes
            </h3>

            <div className="space-y-3">
              {digitalNotes.map((note) => (
                <div
                  key={note.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <span className="text-blue-600 font-bold text-sm">
                        {note.amount}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">
                        {note.amount} ALGO Note
                      </p>
                      <p className="text-sm text-gray-600 font-mono">
                        ID: {note.id}
                      </p>
                      <p className="text-xs text-gray-500">
                        Created: {new Date(note.mintedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        note.status === "active"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {note.status === "active" ? "Available" : "Used"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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
                <p className="text-xl font-bold text-red-600">{summary.used}</p>
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
                    <th className="text-left py-3 px-4 font-medium text-gray-700">
                      ID
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">
                      Amount
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {digitalNotes.slice(0, 5).map((note) => (
                    <tr key={note.id} className="border-b border-gray-100">
                      <td className="py-3 px-4 font-mono text-xs text-gray-600">
                        {note.id.slice(0, 15)}...
                      </td>
                      <td className="py-3 px-4 font-medium">
                        {note.amount} ALGO
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            note.status === "active"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {note.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-500">
                        {new Date(note.mintedAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {digitalNotes.length > 5 && (
                <p className="text-center text-gray-500 text-sm mt-4">
                  Showing first 5 notes. Total: {digitalNotes.length}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Success Popup */}
      {showSuccessPopup && lastTxId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-6 h-6 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  Deposit Successful!
                </h3>
                <p className="text-gray-600 mb-4">
                  Your ALGO has been deposited to the contract
                </p>
                <div className="bg-gray-50 p-3 rounded-lg mb-4">
                  <p className="text-xs text-gray-500 mb-1">
                    Transaction Hash:
                  </p>
                  <p className="text-sm font-mono text-gray-800 break-all">
                    {lastTxId}
                  </p>
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

      {/* Mint Modal */}
      {showMintModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span className="text-blue-600 font-bold text-lg">$</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    Mint Digital Notes
                  </h3>
                  <p className="text-sm text-gray-500">
                    Convert ALGO into digital cash notes
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setMessage(""); // Clear any messages when closing
                  setShowMintModal(false);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg
                  className="w-6 h-6 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Validation Messages */}
            {message && (
              <div className="px-6 py-3 bg-red-50 border-b border-red-200">
                <div className="flex items-center">
                  <svg
                    className="w-5 h-5 text-red-600 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <p className="text-red-800 text-sm font-medium">{message}</p>
                </div>
              </div>
            )}

            <div className="p-6">
              <div className="space-y-6">
                {/* Available Balance */}
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <p className="text-blue-600 mb-1 text-sm font-medium">
                    Available Balance
                  </p>
                  <p className="text-2xl font-bold text-blue-700">
                    {contractBalance.toFixed(4)} ALGO
                  </p>
                </div>

                {/* Denominations with Individual Input Boxes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-4">
                    Select Quantity for Each Denomination
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[1, 2, 5, 10].map((denom) => {
                      const maxQuantity = Math.floor(contractBalance / denom);
                      const currentQuantity =
                        denominationQuantities[denom] || 0;
                      return (
                        <div
                          key={denom}
                          className="border border-gray-200 rounded-lg p-4 bg-white"
                        >
                          <div className="text-center mb-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                              <span className="text-blue-600 font-bold text-lg">
                                {denom}
                              </span>
                            </div>
                            <p className="font-semibold text-gray-900">
                              {denom} ALGO
                            </p>
                            <p className="text-xs text-gray-500">
                              Max: {maxQuantity}
                            </p>
                          </div>

                          {/* Individual Input Box */}
                          <div className="space-y-2">
                            <label className="block text-xs font-medium text-gray-600">
                              Quantity
                            </label>
                            <input
                              type="number"
                              value={currentQuantity}
                              onChange={(e) => {
                                const value = parseInt(e.target.value) || 0;
                                // Validate that the total doesn't exceed contract balance
                                const currentTotal =
                                  getTotalFromQuantities() -
                                  denom * currentQuantity +
                                  denom * value;
                                if (currentTotal <= contractBalance) {
                                  updateDenominationQuantity(denom, value);
                                } else {
                                  setMessage(
                                    `❌ Cannot mint more than available balance. Max for ${denom} ALGO: ${maxQuantity}`
                                  );
                                }
                              }}
                              min="0"
                              max={maxQuantity}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="0"
                            />
                            {currentQuantity > 0 && (
                              <p className="text-xs text-green-600 font-medium">
                                = {(denom * currentQuantity).toFixed(4)} ALGO
                              </p>
                            )}
                            {currentQuantity > 0 &&
                              currentQuantity >= maxQuantity && (
                                <p className="text-xs text-orange-600 font-medium">
                                  ⚠️ Max quantity reached
                                </p>
                              )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Total Summary */}
                {getTotalNotes() > 0 && (
                  <div
                    className={`p-4 rounded-lg border ${
                      getTotalFromQuantities() > contractBalance * 0.9
                        ? "bg-orange-50 border-orange-200"
                        : "bg-green-50 border-green-200"
                    }`}
                  >
                    <p
                      className={`mb-2 text-sm font-medium ${
                        getTotalFromQuantities() > contractBalance * 0.9
                          ? "text-orange-600"
                          : "text-green-600"
                      }`}
                    >
                      Total Selected
                    </p>
                    <div className="flex justify-between items-center">
                      <div>
                        <p
                          className={`text-lg font-bold ${
                            getTotalFromQuantities() > contractBalance * 0.9
                              ? "text-orange-700"
                              : "text-green-700"
                          }`}
                        >
                          {getTotalNotes()} notes
                        </p>
                        <p
                          className={`text-sm ${
                            getTotalFromQuantities() > contractBalance * 0.9
                              ? "text-orange-600"
                              : "text-green-600"
                          }`}
                        >
                          Total Value: {getTotalFromQuantities().toFixed(4)}{" "}
                          ALGO
                        </p>
                      </div>
                      <div className="text-right">
                        <p
                          className={`text-xs ${
                            getTotalFromQuantities() > contractBalance * 0.9
                              ? "text-orange-500"
                              : "text-green-500"
                          }`}
                        >
                          Remaining:{" "}
                          {(contractBalance - getTotalFromQuantities()).toFixed(
                            4
                          )}{" "}
                          ALGO
                        </p>
                        {getTotalFromQuantities() > contractBalance * 0.9 && (
                          <p className="text-xs text-orange-600 font-medium">
                            ⚠️ Near limit
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => {
                      setMessage(""); // Clear any messages when canceling
                      setShowMintModal(false);
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleMintNotes}
                    disabled={loading || getTotalNotes() === 0}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    {loading ? "Minting..." : `Mint ${getTotalNotes()} Notes`}
                  </button>
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

export default ContractInterface;
