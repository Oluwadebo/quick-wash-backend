import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { UserRole } from '../models/User';

export const authorize = (...roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ message: 'User not authenticated' });

    // Super Admin Level: Privileged tier for the owner
    const isSuperAdmin = req.user.email === 'ogunwedebo21@gmail.com' && req.user.role === UserRole.ADMIN;

    if (isSuperAdmin || roles.includes(req.user.role)) {
      return next();
    }

    return res.status(403).json({ 
      message: `Access denied. Role ${req.user.role} is not authorized for this action.` 
    });
  };
};
