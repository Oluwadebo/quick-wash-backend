import { Request, Response } from 'express';
import PriceList from '../models/PriceList';
import User, { UserRole } from '../models/User';
import { AuthRequest } from '../middleware/auth';

export const getVendors = async (req: Request, res: Response) => {
  try {
    const vendors = await User.find({ role: UserRole.VENDOR, isOpen: true });
    res.json(vendors);
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
    res.json(priceList);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const toggleStoreStatus = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user?._id);
    if (user) {
      user.isOpen = !user.isOpen;
      await user.save();
      res.json({ isOpen: user.isOpen });
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
