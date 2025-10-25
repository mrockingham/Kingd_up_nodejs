import { Router } from 'express';
import { addOrUpdateCartItem, removeCartItem } from '../controllers/cartItem.controller';

const router = Router();

router.post('/', addOrUpdateCartItem);
router.delete('/:itemId', removeCartItem);

export default router;
