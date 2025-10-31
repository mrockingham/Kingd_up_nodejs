import { Router } from 'express';
import { getPrintfulProduct, getPrintfulVariant } from '../controllers/printfulDebug.contoller';


const router = Router();

// Route to check a product using the ID stored in your Product table
router.get('/product/:id', getPrintfulProduct);

// Route to check a variant using the ID stored in your Variant table
router.get('/variant/:id', getPrintfulVariant);

export default router;