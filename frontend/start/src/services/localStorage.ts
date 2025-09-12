/**
 * Simple Local Storage Service for AlgoCash
 * Manages local tracking of remaining balance only
 */

class LocalStorageService {
  private readonly BALANCE_KEY = "algocash_remaining_balance";

  // ===== SIMPLE BALANCE MANAGEMENT =====

  // Get remaining balance from local storage
  getRemainingBalance(): number {
    try {
      const stored = localStorage.getItem(this.BALANCE_KEY);
      if (!stored) return 0;

      const balance = parseFloat(stored);
      return isNaN(balance) ? 0 : balance;
    } catch (error) {
      console.error(
        "Error reading remaining balance from localStorage:",
        error
      );
      return 0;
    }
  }

  // Set remaining balance in local storage
  setRemainingBalance(balance: number): void {
    try {
      localStorage.setItem(this.BALANCE_KEY, balance.toString());
      console.log(`✅ Updated remaining balance: ${balance} ALGO`);
    } catch (error) {
      console.error("Error setting remaining balance:", error);
    }
  }

  // Subtract amount from remaining balance
  subtractFromBalance(amount: number): number {
    try {
      const currentBalance = this.getRemainingBalance();
      const newBalance = Math.max(0, currentBalance - amount);
      this.setRemainingBalance(newBalance);
      return newBalance;
    } catch (error) {
      console.error("Error subtracting from balance:", error);
      return 0;
    }
  }

  // Initialize balance from contract balance
  initializeBalance(contractBalance: number): void {
    try {
      this.setRemainingBalance(contractBalance);
      console.log(`✅ Initialized balance: ${contractBalance} ALGO`);
    } catch (error) {
      console.error("Error initializing balance:", error);
    }
  }

  // ===== UTILITY METHODS =====

  // Clear all data
  clearAllData(): void {
    try {
      localStorage.removeItem(this.BALANCE_KEY);
      console.log("✅ Cleared all local data");
    } catch (error) {
      console.error("Error clearing local data:", error);
    }
  }
}

// Export singleton instance
export const localStorageService = new LocalStorageService();
