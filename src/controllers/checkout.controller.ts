import { Request, Response } from 'express';
import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';
import { createPrintfulOrder } from '../services/printful.services';




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
          description: `Size: ${item.variant?.size}`,
          images: [item.product.thumbnailUrl || ''],
        },
        unit_amount: Math.round((parseFloat(item.variant?.price.toString() || '0')) * 100),
      },
      quantity: item.quantity,
    }));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: lineItems,
      success_url: `${process.env.FRONTEND_URL}/order-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/cart`,
      shipping_address_collection: {
        allowed_countries: ['US', 'CA'],
      },
      phone_number_collection: {
        enabled: true,
      },
      metadata: {
        cartId: cart.id,
      },
    });

    res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('❌ Stripe checkout session error:', err);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
};



export const handleStripeWebhook = async (req: Request, res: Response): Promise<void> => {
  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  let event: Stripe.Event;

  try {
    // 1. Verify the event came from Stripe
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err: any) {
    console.log(`❌ Webhook signature verification failed.`, err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  // 2. Handle the 'checkout.session.completed' event
  if (event.type === 'checkout.session.completed') {

    const session = event.data.object as any; 

    // 3. Extract the data we need
    const cartId = session.metadata?.cartId;
    const shippingDetails = session.collected_information.shipping_details;
    const customerEmail = session.customer_details?.email;
    const customerPhone = session.customer_details?.phone;

    if (!cartId || !shippingDetails || !customerEmail) {
      console.error('❌ Webhook missing critical data', session.id);
      res.status(400).send('Webhook Error: Missing required data');
      return;
    }

    try {

      await createPrintfulOrder(
        parseInt(cartId), 
        shippingDetails, 
        customerEmail,
        customerPhone || null 
      );
      

      
    } catch (error) {
      console.error('❌ Failed to process order for Printful:', error);
      res.status(500).json({ error: 'Failed to process order' });
      return;
    }
  }


  res.status(200).json({ received: true });
};

