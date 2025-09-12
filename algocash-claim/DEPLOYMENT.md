# 🚀 AlgoCash Claim Website - Deployment Guide

## 📋 Quick Deployment Options

### Option 1: Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### Option 2: Netlify

1. Build the project: `npm run build`
2. Drag the `dist` folder to [netlify.com/drop](https://netlify.com/drop)

### Option 3: GitHub Pages

1. Push to GitHub repository
2. Enable GitHub Pages in repository settings
3. Set source to `gh-pages` branch

### Option 4: Firebase Hosting

```bash
# Install Firebase CLI
npm i -g firebase-tools

# Initialize and deploy
firebase init hosting
firebase deploy
```

## 🔗 URL Structure

Your deployed website will work with these URL patterns:

```
https://your-domain.com/?id=ABC123XYZ789
https://your-domain.com/?code=ABC123XYZ789
https://your-domain.com/?unique=ABC123XYZ789
```

## 📱 QR Code Integration

Generate QR codes with URLs like:

```
https://your-domain.com/?id=UNIQUE_CODE_HERE
```

When users scan the QR code, they'll land on your claim page with the unique code pre-filled.

## ⚙️ Configuration

Before deploying, make sure to:

1. **Update Contract ID** in `src/App.tsx`:

   ```typescript
   const APP_ID = 745702881; // Your contract ID
   ```

2. **Update Network** if needed:
   ```typescript
   const ALGOD_BASE_URL = "https://testnet-api.algonode.cloud";
   ```

## 🔧 Environment Variables (Optional)

For production, you might want to use environment variables:

```typescript
const APP_ID = import.meta.env.VITE_APP_ID || 745702881;
const ALGOD_BASE_URL =
  import.meta.env.VITE_ALGOD_BASE_URL || "https://testnet-api.algonode.cloud";
```

## 📊 Analytics (Optional)

Add Google Analytics or similar:

```html
<!-- In index.html -->
<script
  async
  src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"
></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag() {
    dataLayer.push(arguments);
  }
  gtag("js", new Date());
  gtag("config", "GA_MEASUREMENT_ID");
</script>
```

## 🔒 Security Considerations

- ✅ **TestNet Only**: Safe for public use
- ✅ **No Private Keys**: No sensitive data stored
- ✅ **Read-Only**: Only reads from blockchain
- ✅ **Input Validation**: All inputs are validated

## 📈 Performance

The website is optimized for:

- **Fast Loading**: Minimal dependencies
- **Mobile First**: Responsive design
- **Offline Ready**: Can work with cached data
- **SEO Friendly**: Proper meta tags

## 🎨 Customization

### Change Colors

Update the CSS classes in `src/App.tsx`:

```typescript
// Change from blue to green theme
className = "bg-green-600 hover:bg-green-700";
```

### Add Logo

Replace the `$` symbol with your logo:

```typescript
// Instead of: <span className="text-white font-bold text-2xl">$</span>
<img src="/your-logo.png" alt="AlgoCash" className="w-8 h-8" />
```

### Custom Domain

1. Deploy to your hosting service
2. Add custom domain in hosting settings
3. Update DNS records

## 📞 Support

For issues or questions:

1. Check the console for errors
2. Verify the contract ID is correct
3. Ensure the network is accessible
4. Test with a known valid unique code

## 🎯 Next Steps

After deployment:

1. Test with real QR codes
2. Monitor usage analytics
3. Add backend integration for actual withdrawals
4. Consider adding more features (wallet connection, etc.)
