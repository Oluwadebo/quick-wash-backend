import express, { Request, Response } from "express";
import mongoose from "mongoose";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import { createServer } from "http";
import rateLimit from "express-rate-limit";
import dns from "dns";
import { ENV } from "./config/env"; //

// Routes (Ensure these files exist in your routes folder!)
import authRoutes from "./routes/authRoutes";
import orderRoutes from "./routes/orderRoutes";
import vendorRoutes from "./routes/vendorRoutes";
import riderRoutes from "./routes/riderRoutes";
import walletRoutes from "./routes/walletRoutes";
import adminRoutes from "./routes/adminRoutes";
import paymentRoutes from "./routes/paymentRoutes";

import { initCronJobs } from "./utils/cron";
import { errorHandler } from "./middleware/errorHandler";

dotenv.config();

// DNS fix for MongoDB connectivity in specific environments
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);
dns.setDefaultResultOrder("ipv4first");

const app = express();
const httpServer = createServer(app);

// Middleware
// app.use(helmet());
// app.use(cors());
app.use(morgan("dev"));
// app.use(express.json());

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        // Added images.unsplash.com and general http: for flexibility
        imgSrc: [
          "'self'",
          "data:",
          "https:",
          "http:",
          // "res.cloudinary.com",
          // "images.unsplash.com",
        ],
      },
    },
    // Add this to prevent cross-origin loading issues
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);
app.use(
  cors({
    origin: [
      "http://localhost:3000", // Local dev
      process.env.FRONTEND_URL, // Vercel URL from env
    ].filter(Boolean) as string[],
    methods: ["GET", "POST", "DELETE", "PATCH"],
    credentials: true,
  }),
);
app.use(express.json());
// Security: Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests, please try again later.",
});
app.use("/api/", limiter);

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/vendors", vendorRoutes);
app.use("/api/riders", riderRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/payments", paymentRoutes);

// Base Check
app.get("/", (req: Request, res: Response) => {
  res.json({ message: "Quick-Wash API is running" });
});

// Use Error Handler LAST
app.use(errorHandler);

// Database Logic
const connectDB = async (retries = 3) => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("❌ MONGODB_URI is missing in .env");
    process.exit(1);
  }

  while (retries) {
    try {
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 30000,
        family: 4,
      });
      console.log("✅ MongoDB connected");
      initCronJobs(); // Start background tasks only after DB is up
      return;
    } catch (err: any) {
      console.error(`❌ DB failed (${retries} left):`, err.message);
      retries -= 1;
      if (retries === 0) process.exit(1);
      await new Promise((res) => setTimeout(res, 5000));
    }
  }
};

// Start
const PORT = process.env.PORT || 5000;
connectDB().then(() => {
  httpServer.listen(PORT, () => {
    console.log(
      `🚀 Server running on port ${PORT} [${process.env.NODE_ENV || "development"}]`,
    );
  });
});

// app.listen(PORT, () => {
//   console.log(`🚀 Server running on http://localhost:${PORT}`);
//   console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
// });

export default app;
