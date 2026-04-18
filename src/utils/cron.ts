import cron from 'node-cron';
import Order, { OrderStatus, EscrowStatus } from '../models/Order';
import Wallet from '../models/Wallet';
import { updateTrustPoints, TrustEvent } from './trustPoints';

import User from '../models/User';

export const initCronJobs = () => {
  // Run every hour to check for escrow auto-release
  cron.schedule('0 * * * *', async () => {
    console.log('Running Escrow Auto-Release Cron...');
    const now = new Date();

    try {
      const ordersToRelease = await Order.find({
        status: OrderStatus.DELIVERED,
        escrowStatus: EscrowStatus.HELD,
        autoReleaseAt: { $lte: now }
      });

      for (const order of ordersToRelease) {
        const vendor = await User.findOne({ uid: order.vendorId });
        if (vendor) {
          const vendorWallet = await Wallet.findOne({ user: vendor._id });
          if (vendorWallet) {
            vendorWallet.balance += order.escrowAmount;
            vendorWallet.transactions.push({
              amount: order.escrowAmount,
              type: 'credit',
              purpose: 'vendor_payout',
              reference: order.orderId,
              date: new Date()
            });
            await vendorWallet.save();
          }
        }

        order.status = OrderStatus.COMPLETED;
        order.escrowStatus = EscrowStatus.RELEASED;
        order.paymentStatus = 'released';
        order.completedAt = new Date();
        await order.save();

        const customer = await User.findOne({ uid: order.customerUid });
        if (customer) await updateTrustPoints(customer._id.toString(), TrustEvent.ORDER_COMPLETED);
        if (vendor) await updateTrustPoints(vendor._id.toString(), TrustEvent.ORDER_COMPLETED);
        
        console.log(`Auto-released order: ${order.orderId}`);
      }
    } catch (error) {
      console.error('Cron Job Error:', error);
    }
  });

  // Run daily at midnight to check for Trust Point Recovery
  cron.schedule('0 0 * * *', async () => {
    console.log('Running Trust Point Recovery Cron...');
    const twentySevenDaysAgo = new Date();
    twentySevenDaysAgo.setDate(twentySevenDaysAgo.getDate() - 27);

    try {
      // Find users who have points below max (100) and no negative events in 27 days
      const usersToRecover = await User.find({
        trustPoints: { $lt: 100 },
        lastNegativeEventAt: { $lte: twentySevenDaysAgo }
      });

      for (const user of usersToRecover) {
        user.trustPoints = Math.min(100, user.trustPoints + 10);
        user.trustScore = user.trustPoints;
        
        // Update Status
        if (user.trustPoints >= 60) {
          user.status = 'active';
        } else if (user.trustPoints >= 30) {
          user.status = 'restricted';
        }

        // Move the date forward by 27 days so they can earn again in 27 days
        const oldDate = user.lastNegativeEventAt || new Date();
        user.lastNegativeEventAt = new Date(oldDate.getTime() + 27 * 24 * 60 * 60 * 1000);
        await user.save();
        console.log(`Recovered 10 points for user: ${user.fullName}`);
      }
    } catch (error) {
      console.error('Trust Recovery Cron Error:', error);
    }
  });
};
