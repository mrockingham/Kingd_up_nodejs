import { Router } from 'express';
import {
  getAllProducts,
  getProductById,
  getProductBySlug,
} from '../controllers/product.controller';

const router = Router();

router.get('/', getAllProducts);
router.get('/id/:id', getProductById);       // ✅ fixed
router.get('/slug/:slug', getProductBySlug); // ✅ fixed

export default router;
