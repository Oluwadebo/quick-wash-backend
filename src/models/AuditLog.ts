import mongoose, { Schema, Document } from 'mongoose';

export interface IAuditLog extends Document {
  admin: mongoose.Types.ObjectId;
  action: string;
  targetModel: string;
  targetId: mongoose.Types.ObjectId;
  details: any;
  ipAddress?: string;
}

const AuditLogSchema: Schema = new Schema(
  {
    admin: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, required: true },
    targetModel: { type: String, required: true },
    targetId: { type: Schema.Types.ObjectId, required: true },
    details: { type: Schema.Types.Mixed },
    ipAddress: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
