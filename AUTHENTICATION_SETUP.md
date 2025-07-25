# Clynzer - Authentication Setup

## Clerk Setup Instructions

### 1. Get Your Clerk Keys
1. Go to [Clerk Dashboard](https://dashboard.clerk.com/)
2. Select your application or create a new one
3. Go to **API Keys** section
4. Copy the **Publishable Key** and **Secret Key**

### 2. Update Environment Variables
Update the `.env.local` file with your actual Clerk keys:

```env
# Replace these with your actual Clerk keys
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_actual_publishable_key_here
CLERK_SECRET_KEY=sk_test_your_actual_secret_key_here

# Optional: Customize sign-in/sign-up URLs
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/
```

### 3. Configure Clerk Application
In your Clerk Dashboard:
1. Go to **User & Authentication** > **Sign-in & sign-up**
2. Configure your preferred authentication methods (Email, Google, GitHub, etc.)
3. Set up your domain in **Domains** section for production

### 4. Development
For development, you can use the default localhost settings. Clerk will automatically detect your development environment.

### 5. Production Deployment
For production:
1. Add your production domain to Clerk Dashboard
2. Update environment variables in your hosting platform
3. Ensure HTTPS is enabled

## Features Added

### Authentication Features:
- ✅ **Sign In/Sign Up Pages** - Clean, responsive authentication forms
- ✅ **Protected API Routes** - Only authenticated users can scan websites
- ✅ **User Management** - User profile with Clerk's UserButton component
- ✅ **Authentication Gate** - Main app only accessible when signed in
- ✅ **Modal Authentication** - Sign in/up via modals on the main page
- ✅ **Responsive Design** - Authentication UI works on all screen sizes

### Security Features:
- ✅ **API Protection** - All scan requests require authentication
- ✅ **Middleware Protection** - Routes protected at the middleware level
- ✅ **Environment Variables** - Sensitive keys stored securely
- ✅ **TypeScript Support** - Full type safety with Clerk

## Usage

1. **For New Users**: Click "Sign Up" to create an account
2. **For Existing Users**: Click "Sign In" to access Clynzer
3. **Scanning**: Once authenticated, enter a URL and scan for accessibility issues
4. **Profile Management**: Click the user avatar to manage account settings

## Next Steps

To complete the setup:
1. Replace the placeholder keys in `.env.local` with your actual Clerk keys
2. Configure your preferred authentication methods in Clerk Dashboard
3. Test the authentication flow in development
4. Deploy to production with proper environment variables
