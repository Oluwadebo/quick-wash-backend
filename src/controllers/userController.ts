import { Response, Request } from 'express';
import User from '../models/User';
import Wallet from '../models/Wallet';
import { AuthRequest } from '../middleware/auth';
import { updateTrustPoints, TrustEvent } from '../utils/trustPoints';

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getUserByUid = async (req: Request, res: Response) => {
  const { uid } = req.params;
  try {
    const user = await User.findOne({ uid }).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateUserByUid = async (req: AuthRequest, res: Response) => {
  const { uid } = req.params;
  const updateData = req.body;

  try {
    const user = await User.findOneAndUpdate({ uid }, updateData, { new: true }).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const adjustTrustPoints = async (req: AuthRequest, res: Response) => {
  const { uid } = req.params;
  const { action } = req.body; // e.g., 'completed_order'

  try {
    const user = await User.findOne({ uid });
    if (!user) return res.status(404).json({ message: 'User not found' });

    let event: TrustEvent;
    if (action === 'completed_order') event = TrustEvent.ORDER_COMPLETED;
    else if (action === 'cancelled_order') event = TrustEvent.ORDER_CANCELLED;
    else event = TrustEvent.ORDER_COMPLETED; // Default

    const points = await updateTrustPoints(user._id.toString(), event);
    res.json({ message: 'Trust points adjusted', pointsBy: points, currentPoints: user.trustPoints });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const recordTransaction = async (req: AuthRequest, res: Response) => {
  const { uid } = req.params; // Using uid as requested
  const { amount, type, purpose, reference } = req.body;

  try {
    const user = await User.findOne({ uid });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const wallet = await Wallet.findOne({ user: user._id });
    if (!wallet) return res.status(404).json({ message: 'Wallet not found' });

    if (type === 'credit') {
      wallet.balance += amount;
    } else {
      wallet.balance -= amount;
    }

    wallet.transactions.push({
      amount,
      type,
      purpose,
      reference: reference || `TRX-${Date.now()}`,
      date: new Date()
    });

    await wallet.save();
    res.json({ message: 'Transaction recorded', balance: wallet.balance });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
