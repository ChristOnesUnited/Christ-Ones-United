const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const supabase = require('./supabase');

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
  if (req.method !== 'POST') return res.status(405).send('Method not allowed');

  const rawBody = await getRawBody(req);
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {

    case 'checkout.session.completed': {
      const session = event.data.object;
      const { name, profileType, planKey } = session.metadata;
      const email = session.customer_email;
      const customerId = session.customer;
      const subscriptionId = session.subscription;

      // Save or update user in Supabase
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single();

      if (existing) {
        await supabase.from('users').update({
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          status: 'active',
          plan: planKey.includes('annual') ? 'annual' : 'monthly',
        }).eq('email', email);
      } else {
        await supabase.from('users').insert([{
          name: name || email,
          email,
          type: profileType || 'individual',
          plan: planKey.includes('annual') ? 'annual' : 'monthly',
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          status: 'active',
          faith_answer: 'yes',
        }]);
      }

      console.log(`✅ Payment complete: ${email} (${planKey})`);
      break;
    }

    case 'invoice.payment_succeeded': {
      const invoice = event.data.object;
      await supabase.from('users')
        .update({ status: 'active' })
        .eq('stripe_customer_id', invoice.customer);
      console.log(`💳 Renewal succeeded: ${invoice.customer}`);
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      await supabase.from('users')
        .update({ status: 'pending' })
        .eq('stripe_customer_id', invoice.customer);
      console.log(`❌ Payment failed: ${invoice.customer}`);
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      await supabase.from('users')
        .update({ status: 'inactive' })
        .eq('stripe_customer_id', subscription.customer);
      console.log(`🚫 Subscription cancelled: ${subscription.customer}`);
      break;
    }

    default:
      console.log(`Unhandled event: ${event.type}`);
  }

  res.status(200).json({ received: true });
};
