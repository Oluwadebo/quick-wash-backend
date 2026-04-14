import express from 'express';
import { getWalletBalance, initializeDeposit, verifyDeposit, requestWithdrawal } from '../controllers/walletController';
import { protect } from '../middleware/auth';

const router = express.Router();

router.get('/balance', protect, getWalletBalance);
router.post('/deposit/initialize', protect, initializeDeposit);
router.post('/deposit/verify', protect, verifyDeposit);
router.post('/withdraw', protect, requestWithdrawal);

export default router;
