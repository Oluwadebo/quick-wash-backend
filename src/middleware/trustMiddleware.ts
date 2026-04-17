import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

export const checkTrustLevel = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) return res.status(401).json({ message: 'User not authenticated' });

  const points = req.user.trustPoints;

  // Access Tiers:
  // Points < 30: Account Suspended (Login blocked or strictly restricted)
  if (points < 30) {
    return res.status(403).json({ 
      message: 'Account Suspended due to low Trust Points (< 30). Please contact support.',
      trustPoints: points
    });
  }

  // Points < 60: Account Restricted (Limited features)
  // We can attach a flag to the request so controllers can restrict specific actions
  if (points < 60) {
    (req as any).isRestricted = true;
    // For some routes, we might want to block entirely
    const restrictedRoutes = ['/api/orders/create', '/api/wallet/withdraw'];
    if (restrictedRoutes.some(route => req.originalUrl.includes(route))) {
      return res.status(403).json({ 
        message: 'Action Restricted due to low Trust Points (< 60). Maintain perfect activity to recover.',
        trustPoints: points
      });
    }
  }

  next();
};
