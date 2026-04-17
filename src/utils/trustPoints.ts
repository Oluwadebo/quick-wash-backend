import User from '../models/User';
import { APP_CONFIG } from '../config/constants';

export enum TrustEvent {
  ORDER_COMPLETED = 'ORDER_COMPLETED',
  ORDER_CANCELLED = 'ORDER_CANCELLED',
  RAIN_REPORTED = 'RAIN_REPORTED',
  LATE_DELIVERY = 'LATE_DELIVERY',
  DISPUTE_LOST = 'DISPUTE_LOST',
}

export const calculatePoints = (event: TrustEvent): number => {
  switch (event) {
    case TrustEvent.ORDER_COMPLETED:
      return APP_CONFIG.TRUST_POINTS_ORDER_COMPLETE;
    case TrustEvent.ORDER_CANCELLED:
      return APP_CONFIG.TRUST_POINTS_ORDER_CANCEL;
    case TrustEvent.RAIN_REPORTED:
      return APP_CONFIG.TRUST_POINTS_RAIN_REPORT;
    case TrustEvent.LATE_DELIVERY:
      return -5;
    case TrustEvent.DISPUTE_LOST:
      return -20;
    default:
      return 0;
  }
};

export const updateTrustPoints = async (userId: string, event: TrustEvent) => {
  try {
    const points = calculatePoints(event);
    const update: any = { $inc: { trustPoints: points } };
    
    if (points < 0) {
      update.lastNegativeEventAt = Date.now();
    }

    await User.findByIdAndUpdate(userId, update);
    return points;
  } catch (error) {
    console.error('Error updating trust points:', error);
    return 0;
  }
};
