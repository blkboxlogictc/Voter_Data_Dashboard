# GitHub Auto-Deploy Setup for Netlify

## Why GitHub Auto-Deploy is Better

Manual deployment to Netlify doesn't properly build and deploy the Netlify functions that handle chunked uploads. GitHub auto-deploy ensures:

1. **Proper function building**: Netlify automatically builds your functions during deployment
2. **Environment consistency**: Same build process every time
3. **Automatic updates**: Push to GitHub = automatic deployment
4. **Function routing**: Proper API routing to `/.netlify/functions/`

## Setup Steps

### 1. Push to GitHub

```bash
# Initialize git repository (if not already done)
git init

# Add all files
git add .

# Commit changes
git commit -m "Initial commit - Voter Data Dashboard"

# Add GitHub remote (replace with your repository URL)
git remote add origin https://github.com/yourusername/voter-data-dashboard.git

# Push to GitHub
git push -u origin main
```

### 2. Connect to Netlify

1. Go to [Netlify](https://netlify.com)
2. Click "New site from Git"
3. Choose "GitHub" and authorize Netlify
4. Select your repository
5. Configure build settings:
   - **Build command**: `npm run netlify:build`
   - **Publish directory**: `dist/public`
   - **Functions directory**: `netlify/functions`

### 3. Environment Variables (if needed)

In Netlify dashboard > Site settings > Environment variables:

- `NODE_ENV`: `production`
- Any other environment variables your app needs

### 4. Deploy

Once connected, Netlify will automatically:

- Build your site when you push to GitHub
- Deploy the functions properly
- Handle routing correctly

## Verification

After deployment, verify these endpoints work:

- `https://yoursite.netlify.app/.netlify/functions/upload-chunk`
- `https://yoursite.netlify.app/.netlify/functions/process-data`
- `https://yoursite.netlify.app/.netlify/functions/process-data-background`

## Benefits

✅ **Automatic function deployment**
✅ **Proper API routing**
✅ **Consistent builds**
✅ **Easy updates via git push**
✅ **Function logs and monitoring**
