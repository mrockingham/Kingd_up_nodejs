import { Request, Response } from 'express';
import { syncPrintfulProducts } from '../services/printful.services';

export const syncPrintfulHandler = async (req: Request, res: Response) => {
  try {
    await syncPrintfulProducts();
    res.status(200).json({ message: 'Printful products synced successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Printful sync failed' });
  }
};
