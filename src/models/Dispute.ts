import mongoose, { Schema, Document } from 'mongoose';

export interface IDispute extends Document {
  order: mongoose.Types.ObjectId;
  raisedBy: mongoose.Types.ObjectId;
  reason: string;
  evidence?: string[]; // URLs to images
  status: 'open' | 'resolved' | 'closed';
  resolution?: string;
  resolvedBy?: mongoose.Types.ObjectId;
}

const DisputeSchema: Schema = new Schema(
  {
    order: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    raisedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String, required: true },
    evidence: [{ type: String }],
    status: { type: String, enum: ['open', 'resolved', 'closed'], default: 'open' },
    resolution: { type: String },
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.model<IDispute>('Dispute', DisputeSchema);
