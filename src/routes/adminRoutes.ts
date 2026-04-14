import express from 'express';
import { 
  approveUser, 
  manualTrustPointsOverride, 
  getAllDisputes, 
  resolveDispute, 
  getAuditLogs 
} from '../controllers/adminController';
import { protect } from '../middleware/auth';
import { authorize } from '../middleware/role';
import { UserRole } from '../models/User';

const router = express.Router();

router.use(protect);
router.use(authorize(UserRole.ADMIN));

router.patch('/approve/:userId', approveUser);
router.patch('/trust-override/:userId', manualTrustPointsOverride);
router.get('/disputes', getAllDisputes);
router.patch('/disputes/:disputeId', resolveDispute);
router.get('/audit-logs', getAuditLogs);

export default router;
