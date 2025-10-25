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
      return res.status(401).json({ error: 'Invalid token' });
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
