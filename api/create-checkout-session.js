const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { siteUrl } = require('./_lib/site');

// Price ID map — LIVE MODE (live Stripe account; needs the live STRIPE_SECRET_KEY in Vercel)
const PRICE_IDS = {
  individual_monthly: 'price_1TaJSN0y6d4Oktey4ILnwsxS',
  individual_annual:  'price_1SxDBT0y6d4Oktey6u44DeKV',
  business_monthly:   'price_1TaJT60y6d4OkteydQi90G7q',
  business_annual:    'price_1TaJTv0y6d4OkteykaibXj7S',
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { planKey, email, name, profileType } = req.body;

  const priceId = PRICE_IDS[planKey];
  if (!priceId) {
    return res.status(400).json({ error: 'Invalid plan selected.' });
  }

  const site = siteUrl(req);

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      customer_email: email,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      metadata: { name, profileType, planKey },
      success_url: `${site}/success.html?session_id={CHECKOUT_SESSION_ID}&plan=${planKey}&type=${profileType}&name=${encodeURIComponent(name)}&email=${encodeURIComponent(email)}`,
      cancel_url: `${site}/?cancelled=true`,
    });

    res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Stripe error:', err.message);
    res.status(500).json({ error: err.message });
  }
};
