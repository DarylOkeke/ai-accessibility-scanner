import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { buffer } from 'micro';

// Initialize Stripe with the secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
});

// Disable the default body parser to read raw body
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Read the raw request body
    const buf = await buffer(req);
    const signature = req.headers['stripe-signature'] as string;

    if (!signature) {
      return res.status(400).json({ error: 'Missing stripe-signature header' });
    }

    // Verify the webhook event
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        buf,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).json({ error: 'Webhook signature verification failed' });
    }

    // Handle the event based on type
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log('Checkout session completed:', session.id);
        
        // Handle successful checkout
        // You can update user subscription status in your database here
        // Example:
        // await updateUserSubscription({
        //   customerId: session.customer,
        //   subscriptionId: session.subscription,
        //   status: 'active',
        //   plan: session.metadata?.plan
        // });
        
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log('Invoice payment succeeded:', invoice.id);
        
        // Handle successful payment
        // You can update payment records or extend subscription here
        // Example:
        // await updatePaymentRecord({
        //   customerId: invoice.customer,
        //   invoiceId: invoice.id,
        //   amount: invoice.amount_paid,
        //   status: 'paid'
        // });
        
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log('Invoice payment failed:', invoice.id);
        
        // Handle failed payment
        // You might want to notify the user or update subscription status
        // Example:
        // await handlePaymentFailure({
        //   customerId: invoice.customer,
        //   invoiceId: invoice.id,
        //   reason: invoice.last_payment_error?.message
        // });
        
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log('Subscription cancelled:', subscription.id);
        
        // Handle subscription cancellation
        // Example:
        // await updateUserSubscription({
        //   customerId: subscription.customer,
        //   subscriptionId: subscription.id,
        //   status: 'cancelled'
        // });
        
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log('Subscription updated:', subscription.id);
        
        // Handle subscription updates (plan changes, etc.)
        // Example:
        // await updateUserSubscription({
        //   customerId: subscription.customer,
        //   subscriptionId: subscription.id,
        //   status: subscription.status,
        //   currentPeriodEnd: new Date(subscription.current_period_end * 1000)
        // });
        
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // Return success response
    return res.status(200).json({ received: true });

  } catch (error: any) {
    console.error('Webhook error:', error);
    return res.status(500).json({ 
      error: 'Webhook handler failed',
      details: error.message 
    });
  }
}
