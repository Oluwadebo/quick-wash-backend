import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export enum UserRole {
  CUSTOMER = 'customer',
  VENDOR = 'vendor',
  RIDER = 'rider',
  ADMIN = 'admin',
}

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  phone: string;
  role: UserRole;
  avatar?: string;
  address?: string;
  landmark?: string; // For riders/customers
  isVerified: boolean;
  trustPoints: number;
  
  // Vendor specific
  businessName?: string;
  isOpen?: boolean;
  
  // Rider specific
  isAvailable?: boolean;
  currentLocation?: {
    lat: number;
    lng: number;
  };

  comparePassword(password: string): Promise<boolean>;
}

const UserSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, select: false },
    phone: { type: String, required: true, unique: true },
    role: { type: String, enum: Object.values(UserRole), default: UserRole.CUSTOMER },
    avatar: { type: String },
    address: { type: String },
    landmark: { type: String },
    isVerified: { type: Boolean, default: false },
    trustPoints: { type: Number, default: 100 }, // Default trust score
    
    // Vendor specific
    businessName: { type: String },
    isOpen: { type: Boolean, default: true },
    
    // Rider specific
    isAvailable: { type: Boolean, default: false },
    currentLocation: {
      lat: { type: Number },
      lng: { type: Number },
    },
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
