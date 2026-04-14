import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User, { UserRole } from '../models/User';
import Wallet from '../models/Wallet';
import { sendOTP } from '../utils/sms';

const generateToken = (id: string) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'secret', {
    expiresIn: '30d',
  });
};

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

export const register = async (req: Request, res: Response) => {
  const { name, email, password, phone, role, businessName, landmark } = req.body;

  try {
    const userExists = await User.findOne({ $or: [{ email }, { phone }] });
    if (userExists) {
      return res.status(400).json({ message: 'User with this email or phone already exists' });
    }

    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    const user = await User.create({
      name,
      email,
      password,
      phone,
      role,
      businessName,
      landmark,
      otp,
      otpExpires,
    });

    // Create wallet for the user
    await Wallet.create({ user: user._id });

    // Send OTP via SMS
    await sendOTP(phone, otp);

    res.status(201).json({
      message: 'Registration successful. Please verify your phone number.',
      userId: user._id,
      phone: user.phone,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const verifyPhone = async (req: Request, res: Response) => {
  const { phone, otp } = req.body;

  try {
    const user = await User.findOne({ phone, otp, otpExpires: { $gt: new Date() } });
    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    user.isPhoneVerified = true;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken((user._id as any).toString()),
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const login = async (req: Request, res: Response) => {
  const { phone, password } = req.body;

  try {
    const user = await User.findOne({ phone }).select('+password');
    if (user && (await user.comparePassword(password))) {
      if (!user.isPhoneVerified) {
        // Resend OTP if not verified
        const otp = generateOTP();
        user.otp = otp;
        user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
        await user.save();
        await sendOTP(user.phone, otp);
        return res.status(403).json({ message: 'Phone not verified. OTP sent.', userId: user._id });
      }

      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken((user._id as any).toString()),
      });
    } else {
      res.status(401).json({ message: 'Invalid phone or password' });
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
