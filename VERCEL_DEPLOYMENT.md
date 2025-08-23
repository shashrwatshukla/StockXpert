# 🚀 Deploying StockXpert to Vercel

This guide will help you deploy the StockXpert application to Vercel, making it accessible globally with automatic scaling and excellent performance.

## 📋 Prerequisites

Before deploying to Vercel, ensure you have:

- A [Vercel account](https://vercel.com) (free tier available)
- Your StockXpert repository pushed to GitHub, GitLab, or Bitbucket
- [Vercel CLI](https://vercel.com/cli) installed (optional, for local testing)

## 🌐 Deployment Methods

### Method 1: Deploy via Vercel Dashboard (Recommended)

1. **Connect Your Repository**
   - Visit [vercel.com](https://vercel.com) and sign in
   - Click "New Project" 
   - Import your StockXpert repository from GitHub/GitLab/Bitbucket

2. **Configure Project Settings**
   - **Project Name**: `stockxpert` (or your preferred name)
   - **Framework Preset**: Select "Other" 
   - **Root Directory**: Leave as `.` (root)
   - **Build Command**: Leave empty (Vercel auto-detects)
   - **Output Directory**: Leave empty
   - **Install Command**: Leave empty (Vercel uses requirements.txt)

3. **Deploy**
   - Click "Deploy"
   - Vercel will automatically build and deploy your application
   - Wait for deployment to complete (~2-5 minutes)

4. **Access Your Application**
   - Once deployed, you'll get a URL like: `https://stockxpert.vercel.app`
   - The application will be live and accessible globally!

### Method 2: Deploy via Vercel CLI

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy from Project Directory**
   ```bash
   cd /path/to/your/stockxpert
   vercel
   ```

4. **Follow CLI Prompts**
   - Link to existing project or create new one
   - Confirm settings
   - Deploy!

## 🔧 Configuration Files

The repository includes pre-configured files for Vercel deployment:

### `vercel.json`
```json
{
  "version": 2,
  "builds": [
    {
      "src": "api/index.py",
      "use": "@vercel/python"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/index.py"
    },
    {
      "src": "/auth.html",
      "dest": "/auth.html"
    },
    {
      "src": "/auth.css",
      "dest": "/auth.css"
    },
    {
      "src": "/(.*)",
      "dest": "/public/$1"
    },
    {
      "src": "/",
      "dest": "/public/index.html"
    }
  ]
}
```

This configuration:
- Sets up the FastAPI backend as a serverless function
- Routes API calls to `/api/*` endpoints to the Python backend
- Serves static files from the `/public` directory
- Handles the authentication page routing

### Modified `api/index.py`
The FastAPI application has been optimized for Vercel by:
- Removing static file mounting (Vercel handles this automatically)
- Keeping all API endpoints intact
- Maintaining CORS configuration for cross-origin requests

## 🌍 How It Works

### Architecture on Vercel

1. **Frontend (Static Files)**
   - HTML, CSS, JavaScript files served globally via Vercel's CDN
   - Located in `/public/` directory
   - Automatically cached and optimized

2. **Backend (Serverless Functions)**
   - FastAPI application runs as serverless functions
   - Each API endpoint scales automatically
   - Cold start optimized for fast response times

3. **Routing**
   - `/` → Serves the main application (`/public/index.html`)
   - `/auth.html` → Serves the authentication page
   - `/api/*` → Routes to FastAPI backend functions
   - All other paths → Serve static files from `/public/`

## 🎯 Post-Deployment

### Testing Your Deployment

1. **Access the Application**
   - Visit your Vercel URL (e.g., `https://your-app.vercel.app`)
   - Test the authentication page at `/auth.html`
   - Navigate to the main dashboard

2. **Test API Endpoints**
   - Try selecting different stocks
   - Verify charts load correctly
   - Check portfolio functionality
   - Test news feed and similar stocks

3. **Verify Performance**
   - Test on mobile devices
   - Check loading speeds across different regions
   - Monitor Vercel analytics dashboard

### Custom Domain (Optional)

To use your own domain:

1. **In Vercel Dashboard**
   - Go to your project settings
   - Navigate to "Domains" section
   - Add your custom domain
   - Follow DNS configuration instructions

2. **SSL Certificate**
   - Vercel automatically provides SSL certificates
   - Your site will be secure with HTTPS

## 📊 Monitoring & Analytics

Vercel provides built-in monitoring:

- **Performance Analytics**: View loading times and Core Web Vitals
- **Function Logs**: Monitor API endpoint performance and errors
- **Bandwidth Usage**: Track data transfer and usage
- **Error Tracking**: Get alerts for application errors

Access these in your Vercel dashboard under your project's "Analytics" and "Functions" tabs.

## 🛠 Environment Variables (If Needed)

If you need to add environment variables:

1. **In Vercel Dashboard**
   - Go to Project Settings → Environment Variables
   - Add any required variables
   - Redeploy to apply changes

2. **Via CLI**
   ```bash
   vercel env add VARIABLE_NAME
   ```

## 🔄 Automatic Deployments

Once connected to your Git repository:

- **Push to main branch** → Automatic production deployment
- **Push to other branches** → Preview deployments
- **Pull requests** → Preview deployments with unique URLs

## 🚨 Troubleshooting

### Common Issues

1. **Build Fails**
   - Check that `requirements.txt` contains all dependencies
   - Verify Python version compatibility (Vercel supports Python 3.9+)

2. **API Endpoints Not Working**
   - Ensure `vercel.json` routing is correct
   - Check function logs in Vercel dashboard

3. **Static Files Not Loading**
   - Verify files are in `/public/` directory
   - Check that paths in HTML/CSS are relative

4. **CORS Issues**
   - The FastAPI app already includes CORS middleware
   - If issues persist, check browser console for specific errors

### Getting Help

- **Vercel Documentation**: [vercel.com/docs](https://vercel.com/docs)
- **Vercel Community**: [github.com/vercel/vercel/discussions](https://github.com/vercel/vercel/discussions)
- **StockXpert Issues**: Create an issue in the project repository

## 🎉 Success!

Once deployed, your StockXpert application will be:

- ✅ **Globally accessible** with fast loading times
- ✅ **Automatically scaled** based on usage
- ✅ **Continuously deployed** from your Git repository
- ✅ **Secure** with automatic HTTPS
- ✅ **Monitored** with built-in analytics

Your contribution to making StockXpert accessible to everyone is now complete! 🚀

---

**Need help?** Feel free to create an issue or reach out to the project maintainers.
