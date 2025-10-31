import { Request, Response } from 'express';
import axios from 'axios';

// Re-use the axios instance from your service file
const PRINTFUL_API_KEY = process.env.PRINTFUL_API_KEY;
const printful = axios.create({
  baseURL: 'https://api.printful.com',
  headers: {
    Authorization: `Bearer ${PRINTFUL_API_KEY}`,
  },
});

/**
 * Fetches product details directly from Printful using the Sync Product ID.
 */
export const getPrintfulProduct = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params; // This is the ID from your Product table's printfulId

  try {
    console.log(`🔍 Debug: Fetching Printful product with Sync ID: ${id}`);
    const response = await printful.get(`/store/products/${id}`);
    res.status(200).json(response.data.result);
  } catch (error: any) {
    console.error("❌ Printful Debug API Error (Product):", error.response?.data || error.message);
    res.status(error.response?.status || 500).json({ 
      message: 'Failed to fetch product from Printful', 
      printfulError: error.response?.data 
    });
  }
};

/**
 * Fetches variant details directly from Printful using the Catalog Variant ID.
 * This is the ID used for placing orders.
 */
export const getPrintfulVariant = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params; // This is the ID from your Variant table's printfulId

  try {
    console.log(`🔍 Debug: Fetching Printful variant with Catalog ID: ${id}`);
    // NOTE: This uses a different Printful endpoint!
    const response = await printful.get(`/products/variant/${id}`); 
    res.status(200).json(response.data.result);
  } catch (error: any) {
    console.error("❌ Printful Debug API Error (Variant):", error.response?.data || error.message);
    res.status(error.response?.status || 500).json({ 
      message: 'Failed to fetch variant from Printful', 
      printfulError: error.response?.data 
    });
  }
};