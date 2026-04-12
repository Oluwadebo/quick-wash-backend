import Order from '../models/Order';
import { APP_CONFIG } from '../config/constants';

export const reportRain = async (orderId: string, reporterId: string) => {
  const delayUntil = new Date();
  delayUntil.setMinutes(delayUntil.getMinutes() + APP_CONFIG.RAIN_DELAY_DURATION_MINUTES);
  
  return await Order.findByIdAndUpdate(orderId, {
    rainReportedBy: reporterId,
    rainDelayUntil: delayUntil,
  }, { new: true });
};
