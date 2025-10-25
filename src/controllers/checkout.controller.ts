import { Request, Response } from 'express';
import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-05-28.basil',
});

const prisma = new PrismaClient();

export const createCheckoutSession = async (req: Request, res: Response): Promise<void> => {
  const { cartId } = req.body;

  try {
    const cart = await prisma.cart.findUnique({
      where: { id: cartId },
      include: {
        items: {
          include: {
            product: true,
            variant: true,
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
   
      res.status(400).json({ error: 'Cart is empty or does not exist.' });
      return;
    }
    const lineItems = cart.items.map(item => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: item.product.name,
          images: [item.product.thumbnailUrl || ''],
        },
        unit_amount: Math.round((parseFloat(item.variant?.price.toString() || '0')) * 100), // in cents
      },
      quantity: item.quantity,
    }));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: lineItems,
      success_url: `${process.env.FRONTEND_URL}/order-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/cart`,
    });

    res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('❌ Stripe checkout session error:', err);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
};
