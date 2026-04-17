import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Order, { OrderStatus } from '../models/Order';
import User from '../models/User';

export const getAvailableOrders = async (req: AuthRequest, res: Response) => {
  const riderId = req.user?._id;
  try {
    const orders = await Order.find({ 
      $or: [
        { status: OrderStatus.PENDING, pickupRider: { $exists: false } },
        { status: OrderStatus.READY_FOR_PICKUP, deliveryRider: { $exists: false }, pickupRider: riderId }
      ]
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
    // Atomic "First-to-Claim" lock mechanism
    // We update only if the order still has the original status and no rider assigned
    const order = await Order.findOneAndUpdate(
      { 
        _id: orderId,
        $or: [
          { status: OrderStatus.PENDING, pickupRider: { $exists: false } },
          { status: OrderStatus.READY_FOR_PICKUP, deliveryRider: { $exists: false } }
        ]
      },
      {
        $set: {
          status: req.body.isDelivery ? OrderStatus.RIDER_ASSIGNED_DELIVERY : OrderStatus.RIDER_ASSIGNED_PICKUP,
          [req.body.isDelivery ? 'deliveryRider' : 'pickupRider']: riderId
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
