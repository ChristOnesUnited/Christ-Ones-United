const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

const supabaseService = require('./supabase');
const supabaseAuth = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

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

  let rawBody;
  try {
    rawBody = await getRawBody(req);
  } catch (err) {
    return res.status(400).send('Could not read request body');
  }

  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log(`Webhook received: ${event.type}`);

  try {
    switch (event.type) {

      case 'checkout.session.completed': {
        const session = event.data.object;
        const { name, profileType, planKey } = session.metadata || {};
        const email = session.customer_email;
        const customerId = session.customer;
        const subscriptionId = session.subscription;

        if (!email) { console.error('No email in session'); break; }
        console.log(`Payment complete: ${email} (${planKey})`);

        // Check if user exists in our users table
        const { data: existing } = await supabaseService
          .from('users')
          .select('id')
          .eq('email', email)
          .single();

        if (existing) {
          // Update existing user
          const { error } = await supabaseService.from('users').update({
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            status: 'active',
            plan: planKey && planKey.includes('annual') ? 'annual' : 'monthly',
          }).eq('email', email);
          if (error) console.error('Update error:', error.message);
          else console.log(`Updated user: ${email}`);
        } else {
          // Create new user in users table
          const { error: dbError } = await supabaseService.from('users').insert([{
            name: name || email,
            email,
            type: profileType || 'individual',
            plan: planKey && planKey.includes('annual') ? 'annual' : 'monthly',
            stripe_customer_id: customerId || '',
            stripe_subscription_id: subscriptionId || '',
            status: 'active',
            faith_answer: 'yes',
          }]);
          if (dbError) console.error('Insert error:', dbError.message);
          else console.log(`New user saved: ${email}`);
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        await supabaseService.from('users')
          .update({ status: 'active' })
          .eq('stripe_customer_id', invoice.customer);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        await supabaseService.from('users')
          .update({ status: 'pending' })
          .eq('stripe_customer_id', invoice.customer);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        await supabaseService.from('users')
          .update({ status: 'inactive' })
          .eq('stripe_customer_id', subscription.customer);
        break;
      }

      default:
        console.log(`Unhandled event: ${event.type}`);
    }
  } catch (err) {
    console.error('Webhook handler error:', err.message);
  }

  res.status(200).json({ received: true });
};
