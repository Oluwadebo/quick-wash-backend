import express from 'express';
import { 
  getAllUsers, 
  getUserByUid, 
  updateUserByUid, 
  adjustTrustPoints, 
  recordTransaction 
} from '../controllers/userController';
import { protect } from '../middleware/auth';
import { authorize } from '../middleware/role';
import { UserRole } from '../models/User';

const router = express.Router();

router.get('/', protect, authorize(UserRole.ADMIN), getAllUsers);
router.get('/:uid', protect, getUserByUid);
router.patch('/:uid', protect, authorize(UserRole.ADMIN), updateUserByUid);
router.post('/:uid/trust', protect, authorize(UserRole.ADMIN), adjustTrustPoints);
router.post('/transactions/:uid', protect, authorize(UserRole.ADMIN), recordTransaction);

export default router;
