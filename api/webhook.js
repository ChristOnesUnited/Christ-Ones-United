const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const supabase = require('./supabase');

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
  try { rawBody = await getRawBody(req); }
  catch (err) { return res.status(400).send('Could not read body'); }

  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log(`Webhook: ${event.type}`);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const { name, profileType, planKey } = session.metadata || {};
        const email = session.customer_email;
        if (!email) { console.error('No email in session'); break; }

        const plan = planKey && planKey.includes('annual') ? 'annual' : 'monthly';
        const type = profileType || 'individual';

        // Check existing
        const { data: existing } = await supabase.from('users').select('id').eq('email', email).single();

        if (existing) {
          await supabase.from('users').update({
            stripe_customer_id: session.customer || '',
            stripe_subscription_id: session.subscription || '',
            status: 'active', plan, type,
          }).eq('email', email);
        } else {
          await supabase.from('users').insert([{
            name: name || email, email, type, plan,
            stripe_customer_id: session.customer || '',
            stripe_subscription_id: session.subscription || '',
            status: 'active', faith_answer: 'yes',
          }]);
        }
        console.log(`✅ Payment complete: ${email} (${type}/${plan})`);
        break;
      }
      case 'invoice.payment_succeeded': {
        const inv = event.data.object;
        await supabase.from('users').update({ status: 'active' }).eq('stripe_customer_id', inv.customer);
        break;
      }
      case 'invoice.payment_failed': {
        const inv = event.data.object;
        await supabase.from('users').update({ status: 'pending' }).eq('stripe_customer_id', inv.customer);
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        await supabase.from('users').update({ status: 'inactive' }).eq('stripe_customer_id', sub.customer);
        break;
      }
      default:
        console.log(`Unhandled: ${event.type}`);
    }
  } catch (err) {
    console.error('Webhook handler error:', err.message);
  }

  res.status(200).json({ received: true });
};
