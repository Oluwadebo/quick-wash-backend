import express from 'express';
import { createOrder, updateOrderStatus, readyForPickup } from '../controllers/orderController';
import { protect } from '../middleware/auth';
import { validateLandmark } from '../middleware/landmark';

const router = express.Router();

router.post('/', protect, validateLandmark, createOrder);
router.patch('/:orderId/status', protect, updateOrderStatus);
router.patch('/:orderId/ready', protect, readyForPickup);

export default router;
