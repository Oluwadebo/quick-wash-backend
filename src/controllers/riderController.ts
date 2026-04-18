import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Order, { OrderStatus } from '../models/Order';
import User from '../models/User';

export const getAvailableOrders = async (req: AuthRequest, res: Response) => {
  const riderUid = req.user?.uid;
  try {
    const orders = await Order.find({ 
      $or: [
        { status: OrderStatus.PENDING, riderUid: { $exists: false } },
        { status: OrderStatus.READY, riderUid: riderUid }
      ]
    });
    res.json(orders);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const acceptOrder = async (req: AuthRequest, res: Response) => {
  const { orderId } = req.params;
  const riderUid = req.user?.uid;

  try {
    const order = await Order.findOneAndUpdate(
      { 
        _id: orderId,
        $or: [
          { status: OrderStatus.PENDING, riderUid: { $exists: false } },
          { status: OrderStatus.READY, riderUid: { $exists: false } }
        ]
      },
      {
        $set: {
          status: OrderStatus.RIDER_ASSIGN_PICKUP, // Simplification for sequence
          riderUid: riderUid
        }
      },
      { new: true }
    );

    if (!order) {
      return res.status(400).json({ 
        message: 'Order was already claimed by another rider or is no longer available.' 
      });
    }

    res.json(order);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateLocation = async (req: AuthRequest, res: Response) => {
  const { lat, lng } = req.body;
  try {
    await User.findByIdAndUpdate(req.user?._id, {
      currentLocation: { lat, lng },
      isAvailable: true
    });
    res.json({ message: 'Location updated' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
