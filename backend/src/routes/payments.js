const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { query } = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// POST /payments/create-subscription
router.post('/create-subscription', authenticate, async (req, res) => {
  const { price_id } = req.body; // monthly or yearly price ID
  try {
    let customerId = req.user.stripe_customer_id;

    const { rows: userRows } = await query(
      'SELECT email, name, stripe_customer_id FROM users WHERE id = $1',
      [req.user.id]
    );
    const user = userRows[0];

    if (!user.stripe_customer_id) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: { kindred_user_id: req.user.id },
      });
      customerId = customer.id;
      await query('UPDATE users SET stripe_customer_id = $1 WHERE id = $2', [customerId, req.user.id]);
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: price_id, quantity: 1 }],
      success_url: `${process.env.CLIENT_URL}/premium/success`,
      cancel_url: `${process.env.CLIENT_URL}/premium`,
      metadata: { kindred_user_id: req.user.id },
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// POST /payments/cancel-subscription
router.post('/cancel-subscription', authenticate, async (req, res) => {
  try {
    const { rows } = await query(
      'SELECT stripe_subscription_id FROM users WHERE id = $1',
      [req.user.id]
    );
    if (!rows[0]?.stripe_subscription_id) {
      return res.status(400).json({ error: 'No active subscription' });
    }
    await stripe.subscriptions.update(rows[0].stripe_subscription_id, {
      cancel_at_period_end: true,
    });
    res.json({ success: true, message: 'Subscription will cancel at end of billing period' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

// GET /payments/billing-portal
router.get('/billing-portal', authenticate, async (req, res) => {
  try {
    const { rows } = await query(
      'SELECT stripe_customer_id FROM users WHERE id = $1',
      [req.user.id]
    );
    if (!rows[0]?.stripe_customer_id) {
      return res.status(400).json({ error: 'No billing account found' });
    }
    const session = await stripe.billingPortal.sessions.create({
      customer: rows[0].stripe_customer_id,
      return_url: `${process.env.CLIENT_URL}/profile`,
    });
    res.json({ url: session.url });
  } catch (err) {
    res.status(500).json({ error: 'Failed to open billing portal' });
  }
});

// POST /payments/webhook — Stripe events
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const userId = session.metadata?.kindred_user_id;
      if (userId && session.subscription) {
        await query(
          `UPDATE users SET subscription_tier = 'premium', stripe_subscription_id = $1 WHERE id = $2`,
          [session.subscription, userId]
        );
      }
      break;
    }
    case 'customer.subscription.deleted':
    case 'customer.subscription.paused': {
      const sub = event.data.object;
      await query(
        `UPDATE users SET subscription_tier = 'free', stripe_subscription_id = NULL
         WHERE stripe_subscription_id = $1`,
        [sub.id]
      );
      break;
    }
    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      console.warn('Payment failed for customer:', invoice.customer);
      break;
    }
  }

  res.json({ received: true });
});

module.exports = router;
