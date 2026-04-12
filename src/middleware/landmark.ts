import { Request, Response, NextFunction } from 'express';
import { LANDMARKS } from '../config/landmarks';

export const validateLandmark = (req: Request, res: Response, next: NextFunction) => {
  const { landmark } = req.body;
  
  if (landmark) {
    const isValid = LANDMARKS.some((l) => l.name === landmark);
    if (!isValid) {
      return res.status(400).json({ 
        message: 'Invalid landmark. Please select a supported landmark for delivery.' 
      });
    }
  }
  
  next();
};
