import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

export const createOrder = async (req: Request, res: Response) => {
  const {
    items,
    total,
    shipping,
    guest
  }: {
    items: { productId: number; variantId: number; quantity: number; price: number }[];
    total: number;
    shipping: {
      line1: string;
      line2?: string;
      city: string;
      state: string;
      zip: string;
      country: string;
    };
    guest?: { name: string; email: string; phone: string };
  } = req.body;

  const token = req.headers.authorization?.split(' ')[1];
  let userId: number | undefined;
  let guestId: number | undefined;

  // Decode user token (optional)
if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      userId = decoded.userId;
    } catch {

      res.status(401).json({ error: 'Invalid token' });
      return; 
    }
  }

  try {
    // Save shipping address
    const shippingRecord = await prisma.shippingAddress.create({ data: shipping });

    // Create guest if unauthenticated
    if (!userId && guest) {
      const guestRecord = await prisma.guest.create({ data: guest });
      guestId = guestRecord.id;
    }

    // Create order
    const order = await prisma.order.create({
      data: {
        userId,
        guestId,
        shippingId: shippingRecord.id,
        total,
        orderItems: {
          create: items.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
            price: item.price,
          })),
        },
      },
      include: {
        orderItems: true,
        shipping: true,
        user: true,
        guest: true,
      },
    });

    res.status(201).json(order);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create order' });
  }
};

export const getOrderBySessionId = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    
    // Find the order using the Stripe ID
    const order = await prisma.order.findUnique({
      where: { stripeSessionId: sessionId },
      include: {
        shipping: true,
          orderItems: {  
          include: {
            product: true,
            variant: true, 
          },
        },
      },
    });

if (!order) {
 
      res.status(404).json({ message: 'Order not found yet.' });
      return;
    }


    res.status(200).json(order);

  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch order' });
  }
};

export const getOrderById = async (req: Request, res: Response): Promise<void> => {
  try {
    // 1. Get the authenticated user's ID
    console.log('req', req)
    const userId = (req as any).userId;
    // 2. Get the order ID from the URL parameter
    const { orderId } = req.params;

    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const order = await prisma.order.findUnique({
      where: {
        id: parseInt(orderId, 10),
        // 3. THIS IS THE CRITICAL SECURITY CHECK:
 
        userId: userId,
      },
      // 4. Include all the data your front-end page needs
      include: {
        shipping: true,
        orderItems: {
          include: {
            product: true,
            variant: true,
          },
        },
      },
    });

    // 5. If no order is found (or it doesn't belong to this user), send a 404
    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    // 6. Success!
    res.status(200).json(order);

  } catch (error) {
    console.error('❌ Failed to fetch order by ID:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
};

export const getMyOrders = async (req: Request, res: Response): Promise<void> => {
  try {


    const userId = (req as any).userId;

    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const orders = await prisma.order.findMany({
      where: { userId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        shipping: true,
        orderItems: {
          include: {
            product: true,
            variant: true, 
          },
        },
      },
    });

    res.status(200).json(orders);

  } catch (error) {
    console.error('❌ Failed to fetch user orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
};

export const getOrderByLookup = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId, email } = req.body;

    if (!orderId || !email) {
      res.status(400).json({ error: 'Order ID and email are required.' });
      return;
    }

    const order = await prisma.order.findUnique({
      where: { id: parseInt(orderId as string, 10) },
      include: {
        guest: true,
        shipping: true,
        orderItems: {
          include: {
            product: true,
            variant: true,
          },
        },
      },
    });


    if (!order || order.guest?.email !== email) {
      res.status(404).json({ error: 'Order not found or email does not match.' });
      return;
    }


    res.status(200).json(order);

  } catch (error) {
    console.error('❌ Failed to lookup order:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
};