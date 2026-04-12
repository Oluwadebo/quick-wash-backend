import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Order, { OrderStatus } from '../models/Order';
import { getRiderFee } from '../config/landmarks';
import { ORDER_PREFIX } from '../config/constants';
import { generateHandoverCode } from '../utils/handover';
import { calculateEscrowSplit } from '../utils/escrow';
import { updateTrustPoints } from '../utils/trustPoints';

export const createOrder = async (req: AuthRequest, res: Response) => {
  const { vendorId, items, landmark } = req.body;
  const customerId = req.user?._id;

  try {
    const totalAmount = items.reduce((acc: number, item: any) => acc + item.price * item.quantity, 0);
    const riderFee = getRiderFee(landmark);
    const { vendorShare } = calculateEscrowSplit(totalAmount);

    const order = await Order.create({
      orderId: `${ORDER_PREFIX}${Date.now()}`,
      customer: customerId,
      vendor: vendorId,
      items,
      totalAmount,
      escrowAmount: vendorShare,
      riderFee,
      status: OrderStatus.PENDING,
      pickupCode: generateHandoverCode(),
    });

    res.status(201).json(order);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateOrderStatus = async (req: AuthRequest, res: Response) => {
  const { orderId } = req.params;
  const { status, handoverCode } = req.body;

  try {
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    // Logic for Handover Verification
    if (status === OrderStatus.PICKED_UP && handoverCode !== order.pickupCode) {
      return res.status(400).json({ message: 'Invalid pickup code' });
    }

    if (status === OrderStatus.RECEIVED_BY_VENDOR) {
      order.vendorHandoverCode = generateHandoverCode();
    }

    order.status = status;
    await order.save();

    // Update Trust Points on Completion
    if (status === OrderStatus.COMPLETED) {
      await updateTrustPoints(order.customer.toString(), 5);
      await updateTrustPoints(order.vendor.toString(), 5);
    }

    res.json(order);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const readyForPickup = async (req: AuthRequest, res: Response) => {
  const { orderId } = req.params;
  try {
    const order = await Order.findByIdAndUpdate(orderId, { 
      isReadyForPickup: true,
      status: OrderStatus.READY_FOR_PICKUP,
      deliveryCode: generateHandoverCode()
    }, { new: true });
    res.json(order);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
