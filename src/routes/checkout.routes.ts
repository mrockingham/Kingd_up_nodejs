import { Router } from 'express';
import { createCheckoutSession } from '../controllers/checkout.controller';

const router = Router();
router.post('/create-checkout-session', createCheckoutSession);
export default router;