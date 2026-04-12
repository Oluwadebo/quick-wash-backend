import express from 'express';
import { getWalletBalance, initializeDeposit, verifyDeposit } from '../controllers/walletController';
import { protect } from '../middleware/auth';

const router = express.Router();

router.get('/balance', protect, getWalletBalance);
router.post('/deposit/initialize', protect, initializeDeposit);
router.post('/deposit/verify', protect, verifyDeposit);

export default router;
