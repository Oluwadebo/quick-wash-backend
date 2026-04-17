import AuditLog from '../models/AuditLog';
import mongoose from 'mongoose';

export const logAuditAction = async (
  adminId: string,
  action: string,
  targetModel: string,
  targetId: string,
  details?: any,
  ipAddress?: string
) => {
  try {
    await AuditLog.create({
      admin: new mongoose.Types.ObjectId(adminId),
      action,
      targetModel,
      targetId: new mongoose.Types.ObjectId(targetId),
      details,
      ipAddress
    });
  } catch (error) {
    console.error('Audit Logging Error:', error);
  }
};
