import mongoose, { Schema, Document } from 'mongoose';

export enum OrderStatus {
  PENDING = 'pending',
  RIDER_ASSIGN_PICKUP = 'rider_assign_pickup',
  PICKED_UP = 'picked_up',
  WASHING = 'washing',
  READY = 'ready',
  RIDER_ASSIGN_DELIVERY = 'rider_assign_delivery',
  PICKED_UP_DELIVERY = 'picked_up_delivery',
  DELIVERED = 'delivered',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  DISPUTED = 'disputed',
}

export enum EscrowStatus {
  PENDING = 'pending',
  HELD = 'held',
  RELEASED = 'released',
  REFUNDED = 'refunded',
}

export interface IOrder extends Document {
  id: string; // Alias for _id or custom id
  orderId: string;
  customerUid: string;
  vendorId: string;
  riderUid?: string;
  
  items: {
    name: string;
    quantity: number;
    price: number;
  }[];
  
  totalPrice: number;
  escrowAmount: number;
  platformFee: number;
  riderFee: number;
  
  status: OrderStatus;
  escrowStatus: EscrowStatus;
  
  // Security & Verification
  sealedBagId?: string;
  sealedBagPhoto?: string;
  pickupCode?: string;
  vendorHandoverCode?: string;
  deliveryCode?: string;
  handoverCode?: string; // 4-digit code
  
  // Logic Flags
  readyForPickup: boolean;
  readyToReceive: boolean;
  
  autoReleaseAt?: Date;
  completedAt?: Date;
  
  // Trust Points
  trustPointsImpact: number;
  
  // Rain delay
  rainReportedBy?: string;
  rainDelayUntil?: Date;
  
  paymentStatus: 'pending' | 'paid' | 'escrow' | 'released' | 'refunded';
  paymentReference?: string;
}

const OrderSchema: Schema = new Schema(
  {
    orderId: { type: String, required: true, unique: true },
    customerUid: { type: String, required: true },
    vendorId: { type: String, required: true },
    riderUid: { type: String },
    
    items: [
      {
        name: { type: String, required: true },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true },
      },
    ],
    
    totalPrice: { type: Number, required: true },
    escrowAmount: { type: Number, required: true },
    platformFee: { type: Number, required: true },
    riderFee: { type: Number, required: true },
    
    status: { 
      type: String, 
      enum: Object.values(OrderStatus), 
      default: OrderStatus.PENDING 
    },
    escrowStatus: {
      type: String,
      enum: Object.values(EscrowStatus),
      default: EscrowStatus.PENDING
    },
    
    sealedBagId: { type: String },
    sealedBagPhoto: { type: String },
    pickupCode: { type: String },
    vendorHandoverCode: { type: String },
    deliveryCode: { type: String },
    handoverCode: { type: String },
    
    readyForPickup: { type: Boolean, default: false },
    readyToReceive: { type: Boolean, default: false },
    
    autoReleaseAt: { type: Date },
    completedAt: { type: Date },
    
    trustPointsImpact: { type: Number, default: 0 },
    
    rainReportedBy: { type: String },
    rainDelayUntil: { type: Date },
    
    paymentStatus: { 
      type: String, 
      enum: ['pending', 'paid', 'escrow', 'released', 'refunded'], 
      default: 'pending' 
    },
    paymentReference: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model<IOrder>('Order', OrderSchema);
