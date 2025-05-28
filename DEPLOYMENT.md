# Deployment Guide

This guide provides detailed instructions for deploying the Bangla Voice Recorder to GitHub Pages.

## Prerequisites

- GitHub account
- Git installed locally
- Node.js 18+ installed

## Step-by-Step Deployment

### 1. Fork or Clone the Repository

**Option A: Fork (Recommended for beginners)**
1. Go to the repository on GitHub
2. Click the "Fork" button in the top right
3. Clone your fork:
   \`\`\`bash
   git clone https://github.com/YOUR_USERNAME/bangla-recorder.git
   cd bangla-recorder
   \`\`\`

**Option B: Create from scratch**
1. Create a new repository on GitHub named `bangla-recorder`
2. Clone this code to your local machine
3. Initialize git and add remote:
   \`\`\`bash
   git init
   git remote add origin https://github.com/YOUR_USERNAME/bangla-recorder.git
   \`\`\`

### 2. Configure for Your Repository

1. **Update package.json**
   \`\`\`json
   {
     "homepage": "https://YOUR_USERNAME.github.io/bangla-recorder",
     "repository": {
       "type": "git",
       "url": "https://github.com/YOUR_USERNAME/bangla-recorder.git"
     }
   }
   \`\`\`

2. **Update next.config.mjs** (if your repo name is different)
   \`\`\`javascript
   basePath: process.env.NODE_ENV === 'production' ? '/YOUR_REPO_NAME' : '',
   assetPrefix: process.env.NODE_ENV === 'production' ? '/YOUR_REPO_NAME/' : '',
   \`\`\`

### 3. Test Locally

\`\`\`bash
npm install
npm run dev
\`\`\`

Visit `http://localhost:3000` to ensure everything works.

### 4. Deploy to GitHub Pages

**Method 1: Automatic with GitHub Actions (Recommended)**

1. **Push your code**
   \`\`\`bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   \`\`\`

2. **Enable GitHub Pages**
   - Go to your repository on GitHub
   - Click "Settings" tab
   - Scroll to "Pages" section
   - Under "Source", select "GitHub Actions"

3. **Trigger deployment**
   - The workflow will run automatically on push
   - Check the "Actions" tab to monitor progress
   - Once complete, your app will be live at: `https://YOUR_USERNAME.github.io/bangla-recorder`

**Method 2: Manual Deployment**

1. **Install gh-pages**
   \`\`\`bash
   npm install -g gh-pages
   \`\`\`

2. **Build and deploy**
   \`\`\`bash
   npm run build
   npm run deploy
   \`\`\`

3. **Enable GitHub Pages**
   - Go to repository Settings → Pages
   - Set source to "Deploy from a branch"
   - Select "gh-pages" branch

### 5. Verify Deployment

1. Visit your GitHub Pages URL
2. Test microphone permissions
3. Try recording a sample audio
4. Verify export functionality

## Troubleshooting

### Common Issues

**Build fails with "Module not found"**
- Run `npm install` to ensure all dependencies are installed
- Check that all import paths are correct

**App loads but microphone doesn't work**
- GitHub Pages requires HTTPS for microphone access
- Ensure you're accessing via `https://` not `http://`

**404 error on GitHub Pages**
- Verify the basePath in next.config.mjs matches your repository name
- Check that the gh-pages branch was created successfully

**Workflow fails in GitHub Actions**
- Check the Actions tab for detailed error logs
- Ensure all required secrets are set (usually none needed for public repos)

### Advanced Configuration

**Custom Domain**
1. Add a `CNAME` file to the `public/` directory with your domain
2. Configure DNS settings with your domain provider
3. Enable "Enforce HTTPS" in GitHub Pages settings

**Environment Variables**
- For public repositories, avoid sensitive data
- Use build-time environment variables in next.config.mjs if needed

**Performance Optimization**
- The app is already optimized for static export
- Consider enabling compression in your web server
- Use a CDN for better global performance

## Maintenance

### Updating the App

1. Make changes locally
2. Test with `npm run dev`
3. Commit and push to trigger automatic deployment

### Monitoring

- Check GitHub Actions for deployment status
- Monitor Issues tab for user feedback
- Use browser dev tools to debug any client-side issues

## Security Considerations

- The app runs entirely in the browser
- No server-side data storage
- Audio data stays on user's device
- IndexedDB provides local storage only

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review GitHub Actions logs
3. Open an issue in the repository
4. Check browser console for error messages

---

**Your Bangla Voice Recorder should now be live on GitHub Pages! 🎉**
