import User from '../models/User';
import { APP_CONFIG } from '../config/constants';

export enum TrustEvent {
  ORDER_COMPLETED = 'ORDER_COMPLETED',
  ORDER_CANCELLED = 'ORDER_CANCELLED',
  RAIN_REPORTED = 'RAIN_REPORTED',
  LATE_DELIVERY = 'LATE_DELIVERY',
  DISPUTE_LOST = 'DISPUTE_LOST',
  ABANDON_ORDER = 'ABANDON_ORDER',
  COMPLETED_ORDER_RIDER = 'COMPLETED_ORDER_RIDER'
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
    case TrustEvent.ABANDON_ORDER:
      return -15;
    case TrustEvent.COMPLETED_ORDER_RIDER:
      return 5;
    default:
      return 0;
  }
};

export const updateTrustPoints = async (userId: string, event: TrustEvent) => {
  try {
    const points = calculatePoints(event);
    const user = await User.findById(userId);
    if (!user) return 0;

    user.trustPoints += points;
    user.trustScore = user.trustPoints; // Sync score with points for simplicity

    if (points < 0) {
      user.lastNegativeEventAt = new Date();
    }

    // Restriction Logic
    if (user.trustPoints < 30) {
      user.status = 'suspended';
    } else if (user.trustPoints < 60) {
      user.status = 'restricted';
    } else {
      user.status = 'active';
    }

    await user.save();
    return points;
  } catch (error) {
    console.error('Error updating trust points:', error);
    return 0;
  }
};
