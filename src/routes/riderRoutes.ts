import express from 'express';
import { getAvailableOrders, acceptOrder, updateLocation } from '../controllers/riderController';
import { protect } from '../middleware/auth';
import { authorize } from '../middleware/role';
import { UserRole } from '../models/User';

const router = express.Router();

router.get('/available', protect, authorize(UserRole.RIDER), getAvailableOrders);
router.post('/accept/:orderId', protect, authorize(UserRole.RIDER), acceptOrder);
router.patch('/location', protect, authorize(UserRole.RIDER), updateLocation);

export default router;
