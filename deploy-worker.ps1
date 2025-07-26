# Clynzer Worker Deployment Script for Fly.io (PowerShell)
# This script automates the complete deployment process for the background worker

param(
    [string]$UPSTASH_REDIS_URL = "",
    [string]$SENDGRID_API_KEY = "",
    [string]$CLERK_SECRET_KEY = "",
    [string]$OPENAI_API_KEY = "",
    [string]$SENDGRID_FROM_EMAIL = ""
)

$ErrorActionPreference = "Stop"

Write-Host "🚀 Starting Clynzer Worker deployment to Fly.io..." -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green

# Step 1: Install Fly CLI if not already installed
Write-Host "📦 Step 1: Checking Fly CLI installation..." -ForegroundColor Yellow

try {
    $flyVersion = flyctl version 2>$null
    Write-Host "✅ Fly CLI already installed: $flyVersion" -ForegroundColor Green
} catch {
    Write-Host "Fly CLI not found. Installing..." -ForegroundColor Yellow
    
    try {
        # Use official PowerShell install script
        Write-Host "Installing Fly CLI via official PowerShell script..." -ForegroundColor Yellow
        Invoke-WebRequest -Uri "https://fly.io/install.ps1" -UseBasicParsing | Invoke-Expression
        
        # Add to PATH for current session
        $env:PATH = "$env:USERPROFILE\.fly\bin;$env:PATH"
        
        Write-Host "✅ Fly CLI installed successfully" -ForegroundColor Green
    } catch {
        Write-Host "❌ Failed to install Fly CLI. Please install manually from https://fly.io/docs/hands-on/install-flyctl/" -ForegroundColor Red
        exit 1
    }
}

# Step 2: Verify Fly CLI is accessible
Write-Host "🔧 Step 2: Verifying Fly CLI accessibility..." -ForegroundColor Yellow

try {
    $flyVersion = flyctl version
    Write-Host "✅ Fly CLI is ready: $flyVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Fly CLI not accessible. Please add it to your PATH manually." -ForegroundColor Red
    Write-Host "Common path: $env:USERPROFILE\.fly\bin" -ForegroundColor Yellow
    exit 1
}

# Step 3: Authenticate with Fly.io
Write-Host "🔐 Step 3: Authenticating with Fly.io..." -ForegroundColor Yellow
Write-Host "This will open your browser for authentication..." -ForegroundColor Cyan

try {
    flyctl auth login
    $currentUser = flyctl auth whoami
    Write-Host "✅ Successfully authenticated as: $currentUser" -ForegroundColor Green
} catch {
    Write-Host "❌ Authentication failed. Please try again." -ForegroundColor Red
    exit 1
}

# Step 4: Launch Fly.io app without deploying
Write-Host "🏗️  Step 4: Creating Fly.io application..." -ForegroundColor Yellow
Write-Host "App name: clynzer-worker" -ForegroundColor Cyan
Write-Host "Using Dockerfile for build configuration" -ForegroundColor Cyan

# Check if app already exists
$appExists = $false
try {
    $apps = flyctl apps list 2>$null
    if ($apps -match "clynzer-worker") {
        $appExists = $true
        Write-Host "⚠️  App 'clynzer-worker' already exists. Skipping creation." -ForegroundColor Yellow
    }
} catch {
    # App list failed, continue with creation
}

if (-not $appExists) {
    try {
        Write-Host "Creating new Fly.io application..." -ForegroundColor Yellow
        flyctl launch --name clynzer-worker --dockerfile Dockerfile --no-deploy --yes
        Write-Host "✅ Application 'clynzer-worker' created successfully" -ForegroundColor Green
    } catch {
        Write-Host "❌ Failed to create application. Error: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
}

# Step 5: Set required secrets
Write-Host "🔑 Step 5: Configuring environment secrets..." -ForegroundColor Yellow

function Set-FlySecret {
    param(
        [string]$SecretName,
        [string]$SecretValue,
        [string]$Description
    )
    
    if ([string]::IsNullOrEmpty($SecretValue)) {
        $SecretValue = Read-Host -Prompt "Please enter $Description" -AsSecureString
        $SecretValue = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecretValue))
    }
    
    if ([string]::IsNullOrEmpty($SecretValue)) {
        Write-Host "❌ $SecretName cannot be empty" -ForegroundColor Red
        exit 1
    }
    
    try {
        flyctl secrets set --app clynzer-worker "$SecretName=$SecretValue"
        Write-Host "✅ Set $SecretName" -ForegroundColor Green
    } catch {
        Write-Host "❌ Failed to set $SecretName" -ForegroundColor Red
        exit 1
    }
}

# Set required secrets
Write-Host "Setting up required secrets..." -ForegroundColor Cyan
Set-FlySecret -SecretName "UPSTASH_REDIS_URL" -SecretValue $UPSTASH_REDIS_URL -Description "Upstash Redis URL (rediss://...)"
Set-FlySecret -SecretName "SENDGRID_API_KEY" -SecretValue $SENDGRID_API_KEY -Description "SendGrid API Key (SG...)"
Set-FlySecret -SecretName "CLERK_SECRET_KEY" -SecretValue $CLERK_SECRET_KEY -Description "Clerk Secret Key (sk_...)"

