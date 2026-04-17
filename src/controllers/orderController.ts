import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Order, { OrderStatus, EscrowStatus } from '../models/Order';
import User from '../models/User';
import Wallet from '../models/Wallet';
import { getRiderFee } from '../config/landmarks';
import { ORDER_PREFIX } from '../config/constants';
import { generateHandoverCode } from '../utils/handover';
import { calculateEscrowSplit } from '../utils/escrow';
import { updateTrustPoints, TrustEvent } from '../utils/trustPoints';
import { sendSMS } from '../utils/sms';

export const createOrder = async (req: AuthRequest, res: Response) => {
  const { vendorId, items, landmark } = req.body;
  const customerId = req.user?._id;

  try {
    const vendor = await User.findById(vendorId);
    if (!vendor || !vendor.isOpen) {
      return res.status(400).json({ 
        message: 'Vendor is currently closed (Rain Lock or Manual Closure). Cannot place order.' 
      });
    }

    const totalAmount = items.reduce((acc: number, item: any) => acc + item.price * item.quantity, 0);
    const riderFee = getRiderFee(landmark);
    const { vendorShare, platformShare } = calculateEscrowSplit(totalAmount);

    const order = await Order.create({
      orderId: `${ORDER_PREFIX}${Date.now()}`,
      customer: customerId,
      vendor: vendorId,
      items,
      totalAmount,
      escrowAmount: vendorShare,
      platformFee: platformShare,
      riderFee,
      status: OrderStatus.PENDING,
      escrowStatus: EscrowStatus.HELD,
      pickupCode: generateHandoverCode(),
    });

    res.status(201).json(order);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateOrderStatus = async (req: AuthRequest, res: Response) => {
  const { orderId } = req.params;
  const { status, handoverCode, sealedBagPhoto } = req.body;

  try {
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    // Logic for Handover Verification
    if (status === OrderStatus.PICKED_UP && handoverCode !== order.pickupCode) {
      return res.status(400).json({ message: 'Invalid pickup code' });
    }

    if (status === OrderStatus.RECEIVED_BY_VENDOR) {
      order.vendorHandoverCode = generateHandoverCode();
      if (sealedBagPhoto) order.sealedBagPhoto = sealedBagPhoto;
    }

    order.status = status;
    
    if (status === OrderStatus.DELIVERED) {
      const releaseTime = new Date();
      releaseTime.setHours(releaseTime.getHours() + 24);
      order.autoReleaseAt = releaseTime;
      order.paymentStatus = 'escrow';
      
      // Notify customer
      const customer = await User.findById(order.customer);
      if (customer) {
        await sendSMS(customer.phone, `Your order ${order.orderId} has been delivered! Funds will be released in 24h unless you raise a dispute.`);
      }
    }

    // Automatic Trust Points on Completion
    if (status === OrderStatus.COMPLETED) {
      order.escrowStatus = EscrowStatus.RELEASED;
      order.paymentStatus = 'released';
      
      const customerPoints = await updateTrustPoints(order.customer.toString(), TrustEvent.ORDER_COMPLETED);
      const vendorPoints = await updateTrustPoints(order.vendor.toString(), TrustEvent.ORDER_COMPLETED);
      order.trustPointsImpact = customerPoints + vendorPoints;
    }

    await order.save();
    res.json(order);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const setReadyForPickup = async (req: AuthRequest, res: Response) => {
  const { orderId } = req.params;
  try {
    const order = await Order.findByIdAndUpdate(orderId, { 
      readyForPickup: true,
      status: OrderStatus.READY_FOR_PICKUP,
      deliveryCode: generateHandoverCode()
    }, { new: true });
    res.json(order);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const cancelOrder = async (req: AuthRequest, res: Response) => {
  const { orderId } = req.params;
  const userId = req.user?._id;

  try {
    // Privacy-First: Customer can only cancel their own order
    const order = await Order.findOne({ 
      _id: orderId, 
      customer: userId,
      status: { $in: [OrderStatus.PENDING, OrderStatus.RIDER_ASSIGNED_PICKUP] }
    });

    if (!order) {
      return res.status(400).json({ 
        message: 'Order cannot be cancelled or you are not authorized. Cancellation is only possible before pickup.' 
      });
    }

    // High-Visibility Cancellation Logic: 100% Refund if cancelled before pickup
    const wallet = await Wallet.findOne({ user: userId });
    if (wallet) {
      const refundAmount = order.totalAmount + order.riderFee;
      wallet.balance += refundAmount;
      wallet.transactions.push({
        amount: refundAmount,
        type: 'credit',
        purpose: 'order_payment',
        reference: `REFUND-${order.orderId}`,
        date: new Date()
      });
      await wallet.save();
    }

    order.status = OrderStatus.CANCELLED;
    order.paymentStatus = 'refunded';
    await order.save();

    res.json({ message: 'Order cancelled successfully and 100% refund processed to wallet.', order });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const setReadyToReceive = async (req: AuthRequest, res: Response) => {
  const { orderId } = req.params;
  const userId = req.user?._id;

  try {
    // Privacy-First: Only customer can signal ready to receive
    const order = await Order.findOneAndUpdate(
      { _id: orderId, customer: userId },
      { readyToReceive: true },
      { new: true }
    );
    
    if (!order) return res.status(404).json({ message: 'Order not found or unauthorized' });
    res.json(order);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getOrderById = async (req: AuthRequest, res: Response) => {
    const userId = req.user?._id;
    const isSuperAdmin = req.user?.email === 'ogunwedebo21@gmail.com';

    try {
        // Privacy-First Filtering: Ensure user only sees their own orders
        const query: any = { _id: req.params.orderId };
        if (!isSuperAdmin) {
            query.$or = [
                { customer: userId },
                { vendor: userId },
                { pickupRider: userId },
                { deliveryRider: userId }
            ];
        }

        const order = await Order.findOne(query).populate('customer vendor pickupRider deliveryRider');
        if (!order) return res.status(404).json({ message: 'Order not found or unauthorized' });
        res.json(order);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
