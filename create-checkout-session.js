const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Price ID map — TEST MODE
const PRICE_IDS = {
  individual_monthly: 'price_1TdwP70y6d4OkteyNMLAFfgB',
  individual_annual:  'price_1TdwPR0y6d4OkteyfEZL39qu',
  business_monthly:   'price_1TdwPi0y6d4Oktey8MmLbci1',
  business_annual:    'price_1TdwPy0y6d4OkteygfSfLRYV',
};

module.exports = async (req, res) => {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { planKey, email, name, profileType } = req.body;

  // Validate plan
  const priceId = PRICE_IDS[planKey];
  if (!priceId) {
    return res.status(400).json({ error: 'Invalid plan selected.' });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      customer_email: email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      metadata: {
        name: name,
        profileType: profileType,
        planKey: planKey,
      },
      success_url: `https://christonesunited.org/success.html?session_id={CHECKOUT_SESSION_ID}&plan=${planKey}&type=${profileType}&name=${encodeURIComponent(name)}`,
      cancel_url:  `https://christonesunited.org/?cancelled=true`,
    });

    res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Stripe error:', err.message);
    res.status(500).json({ error: err.message });
  }
};
