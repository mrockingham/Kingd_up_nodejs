import { Router } from 'express';
import { createOrder,getMyOrders,getOrderById,getOrderByLookup,getOrderBySessionId } from '../controllers/order.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// User order (with token) or guest (no token)
router.post('/', createOrder);
router.get('/session/:sessionId', getOrderBySessionId);
router.get('/myorders', authenticate, getMyOrders);
router.get('/:orderId', authenticate, getOrderById); 


router.post('/lookup', getOrderByLookup);

export default router;
