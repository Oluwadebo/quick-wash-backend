import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Order, { OrderStatus } from '../models/Order';
import User from '../models/User';

export const getAvailableOrders = async (req: AuthRequest, res: Response) => {
  try {
    const orders = await Order.find({ 
      status: { $in: [OrderStatus.PENDING, OrderStatus.READY_FOR_PICKUP] },
      pickupRider: { $exists: false }
    });
    res.json(orders);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const acceptOrder = async (req: AuthRequest, res: Response) => {
  const { orderId } = req.params;
  const riderId = req.user?._id;

  try {
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    if (order.status === OrderStatus.PENDING) {
      order.pickupRider = riderId as any;
      order.status = OrderStatus.RIDER_ASSIGNED_PICKUP;
    } else if (order.status === OrderStatus.READY_FOR_PICKUP) {
      order.deliveryRider = riderId as any;
      order.status = OrderStatus.RIDER_ASSIGNED_DELIVERY;
    }

    await order.save();
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
