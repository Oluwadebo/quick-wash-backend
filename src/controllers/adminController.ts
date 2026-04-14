import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import User, { UserRole } from '../models/User';
import Order from '../models/Order';
import Dispute from '../models/Dispute';
import AuditLog from '../models/AuditLog';
import { updateTrustPoints, TrustEvent } from '../utils/trustPoints';

export const approveUser = async (req: AuthRequest, res: Response) => {
  const { userId } = req.params;
  const { approve } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.isApproved = approve;
    await user.save();

    await AuditLog.create({
      admin: req.user?._id,
      action: approve ? 'APPROVE_USER' : 'REVOKE_APPROVAL',
      targetModel: 'User',
      targetId: user._id,
      details: { role: user.role, name: user.name }
    });

    res.json({ message: `User ${approve ? 'approved' : 'revoked'} successfully`, user });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const manualTrustPointsOverride = async (req: AuthRequest, res: Response) => {
  const { userId } = req.params;
  const { points, reason } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.trustPoints += points;
    await user.save();

    await AuditLog.create({
      admin: req.user?._id,
      action: 'MANUAL_TRUST_OVERRIDE',
      targetModel: 'User',
      targetId: user._id,
      details: { points, reason }
    });

    res.json({ message: 'Trust points updated manually', trustPoints: user.trustPoints });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getAllDisputes = async (req: AuthRequest, res: Response) => {
  try {
    const disputes = await Dispute.find().populate('order raisedBy');
    res.json(disputes);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const resolveDispute = async (req: AuthRequest, res: Response) => {
  const { disputeId } = req.params;
  const { resolution, status } = req.body;

  try {
    const dispute = await Dispute.findById(disputeId);
    if (!dispute) return res.status(404).json({ message: 'Dispute not found' });

    dispute.resolution = resolution;
    dispute.status = status;
    dispute.resolvedBy = req.user?._id as any;
    await dispute.save();

    await AuditLog.create({
      admin: req.user?._id,
      action: 'RESOLVE_DISPUTE',
      targetModel: 'Dispute',
      targetId: dispute._id,
      details: { resolution, status }
    });

    res.json(dispute);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getAuditLogs = async (req: AuthRequest, res: Response) => {
  try {
    const logs = await AuditLog.find().populate('admin').sort({ createdAt: -1 });
    res.json(logs);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
