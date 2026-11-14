const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const supabase = require('./supabase');


// Saves a cancellation (and the reason the member gave) for the admin Cancellations list,
// Best effort: a problem here must never affect payment handling.
async function recordCancellation(sub, opts) {
  try {
    const details = sub.cancellation_details || {};
    const reason = details.feedback || '';
    const comment = details.comment || '';

    // When the subscription finally ends, keep the reason already saved; only update its status.
    if (opts.status === 'ended') {
      const { data: existing } = await supabase
        .from('cancellations').select('id').eq('stripe_subscription_id', sub.id).single();
      if (existing) {
        await supabase.from('cancellations')
          .update({ status: 'ended', updated_at: new Date().toISOString() })
          .eq('stripe_subscription_id', sub.id);
        return;
      }
    }

    const { data: member } = await supabase
      .from('users').select('id, name, email, type, plan')
      .eq('stripe_customer_id', sub.customer).single();

    const row = {
      stripe_subscription_id: sub.id,
      stripe_customer_id: sub.customer,
      user_id: member ? String(member.id) : '',
      name: member ? (member.name || '') : '',
      email: member ? (member.email || '') : '',
      type: member ? (member.type || 'individual') : 'individual',
      plan: member ? (member.plan || '') : '',
      reason,
      comment,
      status: opts.status,
      ends_at: sub.cancel_at ? new Date(sub.cancel_at * 1000).toISOString()
             : (sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null),
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase
      .from('cancellations').upsert([row], { onConflict: 'stripe_subscription_id' });
    if (error) { console.error('Cancellation save error:', error.message); return; }

  } catch (err) {
    console.error('recordCancellation failed:', err.message);
  }
}

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

        console.log(`Payment complete: ${email} (${type}/${plan})`);

        // Check if user already exists (created by auth-signup during faith verification)
        const { data: existing } = await supabase
          .from('users')
          .select('id, type, plan, status')
          .eq('email', email)
          .single();

        if (existing) {
          // User already exists from auth-signup — only update payment fields
          // Do NOT overwrite type or other profile data
          const { error } = await supabase.from('users').update({
            stripe_customer_id: session.customer || '',
            stripe_subscription_id: session.subscription || '',
            status: existing.status === 'suspended' ? 'suspended' : 'active',
            plan: plan,
            // Only update type if it was defaulted to individual
            ...(existing.type === 'individual' && type === 'business' ? { type } : {}),
          }).eq('email', email);
          if (error) console.error('Update error:', error.message);
          else console.log(`Updated existing user: ${email}`);
        } else {
          // No existing user — create one (fallback if auth-signup failed)
          const { error } = await supabase.from('users').insert([{
            name: name || email,
            email,
            type,
            plan,
            stripe_customer_id: session.customer || '',
            stripe_subscription_id: session.subscription || '',
            status: 'active',
            faith_answer: 'yes',
          }]);
          if (error) console.error('Insert error:', error.message);
          else console.log(`New user saved: ${email}`);
        }
        break;
      }
      case 'invoice.payment_succeeded': {
        const inv = event.data.object;
        await supabase.from('users')
          .update({ status: 'active' })
          .eq('stripe_customer_id', inv.customer);
        break;
      }
      case 'invoice.payment_failed': {
        const inv = event.data.object;
        await supabase.from('users')
          .update({ status: 'pending' })
          .eq('stripe_customer_id', inv.customer);
        break;
      }
      case 'customer.subscription.updated': {
        // A member cancelled (or changed their mind) in Stripe's customer portal
        const sub = event.data.object;
        const prev = event.data.previous_attributes || {};
        if (sub.cancel_at_period_end || sub.cancel_at) {
          if ('cancel_at_period_end' in prev || 'cancel_at' in prev || 'cancellation_details' in prev) {
            await recordCancellation(sub, { status: 'scheduled' });
          }
        } else if (prev.cancel_at_period_end === true || prev.cancel_at) {
          // They un-cancelled before the period ended
          await supabase.from('cancellations')
            .update({ status: 'reversed', updated_at: new Date().toISOString() })
            .eq('stripe_subscription_id', sub.id);
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        await supabase.from('users')
          .update({ status: 'inactive' })
          .eq('stripe_customer_id', sub.customer);
        await recordCancellation(sub, { status: 'ended' });
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
