import { APP_CONFIG } from '../config/constants';

export const calculateEscrowSplit = (totalAmount: number) => {
  // 80/20 Split logic
  const vendorShare = (totalAmount * APP_CONFIG.ESCROW_VENDOR_PERCENTAGE) / 100;
  const platformShare = (totalAmount * APP_CONFIG.ESCROW_PLATFORM_PERCENTAGE) / 100;
  
  return {
    vendorShare,
    platformShare,
    total: totalAmount
  };
};

export const releaseEscrow = (totalAmount: number) => {
    return calculateEscrowSplit(totalAmount);
};
