import cron from 'node-cron';
import Order, { OrderStatus, EscrowStatus } from '../models/Order';
import Wallet from '../models/Wallet';
import { updateTrustPoints, TrustEvent } from './trustPoints';

export const initCronJobs = () => {
  // Run every hour to check for escrow auto-release
  cron.schedule('0 * * * *', async () => {
    console.log('Running Escrow Auto-Release Cron...');
    const now = new Date();

    try {
      // Find orders that are delivered but not completed, and autoReleaseAt has passed
      const ordersToRelease = await Order.find({
        status: OrderStatus.DELIVERED,
        escrowStatus: EscrowStatus.HELD,
        autoReleaseAt: { $lte: now }
      });

      for (const order of ordersToRelease) {
        // Release funds to vendor
        const vendorWallet = await Wallet.findOne({ user: order.vendor });
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

        order.status = OrderStatus.COMPLETED;
        order.escrowStatus = EscrowStatus.RELEASED;
        order.paymentStatus = 'released';
        await order.save();

        // Update trust points
        await updateTrustPoints(order.customer.toString(), TrustEvent.ORDER_COMPLETED);
        await updateTrustPoints(order.vendor.toString(), TrustEvent.ORDER_COMPLETED);
        
        console.log(`Auto-released order: ${order.orderId}`);
      }
    } catch (error) {
      console.error('Cron Job Error:', error);
    }
  });
};
