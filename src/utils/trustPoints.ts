import User from '../models/User';
import { APP_CONFIG } from '../config/constants';

export const updateTrustPoints = async (userId: string, points: number) => {
  try {
    await User.findByIdAndUpdate(userId, {
      $inc: { trustPoints: points },
    });
  } catch (error) {
    console.error('Error updating trust points:', error);
  }
};
