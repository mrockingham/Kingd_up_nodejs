import { Router } from 'express';
import { syncPrintfulHandler } from '../controllers/admin.controller';  
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/sync-printful', authenticate, syncPrintfulHandler);

export default router;
