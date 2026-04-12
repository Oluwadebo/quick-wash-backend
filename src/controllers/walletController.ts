import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Wallet from '../models/Wallet';
import { paystack } from '../config/paystack';

export const getWalletBalance = async (req: AuthRequest, res: Response) => {
  try {
    const wallet = await Wallet.findOne({ user: req.user?._id });
    res.json(wallet);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const initializeDeposit = async (req: AuthRequest, res: Response) => {
  const { amount } = req.body;
  try {
    const data = await paystack.initializeTransaction(req.user?.email!, amount);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const verifyDeposit = async (req: AuthRequest, res: Response) => {
  const { reference } = req.body;
  try {
    const data = await paystack.verifyTransaction(reference);
    if (data.status && data.data.status === 'success') {
      const amount = data.data.amount / 100;
      const wallet = await Wallet.findOne({ user: req.user?._id });
      if (wallet) {
        wallet.balance += amount;
        wallet.transactions.push({
          amount,
          type: 'credit',
          purpose: 'order_payment',
          reference,
          date: new Date(),
        });
        await wallet.save();
      }
      res.json({ message: 'Deposit successful', balance: wallet?.balance });
    } else {
      res.status(400).json({ message: 'Payment verification failed' });
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
