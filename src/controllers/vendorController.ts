import { Request, Response } from 'express';
import PriceList from '../models/PriceList';
import User, { UserRole } from '../models/User';
import { AuthRequest } from '../middleware/auth';
import { logAuditAction } from '../utils/auditLogger';

export const getVendors = async (req: Request, res: Response) => {
  try {
    const vendors = await User.find({ role: UserRole.VENDOR, isApproved: true });
    res.json(vendors);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getPriceList = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const user = await User.findOne({ uid: id });
    if (!user) return res.status(404).json({ message: 'Vendor not found' });
    
    const priceList = await PriceList.findOne({ vendor: user._id });
    if (!priceList) return res.status(404).json({ message: 'Price list not found' });
    res.json(priceList);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updatePriceList = async (req: AuthRequest, res: Response) => {
  const { categories } = req.body;
  const vendorId = req.user?._id;

  try {
    let priceList = await PriceList.findOne({ vendor: vendorId });
    if (priceList) {
      priceList.categories = categories;
      await priceList.save();
    } else {
      priceList = await PriceList.create({ vendor: vendorId, categories });
    }

    // Audit Log for Price Change
    await logAuditAction(
      req.user?._id?.toString() as string, 
      'PRICE_LIST_UPDATE', 
      'PriceList', 
      priceList._id?.toString() as string, 
      { categories }
    );

    res.json(priceList);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const toggleStoreStatus = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user?._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.isOpen = !user.isOpen;
    await user.save();

    await logAuditAction(
      req.user?._id?.toString() as string,
      'TOGGLE_STORE_STATUS',
      'User',
      user._id?.toString() as string,
      { isOpen: user.isOpen }
    );

    res.json({ isOpen: user.isOpen });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Report Rain: Lock shop specifically due to rain
export const toggleRainLock = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user?._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.isOpen = !user.isOpen; // Rain toggles open status
    await user.save();

    await logAuditAction(
      req.user?._id?.toString() as string,
      'REPORT_RAIN_LOCK',
      'User',
      user._id?.toString() as string,
      { isOpen: user.isOpen, reason: 'RAIN' }
    );

    res.json({ isOpen: user.isOpen, message: user.isOpen ? 'Shop Reopened' : 'Shop Closed due to Rain' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
