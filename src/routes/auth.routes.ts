import { Router } from 'express';
import { registerUser, loginUser, me } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/me',authenticate, me);

export default router;
