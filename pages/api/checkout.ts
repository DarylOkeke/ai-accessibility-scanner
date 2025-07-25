import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';

// Initialize Stripe with the secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
});

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
    // Extract priceId or plan from request body
    const { priceId, plan } = req.body;

    // Use priceId directly or map plan to priceId
    let finalPriceId = priceId;
    if (plan && !priceId) {
      // You can add plan mapping logic here if needed
      // For example:
      // const planToPriceId = {
      //   'basic': 'price_basic_id',
      //   'pro': 'price_pro_id',
      //   'enterprise': 'price_enterprise_id'
      // };
      // finalPriceId = planToPriceId[plan];
      finalPriceId = plan; // Assuming plan is already a Stripe price ID
    }

    if (!finalPriceId) {
      return res.status(400).json({ error: 'priceId or plan is required' });
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price: finalPriceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
      automatic_tax: { enabled: true },
      billing_address_collection: 'required',
      customer_creation: 'always',
      metadata: {
        plan: plan || 'custom',
      },
    });

    // Return the session ID
    return res.status(200).json({ sessionId: session.id });

  } catch (error: any) {
    console.error('Stripe checkout error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}
