import express from "express";
import {
  cancelOrder,
  claimOrder,
  createOrder,
  getAllOrders,
  getOrderById,
  returnOrder,
  setReadyForPickup,
  setReadyToReceive,
  updateOrderStatus,
} from "../controllers/orderController";
import { protect } from "../middleware/auth";
import { validateLandmark } from "../middleware/landmark";
import { checkTrustLevel } from "../middleware/trustMiddleware";

const router = express.Router();

router.get("/", protect, getAllOrders);
router.get("/:orderId", protect, getOrderById);
router.post("/", protect, checkTrustLevel, validateLandmark, createOrder);
router.post("/auto-cancel", protect, cancelOrder);
router.patch("/:id/status", protect, updateOrderStatus);
router.post("/:id/claim", protect, claimOrder);
router.post("/:id/return", protect, returnOrder);
router.patch("/:orderId/ready-pickup", protect, setReadyForPickup);
router.patch("/:orderId/ready-receive", protect, setReadyToReceive);

export default router;
