#!/usr/bin/env node

/**
 * Frontend Environment Setup Script
 * This script helps you create the .env file for the frontend
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envContent = `# User Configuration
VITE_USER_MNEMONIC=
# Contract Configuration
VITE_APP_ID=

# Network Configuration
VITE_ALGOD_BASE_URL=https://testnet-api.algonode.cloud

# Liquidity Pool Configuration (Optional)
# If not provided, will use VITE_USER_MNEMONIC as liquidity pool
# VITE_LIQUIDITY_POOL_MNEMONIC=your_liquidity_pool_25_word_mnemonic_phrase_here
`;

const envPath = path.join(__dirname, ".env");

try {
  fs.writeFileSync(envPath, envContent);
  console.log("✅ .env file created successfully!");
  console.log("📁 Location:", envPath);
  console.log("");
  console.log("🔧 Configuration:");
  console.log("   - User Wallet: Uses VITE_USER_MNEMONIC");
  console.log("   - Liquidity Pool: Uses VITE_USER_MNEMONIC (same wallet)");
  console.log("   - Contract: APP_ID=745696331");
  console.log("   - Network: TestNet");
  console.log("");
  console.log("🚀 You can now run: npm run dev");
} catch (error) {
  console.error("❌ Error creating .env file:", error.message);
  console.log("");
  console.log("📝 Manual Setup:");
  console.log("Create a .env file in the frontend/start directory with:");
  console.log(envContent);
}
