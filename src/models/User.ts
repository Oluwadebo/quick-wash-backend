import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export enum UserRole {
  CUSTOMER = 'customer',
  VENDOR = 'vendor',
  RIDER = 'rider',
  ADMIN = 'admin',
}

export interface IUser extends Document {
  uid: string;
  fullName: string;
  email: string;
  password?: string;
  phoneNumber: string;
  role: UserRole;
  avatar?: string;
  address?: string;
  landmark?: string;
  isVerified: boolean;
  isApproved: boolean;
  isPhoneVerified: boolean;
  walletBalance: number;
  pendingBalance: number;
  trustPoints: number;
  trustScore: number;
  status: 'active' | 'restricted' | 'suspended';
  lastNegativeEventAt?: Date;
  otp?: string;
  otpExpires?: Date;
  
  // Vendor specific
  shopName?: string;
  isOpen?: boolean;
  
  // Rider specific
  vehicleType?: string;
  consecutiveReturns: number;
  isAvailable?: boolean;
  currentLocation?: {
    lat: number;
    lng: number;
  };

  // Banking
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountName?: string;

  comparePassword(password: string): Promise<boolean>;
}

const UserSchema: Schema = new Schema(
  {
    uid: { type: String, required: true, unique: true },
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, select: false },
    phoneNumber: { type: String, required: true, unique: true },
    role: { type: String, enum: Object.values(UserRole), default: UserRole.CUSTOMER },
    avatar: { type: String },
    address: { type: String },
    landmark: { type: String },
    isVerified: { type: Boolean, default: false },
    isApproved: { type: Boolean, default: false },
    isPhoneVerified: { type: Boolean, default: false },
    walletBalance: { type: Number, default: 0 },
    pendingBalance: { type: Number, default: 0 },
    trustPoints: { type: Number, default: 100 },
    trustScore: { type: Number, default: 100 },
    status: { type: String, enum: ['active', 'restricted', 'suspended'], default: 'active' },
    lastNegativeEventAt: { type: Date, default: Date.now },
    otp: { type: String },
    otpExpires: { type: Date },
    
    // Vendor specific
    shopName: { type: String },
    isOpen: { type: Boolean, default: true },
    
    // Rider specific
    vehicleType: { type: String },
    consecutiveReturns: { type: Number, default: 0 },
    isAvailable: { type: Boolean, default: false },
    currentLocation: {
      lat: { type: Number },
      lng: { type: Number },
    },

    // Banking
    bankName: { type: String },
    bankAccountNumber: { type: String },
    bankAccountName: { type: String },
  },
  { timestamps: true }
);

// Hash password before saving
UserSchema.pre('save', async function () {
  const user = this as any;
  if (!user.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(user.password!, salt);
});

// Compare password method
UserSchema.methods.comparePassword = async function (password: string): Promise<boolean> {
  return await bcrypt.compare(password, this.password!);
};

export default mongoose.model<IUser>('User', UserSchema);
