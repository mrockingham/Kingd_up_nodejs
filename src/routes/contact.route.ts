import { Router, RequestHandler } from "express";
import { handleContactForm } from "../controllers/contact.controller";



const router = Router();

// POST /api/contact/send
router.post("/send", async (req, res, next) => {
  try {
    await handleContactForm(req, res);
  } catch (error) {
    next(error);
  }
});

export default router;