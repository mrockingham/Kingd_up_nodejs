import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const addOrUpdateCartItem = async (req: Request, res: Response): Promise<void> => {
  const { cartId, productId, variantId, quantity } = req.body;

  if (!cartId || !productId || !quantity) {
    res.status(400).json({ error: 'cartId, productId, and quantity are required.' });
    return;
  }

  try {
    const existingItem = await prisma.cartItem.findFirst({
      where: {
        cartId,
        productId,
        variantId: variantId || null,
      },
    });

    let updatedItem;

    if (existingItem) {
      updatedItem = await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: existingItem.quantity + quantity },
      });
    } else {
      updatedItem = await prisma.cartItem.create({
        data: {
          cartId,
          productId,
          variantId: variantId || null,
          quantity,
        },
      });
    }

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

    if (!cart) {
 res.status(404).json({ error: 'Cart not found after update' });
      return;
    }

    const total = cart.items.reduce((acc, item) => {
      // Make sure item.variant exists before accessing price
      const price = item.variant?.price ?? 0;
      return acc + price * item.quantity;
    }, 0);

    res.status(200).json({ ...cart, total });
  } catch (error) {
    console.error('❌ Failed to add/update cart item:', error);
    res.status(500).json({ error: 'Failed to add/update cart item' });
  }
};


export const removeCartItem = async (req: Request, res: Response): Promise<void> => {
  const { itemId } = req.params;

  try {
    await prisma.cartItem.delete({
      where: { id: parseInt(itemId, 10) },
    });

    res.status(200).json({ message: 'Item removed from cart' });
  } catch (error) {
    console.error('❌ Failed to remove item:', error);
    res.status(500).json({ error: 'Failed to remove item from cart' });
  }
};



