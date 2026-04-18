import express from 'express';
import { getVendors, updatePriceList, toggleStoreStatus, toggleRainLock, getPriceList } from '../controllers/vendorController';
import { protect } from '../middleware/auth';
import { authorize } from '../middleware/role';
import { UserRole } from '../models/User';

const router = express.Router();

router.get('/', getVendors);
router.get('/:id/price-list', getPriceList);
router.post('/:id/price-list', protect, authorize(UserRole.VENDOR), updatePriceList);
router.put('/pricelist', protect, authorize(UserRole.VENDOR), updatePriceList);
router.patch('/status', protect, authorize(UserRole.VENDOR), toggleStoreStatus);
router.patch('/report-rain', protect, authorize(UserRole.VENDOR), toggleRainLock);

export default router;
