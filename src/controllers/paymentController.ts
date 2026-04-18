import { Request, Response } from 'express';
import crypto from 'crypto';
import Order from '../models/Order';
import Wallet from '../models/Wallet';

export const paystackWebhook = async (req: Request, res: Response) => {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  const hash = crypto.createHmac('sha512', secret!).update(JSON.stringify(req.body)).digest('hex');

  if (hash === req.headers['x-paystack-signature']) {
    const event = req.body;

    if (event.event === 'charge.success') {
      const { reference, amount, customer } = event.data;
      
      // Check if it's an order payment or wallet deposit
      // For simplicity, we'll assume reference starts with QW- for orders
      if (reference.startsWith('QW-')) {
        const order = await Order.findOne({ orderId: reference });
        if (order) {
          order.paymentStatus = 'paid';
          await order.save();
        }
      } else {
        // Wallet deposit
        const userWallet = await Wallet.findOne({ 'user.email': customer.email });
        if (userWallet) {
          userWallet.balance += amount / 100;
          userWallet.transactions.push({
            amount: amount / 100,
            type: 'credit',
            purpose: 'order_payment',
            reference,
            date: new Date()
          });
          await userWallet.save();
        }
      }
    }
  }

  res.sendStatus(200);
};
