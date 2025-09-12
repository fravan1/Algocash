# AlgoCash Claim Website

A minimal React website for claiming/withdrawing AlgoCash digital notes. Users can scan QR codes or visit URLs with unique codes to automatically claim their digital notes.

## 🎯 Features

- **URL Parameter Extraction**: Automatically extracts unique codes from URL parameters (`?id=`, `?code=`, `?unique=`)
- **Code Verification**: Verifies unique codes against the Algorand blockchain
- **Clean Interface**: Minimal, mobile-friendly design
- **Auto-fill**: Pre-fills unique code from URL
- **Real-time Validation**: Shows amount and validity of codes

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Development Server

```bash
npm run dev
```

The website will be available at `http://localhost:3001`

### 3. Build for Production

```bash
npm run build
```

## 🔗 URL Usage

Users can access the claim page with unique codes in the URL:

- `https://your-domain.com/?id=ABC123XYZ789`
- `https://your-domain.com/?code=ABC123XYZ789`
- `https://your-domain.com/?unique=ABC123XYZ789`

The unique code will be automatically extracted and pre-filled in the form.

## 🏗️ Project Structure

```
algocash-claim/
├── src/
│   ├── App.tsx          # Main application component
│   ├── main.tsx         # Application entry point
│   └── vite-env.d.ts    # TypeScript definitions
├── index.html           # HTML template
├── package.json         # Dependencies and scripts
├── vite.config.ts       # Vite configuration
└── README.md           # This file
```

## 🔧 Configuration

The website is configured to work with:

- **Network**: Algorand TestNet
- **API**: AlgoNode (free, no API key required)
- **Contract ID**: 745702881 (your deployed AlgoCash contract)

To change the contract ID, update the `APP_ID` constant in `src/App.tsx`.

## 📱 Mobile Friendly

The website is designed to be mobile-friendly and works well on:

- Desktop browsers
- Mobile browsers
- QR code scanners that open URLs

## 🌐 Hosting

This website can be hosted on any static hosting service:

- **Vercel**: `vercel --prod`
- **Netlify**: Drag and drop the `dist` folder
- **GitHub Pages**: Use GitHub Actions
- **Firebase Hosting**: `firebase deploy`
- **Any static hosting**: Upload the `dist` folder

## 🔒 Security

- **TestNet Only**: Configured for Algorand TestNet
- **No Private Keys**: No private keys stored or used
- **Read-Only**: Only reads from blockchain, doesn't write
- **Validation**: All inputs are validated

## 🎨 Customization

The website uses inline styles for simplicity. To customize:

1. **Colors**: Update the Tailwind classes in `App.tsx`
2. **Logo**: Replace the `$` symbol with your logo
3. **Branding**: Update the title and description
4. **Styling**: Modify the CSS classes

## 📋 Usage Flow

1. **User scans QR code** or visits URL with unique code
2. **Website extracts code** from URL parameters
3. **User verifies code** by clicking "Verify" button
4. **Website shows amount** and validity
5. **User enters address** and clicks "Claim"
6. **Website processes claim** (calls backend API)

## 🔗 Integration

To integrate with your backend:

1. Replace the mock claim logic in `handleClaim()` function
2. Add API call to your backend withdrawal endpoint
3. Handle real transaction processing
4. Show transaction IDs and explorer links

## 📄 License

MIT License - feel free to use and modify as needed.
