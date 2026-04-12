import express from 'express';
import { 
    createOrder, 
    updateOrderStatus, 
    setReadyForPickup, 
    setReadyToReceive,
    getOrderById 
} from '../controllers/orderController';
import { protect } from '../middleware/auth';
import { validateLandmark } from '../middleware/landmark';
import { checkReadyForPickup, checkReadyToReceive } from '../middleware/orderChecks';

const router = express.Router();

router.get('/:orderId', protect, getOrderById);
router.post('/', protect, validateLandmark, createOrder);
router.patch('/:orderId/status', protect, updateOrderStatus);
router.patch('/:orderId/ready-pickup', protect, setReadyForPickup);
router.patch('/:orderId/ready-receive', protect, setReadyToReceive);
router.patch('/:orderId/deliver', protect, checkReadyToReceive, updateOrderStatus);

export default router;
