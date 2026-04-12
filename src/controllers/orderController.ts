import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Order, { OrderStatus, EscrowStatus } from '../models/Order';
import { getRiderFee } from '../config/landmarks';
import { ORDER_PREFIX } from '../config/constants';
import { generateHandoverCode } from '../utils/handover';
import { calculateEscrowSplit } from '../utils/escrow';
import { updateTrustPoints, TrustEvent } from '../utils/trustPoints';

export const createOrder = async (req: AuthRequest, res: Response) => {
  const { vendorId, items, landmark } = req.body;
  const customerId = req.user?._id;

  try {
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

export const setReadyToReceive = async (req: AuthRequest, res: Response) => {
  const { orderId } = req.params;
  try {
    const order = await Order.findByIdAndUpdate(orderId, { 
      readyToReceive: true 
    }, { new: true });
    res.json(order);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getOrderById = async (req: AuthRequest, res: Response) => {
    try {
        const order = await Order.findById(req.params.orderId).populate('customer vendor pickupRider deliveryRider');
        if (!order) return res.status(404).json({ message: 'Order not found' });
        res.json(order);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
