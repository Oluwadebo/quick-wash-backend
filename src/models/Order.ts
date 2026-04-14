import mongoose, { Schema, Document } from 'mongoose';

export enum OrderStatus {
  PENDING = 'pending',
  RIDER_ASSIGNED_PICKUP = 'rider_assigned_pickup',
  PICKED_UP = 'picked_up',
  RECEIVED_BY_VENDOR = 'received_by_vendor',
  PROCESSING = 'processing',
  READY_FOR_PICKUP = 'ready_for_pickup',
  RIDER_ASSIGNED_DELIVERY = 'rider_assigned_delivery',
  IN_TRANSIT = 'in_transit',
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
  orderId: string;
  customer: mongoose.Types.ObjectId;
  vendor: mongoose.Types.ObjectId;
  pickupRider?: mongoose.Types.ObjectId;
  deliveryRider?: mongoose.Types.ObjectId;
  
  items: {
    name: string;
    quantity: number;
    price: number;
  }[];
  
  totalAmount: number;
  escrowAmount: number; // 80% to vendor
  platformFee: number; // 20% to platform
  riderFee: number;
  
  status: OrderStatus;
  escrowStatus: EscrowStatus;
  
  // Security & Verification
  sealedBagId?: string;
  sealedBagPhoto?: string;
  pickupCode?: string; // Customer -> Rider
  vendorHandoverCode?: string; // Rider -> Vendor
  deliveryCode?: string; // Rider -> Customer
  handoverCode?: string; // Generic field if needed
  
  // Logic Flags
  readyForPickup: boolean; // Vendor flag
  readyToReceive: boolean; // Customer flag
  
  autoReleaseAt?: Date; // For escrow auto-release
  
  // Trust Points
  trustPointsImpact: number;
  
  // Rain delay
  rainReportedBy?: mongoose.Types.ObjectId;
  rainDelayUntil?: Date;
  
  paymentStatus: 'pending' | 'paid' | 'escrow' | 'released' | 'refunded';
  paymentReference?: string;
}

const OrderSchema: Schema = new Schema(
  {
    orderId: { type: String, required: true, unique: true },
    customer: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    vendor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    pickupRider: { type: Schema.Types.ObjectId, ref: 'User' },
    deliveryRider: { type: Schema.Types.ObjectId, ref: 'User' },
    
    items: [
      {
        name: { type: String, required: true },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true },
      },
    ],
    
    totalAmount: { type: Number, required: true },
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
    
    trustPointsImpact: { type: Number, default: 0 },
    
    rainReportedBy: { type: Schema.Types.ObjectId, ref: 'User' },
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
