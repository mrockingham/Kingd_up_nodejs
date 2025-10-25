import { Router } from 'express';
import { createOrGetCart, getCartWithTotal } from '../controllers/cart.controller';


const router = Router();

router.post('/', createOrGetCart);
router.get('/:cartId', getCartWithTotal);

export default router;