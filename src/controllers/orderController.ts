import { Request, Response } from "express";
import { ORDER_PREFIX } from "../config/constants";
import { getRiderFee } from "../config/landmarks";
import { AuthRequest } from "../middleware/auth";
import Order, { EscrowStatus, OrderStatus } from "../models/Order";
import User from "../models/User";
import Wallet from "../models/Wallet";
import { calculateEscrowSplit } from "../utils/escrow";
import { generateHandoverCode } from "../utils/handover";
import { TrustEvent, updateTrustPoints } from "../utils/trustPoints";

const ORDER_SEQUENCE = [
  OrderStatus.PENDING,
  OrderStatus.RIDER_ASSIGN_PICKUP,
  OrderStatus.PICKED_UP,
  OrderStatus.WASHING,
  OrderStatus.READY,
  OrderStatus.RIDER_ASSIGN_DELIVERY,
  OrderStatus.PICKED_UP_DELIVERY,
  OrderStatus.DELIVERED,
  OrderStatus.COMPLETED,
];

// Add this to your existing orderController.ts

export const createOrder = async (req: AuthRequest, res: Response) => {
  const { vendorId, items, landmark } = req.body;
  const user = req.user;

  try {
    const vendor = await User.findOne({ uid: vendorId });
    if (!vendor || !vendor.isOpen) {
      return res.status(400).json({
        message: "Vendor is currently closed or not found.",
      });
    }

    const totalPrice = items.reduce(
      (acc: number, item: any) => acc + item.price * item.quantity,
      0,
    );
    const riderFee = getRiderFee(landmark);
    const { vendorShare, platformShare } = calculateEscrowSplit(totalPrice);

    const order = await Order.create({
      orderId: `${ORDER_PREFIX}${Date.now()}`,
      customerUid: user?.uid,
      vendorId: vendorId,
      items,
      totalPrice,
      escrowAmount: vendorShare,
      platformFee: platformShare,
      riderFee,
      status: OrderStatus.PENDING,
      escrowStatus: EscrowStatus.HELD,
      pickupCode: generateHandoverCode(), // 4-digit code generated here
      handoverCode: generateHandoverCode(), // Generic handover code as requested
    });

    res.status(201).json(order);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateOrderStatus = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { status, handoverCode } = req.body;

  try {
    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    // Validate Sequence
    const currentIndex = ORDER_SEQUENCE.indexOf(order.status);
    const nextIndex = ORDER_SEQUENCE.indexOf(status);

    if (nextIndex !== currentIndex + 1) {
      return res.status(400).json({
        message: `Invalid status transition from ${order.status} to ${status}.`,
      });
    }

    // Handover Code Verification
    if (status === OrderStatus.PICKED_UP || status === OrderStatus.DELIVERED) {
      if (handoverCode !== order.handoverCode) {
        return res
          .status(400)
          .json({ message: "Invalid handover code verification." });
      }
    }

    order.status = status;

    // Financial Transfers on Completion
    if (status === OrderStatus.COMPLETED) {
      order.completedAt = new Date();
      order.escrowStatus = EscrowStatus.RELEASED;
      order.paymentStatus = "released";

      const vendor = await User.findOne({ uid: order.vendorId });
      const rider = await User.findOne({ uid: order.riderUid });

      if (vendor) {
        const vendorWallet = await Wallet.findOne({ user: vendor._id });
        if (vendorWallet) {
          const vendorProfit = order.totalPrice - order.riderFee;
          vendorWallet.balance += vendorProfit;
          vendorWallet.transactions.push({
            amount: vendorProfit,
            type: "credit",
            purpose: "order_payment",
            reference: order.orderId,
            date: new Date(),
          });
          await vendorWallet.save();
        }
      }

      if (rider) {
        const riderWallet = await Wallet.findOne({ user: rider._id });
        if (riderWallet) {
          riderWallet.balance += order.riderFee;
          riderWallet.transactions.push({
            amount: order.riderFee,
            type: "credit",
            purpose: "earning",
            reference: order.orderId,
            date: new Date(),
          });
          await riderWallet.save();
        }
        // Add Trust Points for completes
        await updateTrustPoints(
          rider._id.toString(),
          TrustEvent.ORDER_COMPLETED,
        );
      }
    }

    await order.save();
    res.json(order);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const claimOrder = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const user = req.user;

  try {
    // Atomic "First-to-Claim" lock mechanism
    const order = await Order.findOneAndUpdate(
      {
        _id: id,
        status: { $in: [OrderStatus.PENDING, OrderStatus.READY] },
        riderUid: { $exists: false },
      },
      {
        $set: {
          status: OrderStatus.RIDER_ASSIGN_PICKUP,
          riderUid: user?.uid,
        },
      },
      { new: true },
    );

    if (!order) {
      return res.status(400).json({
        message: "Order was already claimed or is no longer available.",
      });
    }

    res.json(order);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
// export const claimOrder = async (req: Request, res: Response) => {
//   try {
//     const { orderId } = req.params;
//     const { riderUid, riderName, riderPhone } = req.body;

//     const order = await Order.findById(orderId);
//     if (!order || order.riderUid)
//       return res.status(400).json({ message: "Order already claimed" });

//     // Atomic Lock Simulation (Matching your 50ms re-check logic)
//     order.riderUid = riderUid;
//     order.riderName = riderName;
//     order.riderPhone = riderPhone;
//     order.status = "picked_up"; // or your specific status
//     await order.save();

//     res.json(order);
//   } catch (error: any) {
//     res.status(500).json({ message: error.message });
//   }
// };

// export const returnOrder = async (req: AuthRequest, res: Response) => {
//   const { id } = req.params;
//   const user = req.user;

//   try {
//     const order = await Order.findOne({ _id: id, riderUid: user?.uid });
//     if (!order)
//       return res
//         .status(404)
//         .json({ message: "Order not found or not assigned to you." });

//     // Penalty logic: -₦200, -5 Trust
//     const wallet = await Wallet.findOne({ user: user?._id });
//     if (wallet) {
//       wallet.balance -= 200;
//       wallet.transactions.push({
//         amount: 200,
//         type: "debit",
//         purpose: "return_penalty",
//         reference: order.orderId,
//         date: new Date(),
//       });
//       await wallet.save();
//     }

//     await User.findByIdAndUpdate(user?._id, {
//       $inc: { trustPoints: -5, consecutiveReturns: 1 },
//       lastNegativeEventAt: Date.now(),
//     });

//     order.status = OrderStatus.PENDING;
//     order.riderUid = undefined;
//     await order.save();

//     res.json({ message: "Order returned. Penalty applied.", order });
//   } catch (error: any) {
//     res.status(500).json({ message: error.message });
//   }
// };

export const returnOrder = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { riderUid, reason } = req.body;

    const order = await Order.findById(id);
    const rider = await User.findOne({ uid: riderUid });
    if (!order || !rider) return res.status(404).json({ message: "Not found" });

    // Apply ₦200 Penalty from DatabaseService.ts
    rider.walletBalance = Math.max(0, rider.walletBalance - 200);

    // Check for 5 consecutive returns suspension
    const consecutiveReturns = (rider.consecutiveReturns || 0) + 1;
    if (consecutiveReturns >= 5) {
      rider.status = "suspended";
      rider.consecutiveReturns = 0;
    } else {
      rider.consecutiveReturns = consecutiveReturns;
    }

    await rider.save();
    // order.status = 'rider_assign_pickup';
    (order as any).status = "rider_assign_pickup"; // Return to pool
    order.riderUid = undefined;
    await order.save();

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getAllOrders = async (req: AuthRequest, res: Response) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getOrderById = async (req: AuthRequest, res: Response) => {
  const user = req.user;
  const isSuperAdmin = user?.email === "ogunwedebo21@gmail.com";

  try {
    const query: any = { _id: req.params.orderId };
    if (!isSuperAdmin) {
      query.$or = [
        { customerUid: user?.uid },
        { vendorId: user?.uid },
        { riderUid: user?.uid },
      ];
    }

    const order = await Order.findOne(query);
    if (!order)
      return res
        .status(404)
        .json({ message: "Order not found or unauthorized" });
    res.json(order);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// export const cancelOrder = async (req: AuthRequest, res: Response) => {
//   const { id } = req.params;
//   const user = req.user;

//   try {
//     const order = await Order.findOne({
//       _id: id,
//       customerUid: user?.uid,
//       status: { $in: [OrderStatus.PENDING, OrderStatus.RIDER_ASSIGN_PICKUP] },
//     });

//     if (!order) {
//       return res.status(400).json({
//         message: "Order cannot be cancelled or unauthorized.",
//       });
//     }

//     const wallet = await Wallet.findOne({ user: user?._id });
//     if (wallet) {
//       const refundAmount = order.totalPrice + order.riderFee;
//       wallet.balance += refundAmount;
//       wallet.transactions.push({
//         amount: refundAmount,
//         type: "credit",
//         purpose: "order_payment",
//         reference: `REFUND-${order.orderId}`,
//         date: new Date(),
//       });
//       await wallet.save();
//     }

//     order.status = OrderStatus.CANCELLED;
//     order.paymentStatus = "refunded";
//     await order.save();

//     res.json({ message: "Order cancelled, 100% refund processed.", order });
//   } catch (error: any) {
//     res.status(500).json({ message: error.message });
//   }
// };

export const cancelOrder = async (req: Request, res: Response) => {
  try {
    const twentyMinsAgo = new Date(Date.now() - 20 * 60 * 1000);

    // Find unassigned orders older than 20 mins
    const expiredOrders = await Order.find({
      status: { $in: ["rider_assign_pickup", "rider_assign_delivery"] },
      riderUid: { $exists: false },
      createdAt: { $lte: twentyMinsAgo },
    });

    for (const order of expiredOrders) {
      const customer = await User.findOne({ uid: order.customerUid });
      if (customer) {
        customer.walletBalance += order.totalPrice;
        await customer.save();
      }

      // Update this to match the EXACT value in your OrderStatus enum
      // order.status = OrderStatus.CANCELLED;
      (order as any).status = "CANCELLED";
      await order.save();
    }

    res.json({ message: `Processed ${expiredOrders.length} orders` });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const setReadyForPickup = async (req: AuthRequest, res: Response) => {
  const { orderId } = req.params;
  try {
    const order = await Order.findByIdAndUpdate(
      orderId,
      {
        readyForPickup: true,
        status: OrderStatus.READY,
      },
      { new: true },
    );
    res.json(order);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const setReadyToReceive = async (req: AuthRequest, res: Response) => {
  const { orderId } = req.params;
  const user = req.user;

  try {
    const order = await Order.findOneAndUpdate(
      { _id: orderId, customerUid: user?.uid },
      { readyToReceive: true },
      { new: true },
    );

    if (!order)
      return res
        .status(404)
        .json({ message: "Order not found or unauthorized" });
    res.json(order);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
