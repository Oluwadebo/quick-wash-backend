import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import User, { IUser } from "../models/User";

export interface AuthRequest extends Request {
  user?: IUser;
}

export const protect = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  let token;

  // 1. Check for token in headers
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  // 2. Check if token exists
  if (!token) {
    return res.status(401).json({ message: "Not authorized, no token" });
  }

  try {
    // 3. Verify token
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET || "secret");

    // 4. Get user from database (excluding password)
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    // 5. Attach user to request object and proceed
    req.user = user as IUser;
    next();
  } catch (error) {
    res.status(401).json({ message: "Not authorized, token failed" });
  }
};
