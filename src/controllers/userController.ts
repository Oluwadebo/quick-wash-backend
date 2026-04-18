import { Request, Response } from "express";
import { AuthRequest } from "../middleware/auth";
import User from "../models/User";
import Wallet from "../models/Wallet";

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await User.find().select("-password");
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getUserByUid = async (req: Request, res: Response) => {
  const { uid } = req.params;
  try {
    const user = await User.findOne({ uid }).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateUserByUid = async (req: AuthRequest, res: Response) => {
  const { uid } = req.params;
  const updateData = req.body;

  try {
    if (updateData.trustPoints !== undefined) {
      updateData.trustPoints = Math.min(
        100,
        Math.max(0, updateData.trustPoints),
      );
    }
    const user = await User.findOneAndUpdate({ uid }, updateData, {
      new: true,
    }).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { uid } = req.params;
    const user = await User.findOneAndDelete({ uid });
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ message: "User deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// export const adjustTrustPoints = async (req: AuthRequest, res: Response) => {
//   const { uid } = req.params;
//   const { action } = req.body; // e.g., 'completed_order'

//   try {
//     const user = await User.findOne({ uid });
//     if (!user) return res.status(404).json({ message: "User not found" });

//     let event: TrustEvent;
//     if (action === "completed_order") event = TrustEvent.ORDER_COMPLETED;
//     else if (action === "cancelled_order") event = TrustEvent.ORDER_CANCELLED;
//     else event = TrustEvent.ORDER_COMPLETED; // Default

//     const points = await updateTrustPoints(user._id.toString(), event);
//     res.json({
//       message: "Trust points adjusted",
//       pointsBy: points,
//       currentPoints: user.trustPoints,
//     });
//   } catch (error: any) {
//     res.status(500).json({ message: error.message });
//   }
// };

export const adjustTrustPoints = async (req: Request, res: Response) => {
  try {
    const { uid } = req.params;
    const { action } = req.body;
    const user = await User.findOne({ uid });
    if (!user) return res.status(404).json({ message: "User not found" });

    let change = 0;
    let isPenalty = false;

    // Direct mapping from your TrustAction type in frontend
    switch (action) {
      case "completed_order":
        change = 5;
        break;
      case "five_star_review":
        change = 8;
        break;
      case "admin_good_performance":
        change = 10;
        break;
      case "cancel_after_ready":
        change = -10;
        isPenalty = true;
        break;
      case "customer_not_available":
        change = -8;
        isPenalty = true;
        break;
      case "late_delivery":
        change = -10;
        isPenalty = true;
        break;
      case "rider_abandon":
        change = -15;
        isPenalty = true;
        break;
      case "vendor_delay":
        change = -12;
        isPenalty = true;
        break;
      case "fake_dispute":
        change = -20;
        isPenalty = true;
        break;
      case "rider_return_order":
        change = -5;
        isPenalty = true;
        break;
      case "repeated_cancellation":
        change = -25;
        isPenalty = true;
        user.status = "restricted";
        user.restrictionExpires = new Date(
          Date.now() + 2 * 24 * 60 * 60 * 1000,
        ).toISOString();
        break;
      default:
        change = 0;
    }

    user.trustPoints = Math.min(100, Math.max(0, user.trustPoints + change));
    if (isPenalty) user.lastPenaltyAt = new Date().toISOString();

    await user.save();
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const autoRecoverTrust = async (req: Request, res: Response) => {
  try {
    const { uid } = req.params;
    const user = await User.findOne({ uid });
    if (!user) return res.status(404).json({ message: "User not found" });

    const now = new Date();
   const lastPenalty = user.lastPenaltyAt
     ? new Date(user.lastPenaltyAt).getTime()
     : 0;
   const lastRecovery = user.lastRecoveryAt
     ? new Date(user.lastRecoveryAt).getTime()
     : 0;

    const daysSincePenalty =
      (now.getTime() - lastPenalty) / (24 * 60 * 60 * 1000);
    const daysSinceRecovery =
      (now.getTime() - lastRecovery) / (24 * 60 * 60 * 1000);

    // Sync with processAutoRecovery: Must be 27 days clean
    if (
      daysSincePenalty >= 27 &&
      daysSinceRecovery >= 27 &&
      user.trustPoints < 100
    ) {
      user.trustPoints = Math.min(100, user.trustPoints + 10);
      user.lastRecoveryAt = now.toISOString();
      await user.save();
    }
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const recordTransaction = async (req: AuthRequest, res: Response) => {
  const { uid } = req.params;
  const { amount, type, desc, purpose, reference } = req.body;

  try {
    const user = await User.findOne({ uid });
    if (!user) return res.status(404).json({ message: "User not found" });

    // Find the wallet linked to the user's MongoDB _id
    let wallet = await Wallet.findOne({ user: user._id });

    // Create wallet if it doesn't exist (safety for newly migrated users)
    if (!wallet) {
      wallet = new Wallet({ user: user._id, balance: 0, transactions: [] });
    }

    if (type === "credit" || type === "deposit") {
      wallet.balance += amount;
    } else if (type === "debit" || type === "withdrawal") {
      wallet.balance -= amount;
    }

    wallet.transactions.push({
      amount,
      type,
      purpose: purpose || desc,
      reference: reference || `TRX-${Date.now()}`,
      date: new Date(),
    });

    await wallet.save();

    // Also update the User model walletBalance for quick frontend access
    user.walletBalance = wallet.balance;
    await user.save();

    res.json({ message: "Transaction recorded", balance: wallet.balance });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
