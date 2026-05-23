const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Required to parse raw body for Stripe signature verification
export const config = { api: { bodyParser: false } };

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => resolve(Buffer.from(data)));
    req.on('error', reject);
  });
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).send('Method not allowed');
  }

  const rawBody = await getRawBody(req);
  const sig     = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the events we care about
  switch (event.type) {

    case 'checkout.session.completed': {
      const session = event.data.object;
      const { name, profileType, planKey } = session.metadata;
      console.log(`✅ New subscription: ${name} (${profileType}) on ${planKey}`);
      // TODO: Save to your database (Supabase) when backend is ready
      break;
    }

    case 'invoice.payment_succeeded': {
      const invoice = event.data.object;
      console.log(`💳 Renewal payment succeeded for customer: ${invoice.customer}`);
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      console.log(`❌ Payment failed for customer: ${invoice.customer}`);
      // TODO: Send failure email via Resend when email is wired up
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      console.log(`🚫 Subscription cancelled: ${subscription.id}`);
      // TODO: Deactivate membership in database
      break;
    }

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  res.status(200).json({ received: true });
};
