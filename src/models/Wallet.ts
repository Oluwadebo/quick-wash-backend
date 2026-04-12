import mongoose, { Schema, Document } from 'mongoose';

export interface IWallet extends Document {
  user: mongoose.Types.ObjectId;
  balance: number;
  transactions: {
    amount: number;
    type: 'credit' | 'debit';
    purpose: 'order_payment' | 'withdrawal' | 'rider_fee' | 'vendor_payout' | 'referral';
    reference?: string;
    date: Date;
  }[];
}

const WalletSchema: Schema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    balance: { type: Number, default: 0 },
    transactions: [
      {
        amount: { type: Number, required: true },
        type: { type: String, enum: ['credit', 'debit'], required: true },
        purpose: { 
          type: String, 
          enum: ['order_payment', 'withdrawal', 'rider_fee', 'vendor_payout', 'referral'],
          required: true 
        },
        reference: { type: String },
        date: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

// For riders, we allow negative balance up to a certain limit (e.g., -5000)
// This is handled in the controller logic.

export default mongoose.model<IWallet>('Wallet', WalletSchema);
