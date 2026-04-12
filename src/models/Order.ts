import mongoose, { Schema, Document } from 'mongoose';

export enum OrderStatus {
  PENDING = 'pending',
  RIDER_ASSIGNED_PICKUP = 'rider_assigned_pickup',
  PICKED_UP = 'picked_up',
  RECEIVED_BY_VENDOR = 'received_by_vendor',
  PROCESSING = 'processing',
  READY_FOR_PICKUP = 'ready_for_pickup', // Vendor says it's done
  RIDER_ASSIGNED_DELIVERY = 'rider_assigned_delivery',
  IN_TRANSIT = 'in_transit',
  DELIVERED = 'delivered',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  DISPUTED = 'disputed',
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
  escrowAmount: number; // 80% to vendor, 20% to platform/rider
  riderFee: number;
  
  status: OrderStatus;
  
  // Security
  sealedBagId?: string;
  pickupCode?: string; // Customer -> Rider
  vendorHandoverCode?: string; // Rider -> Vendor
  deliveryCode?: string; // Rider -> Customer
  
  // Logic
  isReadyForPickup: boolean; // Vendor flag
  isReadyToReceive: boolean; // Customer flag
  
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
    riderFee: { type: Number, required: true },
    
    status: { 
      type: String, 
      enum: Object.values(OrderStatus), 
      default: OrderStatus.PENDING 
    },
    
    sealedBagId: { type: String },
    pickupCode: { type: String },
    vendorHandoverCode: { type: String },
    deliveryCode: { type: String },
    
    isReadyForPickup: { type: Boolean, default: false },
    isReadyToReceive: { type: Boolean, default: false },
    
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
