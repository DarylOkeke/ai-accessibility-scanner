# AI Accessibility Scanner - Deployment Guide

Complete deployment guide for the Clynzer AI Accessibility Scanner project, covering both the Next.js frontend on Vercel and the BullMQ worker on Fly.io.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Frontend Deployment (Vercel)](#frontend-deployment-vercel)
3. [Worker Deployment (Fly.io)](#worker-deployment-flyio)
4. [Verification & Monitoring](#verification--monitoring)
5. [Troubleshooting](#troubleshooting)

## Prerequisites

Before deploying, ensure you have:

- [ ] GitHub repository with your code
- [ ] Vercel account connected to GitHub
- [ ] Fly.io account and CLI installed
- [ ] Required API keys:
  - SendGrid API key and verified sender email
  - Clerk authentication keys
  - Upstash Redis URL
  - OpenAI API key (for AI fixes)

---

## Frontend Deployment (Vercel)

### 1. GitHub Integration

1. **Push your code to GitHub**:
   ```bash
   git add .
   git commit -m "Deploy: Complete AI accessibility scanner"
   git push origin main
   ```

2. **Connect to Vercel**:
   - Visit [vercel.com](https://vercel.com)
   - Click "Import Project" or "New Project"
   - Select your GitHub repository
   - Choose "Next.js" framework preset

### 2. Environment Variables Setup

In your Vercel project dashboard, go to **Settings > Environment Variables** and add:

```bash
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# SendGrid Email
SENDGRID_API_KEY=SG...
SENDGRID_FROM_EMAIL=reports@clynzer.com

# Upstash Redis
UPSTASH_REDIS_URL=rediss://...

# OpenAI
OPENAI_API_KEY=sk-...

# App Configuration
NEXT_PUBLIC_BASE_URL=https://clynzer.com
SCHEDULED_SCAN_API_KEY=your-secure-api-key-here

# Stripe (if using payments)
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 3. Custom Domain Setup

1. **Add Domain in Vercel**:
   - Go to **Settings > Domains**
   - Add `clynzer.com` and `www.clynzer.com`

2. **Configure DNS Records**:
   ```
   Type: A
   Name: @
   Value: 76.76.19.61 (Vercel IP)
   
   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   ```

3. **SSL Certificate**:
   - Vercel automatically provisions SSL certificates
   - Verify HTTPS is working after DNS propagation

### 4. Deployment Process

1. **Automatic Deployment**:
   - Every push to `main` branch triggers automatic deployment
   - Preview deployments created for pull requests

2. **Manual Promotion**:
   ```bash
   # Via Vercel CLI
   npm i -g vercel
   vercel --prod
   
   # Or promote preview via dashboard
   # Deployments > Select Preview > Promote to Production
   ```

3. **Build Verification**:
   - Check build logs in Vercel dashboard
   - Verify all environment variables are set
   - Test critical pages load correctly

### 5. Smoke Testing

After deployment, verify:

- [ ] Homepage loads (`https://clynzer.com`)
- [ ] Authentication works (sign-in/sign-up)
- [ ] Scan form accepts URLs
- [ ] Dashboard displays user data
- [ ] API endpoints respond correctly

---

## Worker Deployment (Fly.io)

### 1. Fly.io Setup

1. **Install Fly CLI**:
   ```bash
   # macOS/Linux
   curl -L https://fly.io/install.sh | sh
   
   # Windows
   iwr https://fly.io/install.ps1 -useb | iex
   ```

2. **Login to Fly.io**:
   ```bash
   fly auth login
   ```

### 2. Initial App Setup

1. **Launch without deploying** (first time only):
   ```bash
   fly launch --name clynzer-worker --no-deploy
   ```
   
   This creates the app and `fly.toml` without deploying.

2. **Verify configuration files exist**:
   - `Dockerfile` - Container build instructions
   - `fly.toml` - Fly.io configuration
   - `Procfile` - Process definition

### 3. Environment Secrets

Set all required environment variables as secrets:

```bash
# Core Redis connection
fly secrets set UPSTASH_REDIS_URL="rediss://your-upstash-redis-url"

# Email service
fly secrets set SENDGRID_API_KEY="your-sendgrid-api-key"
fly secrets set SENDGRID_FROM_EMAIL="reports@clynzer.com"

# Authentication (if worker needs user context)
fly secrets set CLERK_SECRET_KEY="your-clerk-secret-key"

# AI service for generating fixes
fly secrets set OPENAI_API_KEY="your-openai-api-key"

# Additional app configuration
fly secrets set NODE_ENV="production"
```

### 4. Deploy Worker

1. **Deploy the application**:
   ```bash
   fly deploy
   ```

2. **Verify deployment**:
   ```bash
   fly status
   fly logs
   ```

### 5. Monitor Worker Activity

1. **Tail logs in real-time**:
   ```bash
   fly logs --follow
   ```

2. **Check worker is processing jobs**:
   ```bash
   # Look for log messages like:
   # "🚀 Scan worker started successfully"
   # "Processing scan job 123 for URL: https://example.com"
   # "✅ Scan job 123 completed"
   ```

3. **Scale if needed**:
   ```bash
   # Scale to 2 instances
   fly scale count 2
   
   # Scale to larger machines
   fly scale vm shared-cpu-2x
   ```

---

## Verification & Monitoring

### 1. End-to-End Testing

Test the complete workflow:

1. **Submit a scan request**:
   ```bash
   curl -X POST https://clynzer.com/api/scan \
     -H "Content-Type: application/json" \
     -d '{"url": "https://example.com", "includeAIFixes": true}'
   ```

2. **Check job was queued**:
   ```bash
   # Should return jobId
   {"jobId": "job_123", "status": "queued"}
   ```

3. **Monitor worker logs**:
   ```bash
   fly logs --follow
   # Should show job processing
   ```

4. **Check job completion**:
   ```bash
   curl https://clynzer.com/api/scan/status/job_123
   # Should return completed status with results
   ```

5. **Verify email sent** (if configured):
   - Check SendGrid dashboard for delivery
   - Verify recipient received scan report

### 2. Health Checks & Monitoring

#### Vercel Monitoring

1. **Built-in Analytics**:
   - View in Vercel dashboard under Analytics
   - Monitor page load times, errors, Web Vitals

2. **Custom Health Check**:
   ```javascript
   // pages/api/health.js
   export default function handler(req, res) {
     res.status(200).json({ 
       status: 'healthy', 
       timestamp: new Date().toISOString(),
       version: process.env.VERCEL_GIT_COMMIT_SHA 
     });
   }
   ```

#### Fly.io Monitoring

1. **Worker Health Check**:
   ```bash
   fly status --all
   ```

2. **Redis Connection Test**:
   ```bash
   fly ssh console
   # Inside container:
   node -e "
   const Redis = require('ioredis');
   const redis = new Redis(process.env.UPSTASH_REDIS_URL);
   redis.ping().then(() => console.log('Redis OK')).catch(console.error);
   "
   ```

#### External Monitoring Setup

1. **Sentry Integration**:
   ```bash
   npm install @sentry/nextjs
   
   # Add to next.config.js
   const { withSentryConfig } = require('@sentry/nextjs');
   module.exports = withSentryConfig(nextConfig, sentryWebpackPluginOptions);
   ```

2. **Uptime Monitoring**:
   - Use services like Pingdom, UptimeRobot, or Better Uptime
   - Monitor both frontend (`https://clynzer.com/api/health`) and key user flows

### 3. Performance & Accessibility Verification

#### Lighthouse Testing

```bash
# Install lighthouse CLI
npm install -g lighthouse

# Run performance audit
lighthouse https://clynzer.com --output=html --output-path=./lighthouse-report.html

# Check Core Web Vitals
lighthouse https://clynzer.com --only-categories=performance --chrome-flags="--headless"
```

#### Accessibility Testing

```bash
# Use axe-cli for automated a11y testing
npm install -g @axe-core/cli

# Run accessibility audit
axe https://clynzer.com --save=accessibility-report.json

# Test specific pages
axe https://clynzer.com/dashboard --tags=wcag2a,wcag2aa
```

---

## Troubleshooting

### Common Frontend Issues

#### Build Failures

1. **Environment Variables Missing**:
   ```bash
   # Check Vercel build logs for:
   # "Cannot read property 'CLERK_SECRET_KEY' of undefined"
   
   # Solution: Add missing variables in Vercel dashboard
   ```

2. **TypeScript Errors**:
   ```bash
   # Build fails with type errors
   # Solution: Fix types locally and test build
   npm run build
   ```

#### Runtime Errors

1. **API Route Failures**:
   ```bash
   # Check Vercel Function logs
   # Common: Database connection timeouts, invalid API keys
   ```

2. **Authentication Issues**:
   ```bash
   # Clerk setup issues
   # Verify publishable key matches environment
   # Check domain configuration in Clerk dashboard
   ```

### Common Worker Issues

#### Worker Not Starting

1. **Check Fly.io Status**:
   ```bash
   fly status
   # If unhealthy, check logs
   fly logs
   ```

2. **Docker Build Issues**:
   ```bash
   # Test build locally
   docker build -t worker-test .
   docker run --rm worker-test
   ```

#### Redis Connection Problems

1. **Invalid URL Format**:
   ```bash
   # Check URL format
   fly secrets list
   # Should be: rediss://default:password@host:port
   ```

2. **Connection Timeouts**:
   ```bash
   # Test from worker container
   fly ssh console
   ping your-redis-host.upstash.io
   ```

#### Job Processing Issues

1. **Jobs Not Being Processed**:
   ```bash
   # Check if worker is connected to correct queue
   fly logs --follow
   # Look for: "🚀 Scan worker started successfully"
   ```

2. **Memory/CPU Issues**:
   ```bash
   # Monitor resource usage
   fly status
   # Scale up if needed
   fly scale vm shared-cpu-2x
   ```

### Getting Help

- **Vercel Issues**: [Vercel Support](https://vercel.com/support)
- **Fly.io Issues**: [Fly.io Community](https://community.fly.io/)
- **General Issues**: Check logs first, then consult documentation

### Emergency Recovery

1. **Rollback Vercel Deployment**:
   - Go to Deployments tab
   - Click on previous successful deployment
   - Click "Promote to Production"

2. **Restart Fly.io Worker**:
   ```bash
   fly apps restart clynzer-worker
   ```

3. **Scale Down Problematic Worker**:
   ```bash
   fly scale count 0  # Stop all instances
   # Fix issues, then scale back up
   fly scale count 1
   ```

For future deployments, simply run:
```bash
fly deploy
```

## Monitoring and Management

### View application status:
```bash
fly status
```

### View logs:
```bash
fly logs
```

### Scale the worker:
```bash
# Scale to 2 instances
fly scale count 2

# Scale to different machine sizes
fly scale vm shared-cpu-1x
```

### SSH into the running container:
```bash
fly ssh console
```

### View secrets:
```bash
fly secrets list
```

### Update a secret:
```bash
fly secrets set ENVIRONMENT_VARIABLE="new-value"
```

## Worker Configuration

The worker is configured to:
- Process jobs from the `accessibility-scan` queue
- Connect to Upstash Redis using the `UPSTASH_REDIS_URL`
- Run with 3 concurrent job processors
- Automatically retry failed jobs with exponential backoff
- Clean up completed/failed jobs to prevent memory issues

## Troubleshooting

### Check if worker is processing jobs:
```bash
fly logs --follow
```

### Restart the worker:
```bash
fly apps restart clynzer-worker
```

### Check resource usage:
```bash
fly status --all
```

### Debug connectivity issues:
```bash
fly ssh console
# Inside the container:
node -e "console.log(process.env.UPSTASH_REDIS_URL)"
```

## Production Considerations

1. **Scaling**: Start with 1 instance and scale based on queue depth
2. **Monitoring**: Set up alerts for failed jobs and high queue depth
3. **Secrets Rotation**: Regularly rotate API keys and database credentials
4. **Resource Limits**: Monitor CPU and memory usage, upgrade machine size if needed
5. **Geographic Distribution**: Deploy workers in regions close to your users

## Cost Optimization

- Use shared CPU instances for cost-effective processing
- Scale down during low-traffic periods
- Monitor and optimize job processing times
- Clean up old jobs regularly to reduce memory usage
