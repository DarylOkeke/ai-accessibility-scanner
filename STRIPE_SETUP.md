# Environment Variables for Stripe Integration

# Add these to your .env.local file:

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Example Usage:

## 1. Create Checkout Session
POST /api/checkout
Content-Type: application/json

{
  "priceId": "price_1234567890abcdef",
  "plan": "pro"
}

## 2. Webhook Endpoint
POST /api/webhooks
stripe-signature: your_stripe_signature_header

## Supported Webhook Events:
- checkout.session.completed
- invoice.payment_succeeded
- invoice.payment_failed
- customer.subscription.deleted
- customer.subscription.updated

## Frontend Integration Example:
```javascript
// Create checkout session
const response = await fetch('/api/checkout', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    priceId: 'price_1234567890abcdef'
  })
});

const { sessionId } = await response.json();

// Redirect to Stripe checkout
const stripe = Stripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
await stripe.redirectToCheckout({ sessionId });
```
