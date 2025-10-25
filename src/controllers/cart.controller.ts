import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const createOrGetCart = async (req: Request, res: Response): Promise<void> => {
  const { userId } = req.body;

  try {
    if (userId) {

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        res.status(404).json({ message: 'User not found' });
        return;
      }

      let cart = await prisma.cart.findFirst({
        where: { userId },
        include: { items: true },
      });

      if (!cart) {
        cart = await prisma.cart.create({
          data: { userId },
          include: { items: true },
        });
      }

      res.status(200).json(cart);
    } else {
      // Guest cart
      const cart = await prisma.cart.create({
        data: { userId: null },
        include: { items: true },
      });

      res.status(201).json(cart);
    }
  } catch (error) {
    console.error('❌ Error creating/fetching cart:', error);
    res.status(500).json({ message: 'Failed to create or fetch cart' });
  }
};

export const getCartWithTotal = async (req: Request, res: Response): Promise<any> => {
  const { cartId } = req.params;

  try {
    const cart = await prisma.cart.findUnique({
      where: { id: parseInt(cartId, 10) },
      include: {
        items: {
          include: {
            product: true,
            variant: true,
          },
        },
      },
    });

    if (!cart) {
      return res.status(404).json({ error: 'Cart not found' });
    }

    const total = cart.items.reduce((acc, item) => {
      const price = item.variant?.price ?? 0;
      return acc + price * item.quantity;
    }, 0);

    res.status(200).json({ ...cart, total });
  } catch (error) {
    console.error('❌ Failed to calculate cart total:', error);
    res.status(500).json({ error: 'Failed to calculate cart total' });
  }
};
