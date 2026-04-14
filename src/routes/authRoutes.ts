import express from 'express';
import { register, login, verifyPhone } from '../controllers/authController';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/verify-phone', verifyPhone);

export default router;
