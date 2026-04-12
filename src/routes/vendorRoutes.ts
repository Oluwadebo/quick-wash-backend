import express from 'express';
import { getVendors, updatePriceList, toggleStoreStatus } from '../controllers/vendorController';
import { protect } from '../middleware/auth';
import { authorize } from '../middleware/role';
import { UserRole } from '../models/User';

const router = express.Router();

router.get('/', getVendors);
router.put('/pricelist', protect, authorize(UserRole.VENDOR), updatePriceList);
router.patch('/status', protect, authorize(UserRole.VENDOR), toggleStoreStatus);

export default router;
