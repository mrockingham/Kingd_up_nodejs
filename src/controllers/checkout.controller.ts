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
      cancel_url: `${process.env.FRONTEND_URL}/`,
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
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err: any) {
    console.log(`❌ Webhook signature verification failed.`, err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as any;

    const cartIdString = session.metadata?.cartId;
    const cartId = parseInt(cartIdString, 10);
    const shippingDetails = session.collected_information.shipping_details;
    const customerEmail = session.customer_details?.email;
    const customerPhone = session.customer_details?.phone;
    const customerName = shippingDetails.name; 
    const total = session.amount_total / 100;

    if (!cartId || !shippingDetails || !customerEmail || !customerName) {
      console.error('❌ Webhook missing critical data', session.id);
      res.status(400).send('Webhook Error: Missing required data');
      return;
    }

    try {
      // 1. Get the cart
      const cart = await prisma.cart.findUnique({
        where: { id: cartId },
        include: {
          items: { 
            include: {
              variant: true,
            },
          },
        },
      });

      if (!cart) throw new Error(`Cart ${cartId} not found.`);

      // 2. Create ShippingAddress
      const shippingAddress = await prisma.shippingAddress.create({
        data: {
          line1: shippingDetails.address.line1,
          line2: shippingDetails.address.line2,
          city: shippingDetails.address.city,
          state: shippingDetails.address.state,
          zip: shippingDetails.address.postal_code,
          country: shippingDetails.address.country,
        },
      });

      // --- (3) NEW GUEST/USER LOGIC ---
           let guestId: number | undefined;
      let userId: number | undefined;

      if (cart.userId) {

        userId = cart.userId;
      } else {

        let guest = await prisma.guest.findFirst({
          where: { email: customerEmail }
        });

        if (guest) {
          // Guest found, update their info
          guest = await prisma.guest.update({
            where: { id: guest.id },
            data: { name: customerName, phone: customerPhone || undefined }
          });
        } else {
          // No guest found, create a new one
          guest = await prisma.guest.create({
            data: {
              email: customerEmail,
              name: customerName,
              phone: customerPhone || '',
            }
          });
        }
        guestId = guest.id;
      }

      // 4. Create the Order, linking user OR guest
      const newOrder = await prisma.order.create({
        data: {
          userId: userId,
          guestId: guestId,
          total: total,
          status: 'PAID',
          shippingId: shippingAddress.id,
          stripeSessionId: session.id,
        },
      });

      // 5. Create OrderItems
      await prisma.orderItem.createMany({
        data: cart.items.map(item => {
          if (!item.variant) {
            throw new Error(`Cart item ${item.id} is missing variant data.`);
          }
          return {
            orderId: newOrder.id,
            productId: item.productId,
            variantId: item.variantId!,
            quantity: item.quantity,
            price: item.variant.price,
          };
        }),
      });

      // 6. Call Printful
      await createPrintfulOrder(
        cartId,
        shippingDetails,
        customerEmail,
        customerPhone || null
      );

      // 7. Delete the cart
      await prisma.cartItem.deleteMany({
        where: { cartId: cart.id },
      });
      await prisma.cart.delete({
        where: { id: cart.id },
      });

    } catch (error) {
      console.error('❌ Failed to process order:', error);
      res.status(500).json({ error: 'Failed to process order' });
      return;
    }
  }

  res.status(200).json({ received: true });
};

