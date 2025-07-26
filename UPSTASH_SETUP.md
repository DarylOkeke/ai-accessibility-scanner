# Upstash Redis Setup Guide

## Overview
This project now uses Upstash Redis for background job processing with BullMQ. This eliminates the need for a local Redis server.

## Setup Instructions

### 1. Create an Upstash Redis Database
1. Go to [Upstash Console](https://console.upstash.com/)
2. Create a new Redis database
3. Choose your region (closer to your deployment for better performance)
4. Copy the **Redis URL** (it should look like: `rediss://default:your_password@your_host:your_port`)

### 2. Update Environment Variables

#### Local Development (.env.local)
```bash
# Upstash Redis Configuration
UPSTASH_REDIS_URL=rediss://default:YOUR_PASSWORD@YOUR_HOST:YOUR_PORT
```

#### Vercel Deployment
1. Go to your Vercel project settings
2. Add the environment variable:
   - **Name**: `UPSTASH_REDIS_URL`
   - **Value**: `rediss://default:YOUR_PASSWORD@YOUR_HOST:YOUR_PORT`
3. Deploy to both Preview and Production environments

### 3. Test the Setup

#### Start the Worker
```bash
npm run worker:dev
```

#### Start the Next.js App
```bash
npm run dev
```

#### Test a Scan
1. Go to `http://localhost:3000`
2. Enter a URL and start a scan
3. The scan should now run as a background job

## Architecture Changes

### Before (Local Redis)
- Required local Redis server installation
- Manual Redis server management
- Development environment complexity

### After (Upstash Redis)
- ✅ Managed Redis service
- ✅ No local installation required
- ✅ TLS encryption by default
- ✅ Automatic scaling
- ✅ Built-in monitoring

## Files Modified
- `lib/queue/scanQueue.ts` - Updated to use Upstash connection
- `lib/queue/worker-improved.ts` - Updated to use Upstash connection
- `.env.local` - Added Upstash Redis URL configuration

## Troubleshooting

### Connection Issues
1. Verify your `UPSTASH_REDIS_URL` is correct
2. Check that the URL includes the `rediss://` protocol (with double 's' for TLS)
3. Ensure the password is properly encoded in the URL

### Worker Not Processing Jobs
1. Make sure the worker is running: `npm run worker:dev`
2. Check the console for connection errors
3. Verify both the API and worker use the same Redis URL

### Testing Connection
The worker will test the Redis connection on startup and show:
- ✅ Upstash Redis connection successful (if working)
- ❌ Upstash Redis connection failed (if there's an issue)
