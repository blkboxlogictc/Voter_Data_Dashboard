# Deployment Options for Voter Data Dashboard

## The Problem You're Experiencing

Manual deployment to Netlify doesn't properly build and deploy the Netlify functions that handle chunked uploads. This causes 404 errors when trying to upload large files because the `/api/upload-chunk` endpoint doesn't exist.

## Solution 1: GitHub Auto-Deploy (Recommended)

### Why This Works Better

- ✅ **Automatic function building**: Netlify properly builds your functions during deployment
- ✅ **Proper API routing**: Functions are accessible at `/.netlify/functions/`
- ✅ **Consistent builds**: Same build process every time
- ✅ **Easy updates**: Push to GitHub = automatic deployment

### Setup Steps

1. **Push your code to GitHub:**

   ```bash
   git init
   git add .
   git commit -m "Initial commit - Voter Data Dashboard"
   git remote add origin https://github.com/yourusername/voter-data-dashboard.git
   git push -u origin main
   ```

2. **Connect to Netlify:**

   - Go to [Netlify](https://netlify.com)
   - Click "New site from Git"
   - Choose "GitHub" and authorize
   - Select your repository
   - Configure build settings:
     - **Build command**: `npm run netlify:build`
     - **Publish directory**: `dist/public`
     - **Functions directory**: `netlify/functions`

3. **Deploy automatically:**
   - Every push to GitHub will trigger a new deployment
   - Functions will be properly built and deployed

## Solution 2: Client-Only Processing (Works Everywhere)

I've also implemented a fallback system that works with any hosting provider, including manual Netlify deployments.

### How It Works

- **Development**: Always uses client-side processing (no server functions needed)
- **Production**: Tries chunked upload first, falls back to client-side if functions aren't available
- **File size limits**: Up to 100MB files can be processed entirely in the browser

### Benefits

- ✅ **Works with manual deployment**
- ✅ **Works with any hosting provider**
- ✅ **No server-side dependencies**
- ✅ **Handles large files (up to 100MB)**

## Current Implementation

The app now uses a smart fallback system:

```typescript
// In development or small files: Use client-only
if (isDevelopment || fileSizeMB <= 5) {
  const result = await uploadFileClientOnly(file, options);
} else {
  // Production with large files: Try chunked, fallback to client-only
  try {
    const result = await uploadLargeFile(file, options); // Netlify functions
  } catch (error) {
    const result = await uploadFileClientOnly(file, options); // Fallback
  }
}
```

## Recommendation

**For best performance and reliability**: Use GitHub auto-deploy (Solution 1)

**For quick testing or if you prefer manual deployment**: The current implementation will work with the client-only fallback (Solution 2)

## Testing Your Deployment

After deployment, test with different file sizes:

- **Small files (< 5MB)**: Should work immediately
- **Large files (> 5MB)**:
  - With GitHub auto-deploy: Uses chunked upload
  - With manual deployment: Uses client-side processing

## Troubleshooting

If you're still getting 404 errors:

1. Check if functions are deployed: Visit `https://yoursite.netlify.app/.netlify/functions/upload-chunk`
2. If 404: Functions aren't deployed → Use GitHub auto-deploy
3. If functions exist but still failing: Check function logs in Netlify dashboard

The client-only fallback should prevent 404 errors regardless of deployment method.
