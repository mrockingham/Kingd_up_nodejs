import { Router, RequestHandler } from "express";
import { handleContactForm } from "../controllers/contact.controller";



const router = Router();

// POST /api/contact/send
router.post("/send", handleContactForm as RequestHandler);

export default router;