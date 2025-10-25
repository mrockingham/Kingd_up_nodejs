import { Router } from 'express';
import { createOrder } from '../controllers/order.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// User order (with token) or guest (no token)
router.post('/', createOrder);

export default router;
