import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { isAdmin } from "../middleware/admin";
import {
  getAllOrders,
  updateOrderStatus,
  syncPrintfulHandler,
} from "../controllers/admin.controller";

const router = Router();


// GET /api/admin/orders - Get all orders
router.get("/orders", getAllOrders);

// PUT /api/admin/orders/:orderId - Update an order's status
router.put("/orders/:orderId", updateOrderStatus);

// --- Other Admin Routes ---

// POST /api/admin/sync-printful - Your existing sync function
router.post("/sync-printful", syncPrintfulHandler);

export default router;