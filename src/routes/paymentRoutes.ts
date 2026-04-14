import express from 'express';
import { paystackWebhook } from '../controllers/paymentController';

const router = express.Router();

router.post('/webhook', paystackWebhook);

export default router;