# Optional secrets
Write-Host ""
Write-Host "Setting up optional secrets..." -ForegroundColor Cyan

# OpenAI API Key (optional)
if (-not [string]::IsNullOrEmpty($OPENAI_API_KEY)) {
    flyctl secrets set --app clynzer-worker "OPENAI_API_KEY=$OPENAI_API_KEY"
    Write-Host "✅ Set OPENAI_API_KEY from parameter" -ForegroundColor Green
} else {
    $openaiKey = Read-Host -Prompt "OPENAI_API_KEY (for AI-generated fixes, optional - press Enter to skip)"
    if (-not [string]::IsNullOrEmpty($openaiKey)) {
        flyctl secrets set --app clynzer-worker "OPENAI_API_KEY=$openaiKey"
        Write-Host "✅ Set OPENAI_API_KEY" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Skipped OPENAI_API_KEY (AI fixes will be disabled)" -ForegroundColor Yellow
    }
}

# SendGrid From Email (optional)
if (-not [string]::IsNullOrEmpty($SENDGRID_FROM_EMAIL)) {
    flyctl secrets set --app clynzer-worker "SENDGRID_FROM_EMAIL=$SENDGRID_FROM_EMAIL"
    Write-Host "✅ Set SENDGRID_FROM_EMAIL from parameter" -ForegroundColor Green
} else {
    $sendgridEmail = Read-Host -Prompt "SENDGRID_FROM_EMAIL (e.g., reports@clynzer.com, optional - press Enter to skip)"
    if (-not [string]::IsNullOrEmpty($sendgridEmail)) {
        flyctl secrets set --app clynzer-worker "SENDGRID_FROM_EMAIL=$sendgridEmail"
        Write-Host "✅ Set SENDGRID_FROM_EMAIL" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Skipped SENDGRID_FROM_EMAIL" -ForegroundColor Yellow
    }
}

Write-Host "✅ All secrets configured successfully" -ForegroundColor Green

# Step 6: Deploy the application
Write-Host "🚀 Step 6: Deploying worker application..." -ForegroundColor Yellow
Write-Host "This may take a few minutes to build and deploy..." -ForegroundColor Cyan

try {
    flyctl deploy --app clynzer-worker
    Write-Host "✅ Deployment successful!" -ForegroundColor Green
} catch {
    Write-Host "❌ Deployment failed. Check the logs for details." -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 7: Show application status
Write-Host "📊 Step 7: Checking application status..." -ForegroundColor Yellow
try {
    flyctl status --app clynzer-worker
} catch {
    Write-Host "⚠️  Could not retrieve status, but deployment completed" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎉 Deployment completed successfully!" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
Write-Host "Application: clynzer-worker" -ForegroundColor Cyan
Write-Host ""
Write-Host "Useful commands:" -ForegroundColor Yellow
Write-Host "  flyctl logs --app clynzer-worker           # View logs" -ForegroundColor White
Write-Host "  flyctl status --app clynzer-worker         # Check status" -ForegroundColor White
Write-Host "  flyctl scale count 2 --app clynzer-worker  # Scale to 2 instances" -ForegroundColor White
Write-Host "  flyctl secrets list --app clynzer-worker   # List secrets" -ForegroundColor White
Write-Host ""

# Ask if user wants to tail logs
$response = Read-Host "Would you like to tail the logs now? (y/n)"
if ($response -match "^[Yy]") {
    Write-Host "📝 Tailing logs for clynzer-worker (Ctrl+C to exit)..." -ForegroundColor Yellow
    Write-Host "Look for messages like:" -ForegroundColor Cyan
    Write-Host "  '🚀 Scan worker started successfully'" -ForegroundColor White
    Write-Host "  'Processing scan job X for URL: ...'" -ForegroundColor White
    Write-Host "  '✅ Scan job X completed'" -ForegroundColor White
    Write-Host ""
    
    try {
        flyctl logs --app clynzer-worker --follow
    } catch {
        Write-Host "❌ Failed to tail logs. Use 'flyctl logs --app clynzer-worker' manually." -ForegroundColor Red
    }
} else {
    Write-Host "✅ Deployment complete! Use 'flyctl logs --app clynzer-worker' to view logs later." -ForegroundColor Green
}

Write-Host ""
Write-Host "🎯 Next steps:" -ForegroundColor Yellow
Write-Host "1. Test the worker by submitting a scan job through your frontend" -ForegroundColor White
Write-Host "2. Monitor logs to ensure jobs are being processed" -ForegroundColor White
Write-Host "3. Scale the worker if needed based on queue depth" -ForegroundColor White
Write-Host "4. Set up monitoring and alerts for production use" -ForegroundColor White
