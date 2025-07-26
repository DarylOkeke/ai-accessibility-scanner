#!/bin/bash

# Clynzer Worker Deployment Script for Fly.io
# This script automates the complete deployment process for the background worker

set -e  # Exit on any error

echo "🚀 Starting Clynzer Worker deployment to Fly.io..."
echo "=================================================="

# Step 1: Install Fly CLI if not already installed
echo "📦 Step 1: Checking Fly CLI installation..."
if ! command -v flyctl &> /dev/null; then
    echo "Fly CLI not found. Installing..."
    
    # Detect OS and install accordingly
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS - use Homebrew if available, otherwise use install script
        if command -v brew &> /dev/null; then
            echo "Installing Fly CLI via Homebrew..."
            brew install flyctl
        else
            echo "Homebrew not found. Using official install script..."
            curl -L https://fly.io/install.sh | sh
        fi
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux - use official install script
        echo "Installing Fly CLI via official script..."
        curl -L https://fly.io/install.sh | sh
    else
        echo "❌ Unsupported OS. Please install Fly CLI manually from https://fly.io/docs/hands-on/install-flyctl/"
        exit 1
    fi
else
    echo "✅ Fly CLI already installed: $(flyctl version)"
fi

# Step 2: Add Fly CLI to PATH if necessary
echo "🔧 Step 2: Ensuring Fly CLI is in PATH..."
if ! command -v flyctl &> /dev/null; then
    # Try to add common installation paths
    export PATH="$HOME/.fly/bin:$PATH"
    
    if ! command -v flyctl &> /dev/null; then
        echo "❌ Fly CLI installation failed or not in PATH."
        echo "Please add the Fly CLI to your PATH manually and re-run this script."
        echo "Common paths: ~/.fly/bin or /usr/local/bin"
        exit 1
    fi
fi

echo "✅ Fly CLI is ready: $(flyctl version)"

# Step 3: Authenticate with Fly.io
echo "🔐 Step 3: Authenticating with Fly.io..."
echo "This will open your browser for authentication..."
flyctl auth login

# Verify authentication
if ! flyctl auth whoami &> /dev/null; then
    echo "❌ Authentication failed. Please try again."
    exit 1
fi

echo "✅ Successfully authenticated as: $(flyctl auth whoami)"

# Step 4: Launch Fly.io app without deploying
echo "🏗️  Step 4: Creating Fly.io application..."
echo "App name: clynzer-worker"
echo "Using Dockerfile for build configuration"

# Check if app already exists
if flyctl apps list | grep -q "clynzer-worker"; then
    echo "⚠️  App 'clynzer-worker' already exists. Skipping creation."
else
    echo "Creating new Fly.io application..."
    flyctl launch --name clynzer-worker --dockerfile Dockerfile --no-deploy --yes
    echo "✅ Application 'clynzer-worker' created successfully"
fi

# Step 5: Set required secrets
echo "🔑 Step 5: Configuring environment secrets..."
echo "You'll need to provide the following secrets:"

# Function to prompt for secret if not provided as environment variable
set_secret() {
    local secret_name=$1
    local secret_description=$2
    
    # Check if secret is already provided as environment variable
    if [[ -n "${!secret_name}" ]]; then
        echo "Using $secret_name from environment variable"
        flyctl secrets set --app clynzer-worker "$secret_name=${!secret_name}"
    else
        echo "Please enter $secret_description:"
        echo -n "$secret_name: "
        read -s secret_value
        echo  # New line after hidden input
        
        if [[ -n "$secret_value" ]]; then
            flyctl secrets set --app clynzer-worker "$secret_name=$secret_value"
            echo "✅ Set $secret_name"
        else
            echo "❌ $secret_name cannot be empty"
            exit 1
        fi
    fi
}

# Set required secrets
echo "Setting up required secrets..."
set_secret "UPSTASH_REDIS_URL" "Upstash Redis URL (rediss://...)"
set_secret "SENDGRID_API_KEY" "SendGrid API Key (SG...)"
set_secret "CLERK_SECRET_KEY" "Clerk Secret Key (sk_...)"

# Optional secrets with prompts
echo ""
echo "Setting up optional secrets (press Enter to skip)..."

# OpenAI API Key (optional but recommended)
if [[ -n "$OPENAI_API_KEY" ]]; then
    flyctl secrets set --app clynzer-worker "OPENAI_API_KEY=$OPENAI_API_KEY"
    echo "✅ Set OPENAI_API_KEY from environment"
else
    echo -n "OPENAI_API_KEY (for AI-generated fixes, optional): "
    read -s openai_key
    echo
    if [[ -n "$openai_key" ]]; then
        flyctl secrets set --app clynzer-worker "OPENAI_API_KEY=$openai_key"
        echo "✅ Set OPENAI_API_KEY"
    else
        echo "⚠️  Skipped OPENAI_API_KEY (AI fixes will be disabled)"
    fi
fi

# SendGrid From Email (optional)
if [[ -n "$SENDGRID_FROM_EMAIL" ]]; then
    flyctl secrets set --app clynzer-worker "SENDGRID_FROM_EMAIL=$SENDGRID_FROM_EMAIL"
    echo "✅ Set SENDGRID_FROM_EMAIL from environment"
else
    echo -n "SENDGRID_FROM_EMAIL (e.g., reports@clynzer.com, optional): "
    read sendgrid_email
    if [[ -n "$sendgrid_email" ]]; then
        flyctl secrets set --app clynzer-worker "SENDGRID_FROM_EMAIL=$sendgrid_email"
        echo "✅ Set SENDGRID_FROM_EMAIL"
    else
        echo "⚠️  Skipped SENDGRID_FROM_EMAIL"
    fi
fi

echo "✅ All secrets configured successfully"

# Step 6: Deploy the application
echo "🚀 Step 6: Deploying worker application..."
echo "This may take a few minutes to build and deploy..."

flyctl deploy --app clynzer-worker

if [[ $? -eq 0 ]]; then
    echo "✅ Deployment successful!"
else
    echo "❌ Deployment failed. Check the logs for details."
    exit 1
fi

# Step 7: Show application status and tail logs
echo "📊 Step 7: Checking application status..."
flyctl status --app clynzer-worker

echo ""
echo "🎉 Deployment completed successfully!"
echo "=================================================="
echo "Application: clynzer-worker"
echo "Status: $(flyctl status --app clynzer-worker | grep -o 'deployed')"
echo ""
echo "Useful commands:"
echo "  flyctl logs --app clynzer-worker           # View logs"
echo "  flyctl status --app clynzer-worker         # Check status"
echo "  flyctl scale count 2 --app clynzer-worker  # Scale to 2 instances"
echo "  flyctl secrets list --app clynzer-worker   # List secrets"
echo ""

# Ask if user wants to tail logs
echo "Would you like to tail the logs now? (y/n)"
read -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "📝 Tailing logs for clynzer-worker (Ctrl+C to exit)..."
    echo "Look for messages like:"
    echo "  '🚀 Scan worker started successfully'"
    echo "  'Processing scan job X for URL: ...'"
    echo "  '✅ Scan job X completed'"
    echo ""
    flyctl logs --app clynzer-worker --follow
else
    echo "✅ Deployment complete! Use 'flyctl logs --app clynzer-worker' to view logs later."
fi

echo ""
echo "🎯 Next steps:"
echo "1. Test the worker by submitting a scan job through your frontend"
echo "2. Monitor logs to ensure jobs are being processed"
echo "3. Scale the worker if needed based on queue depth"
echo "4. Set up monitoring and alerts for production use"
