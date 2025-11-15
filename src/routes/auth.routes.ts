import { Router } from 'express';
import { registerUser, loginUser, me, updateUser } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/me',authenticate, me);
router.put('/me', authenticate, updateUser);

export default router;
