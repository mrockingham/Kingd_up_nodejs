import { Request, Response } from 'express';
import { syncPrintfulProducts } from '../services/printful.services';
// 1. Import PrismaClient
import { PrismaClient } from '@prisma/client';

// 2. Initialize Prisma
const prisma = new PrismaClient();


export const syncPrintfulHandler = async (req: Request, res: Response) => {
  try {
    await syncPrintfulProducts();
    res.status(200).json({ message: 'Printful products synced successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Printful sync failed' });
  }
};


export const getAllOrders = async (req: Request, res: Response) => {
  try {
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      include: {

        user: {
          select: { name: true, email: true },
        },

        guest: true,
      },
    });
    res.status(200).json(orders);
  } catch (error) {
    console.error('Error fetching all orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
};


export const updateOrderStatus = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

 if (!status) {

      res.status(400).json({ error: 'Status is required' });

      return;

    }

    const updatedOrder = await prisma.order.update({
      where: { id: parseInt(orderId, 10) },
      data: { status: status },

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

    res.status(200).json(updatedOrder);
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ error: 'Failed to update order' });
  }
};