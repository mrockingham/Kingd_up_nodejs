import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { safeJsonResponse } from '../utils/safeJsonResponse';

const prisma = new PrismaClient();

export const getAllProducts = async (req: Request, res: Response) => {
  try {
    const {
      page = '1',
      limit = '10',
      q,
      color,
      size,
      category,
      sort = 'createdAt_desc', // default sort
    } = req.query;

    const pageNumber = parseInt(page as string, 10);
    const pageSize = parseInt(limit as string, 10);
    const skip = (pageNumber - 1) * pageSize;

    const filters: any = {};

    if (q) {
      filters.name = {
        contains: q,
        mode: 'insensitive',
      };
    }

    if (category) {
      filters.category = category;
    }

    if (color || size) {
      filters.variants = {
        some: {
          ...(color && { color: { equals: color } }),
          ...(size && { size: { equals: size } }),
        },
      };
    }

    // Sorting logic
    const [sortField, sortOrder] = sort.toString().split('_');
    const orderBy = {
      [sortField]: sortOrder === 'asc' ? 'asc' : 'desc',
    };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where: filters,
        include: { variants: true },
        skip,
        take: pageSize,
        orderBy,
      }),
      prisma.product.count({ where: filters }),
    ]);

    safeJsonResponse(res, {
      data: products,
      meta: {
        page: pageNumber,
        limit: pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error('❌ Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
};


export const getProductById = async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  console.log('is called product controller');
  if (isNaN(id)) {
    res.status(400).json({ error: 'Invalid product ID' });
    return;
  }

  try {
    const product = await prisma.product.findUnique({
      where: { id },
      include: { variants: true },
    });

    if (!product) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    safeJsonResponse(res, product);
  } catch (error) {
    console.error('❌ Error fetching product:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
};

export const getProductBySlug = async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;

    const product = await prisma.product.findUnique({
      where: { slug },
      include: { variants: true },
    });

    if (!product) {
      res.status(404).json({ message: 'Product not found' });
      return;
    }

     safeJsonResponse(res, product);
  } catch (error) {
    console.error('❌ Error fetching product:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
