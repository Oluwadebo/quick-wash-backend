import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import Order from '../models/Order';

export const checkReadyForPickup = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const { orderId } = req.params;
  try {
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    
    if (!order.readyForPickup) {
      return res.status(400).json({ message: 'Order is not yet ready for pickup by vendor' });
    }
    next();
  } catch (_error) {
    res.status(500).json({ message: 'Server error checking ready status' });
  }
};

export const checkReadyToReceive = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const { orderId } = req.params;
  try {
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    
    if (!order.readyToReceive) {
      return res.status(400).json({ message: 'Customer has not signaled readiness to receive' });
    }
    next();
  } catch (_error) {
    res.status(500).json({ message: 'Server error checking ready status' });
  }
};
