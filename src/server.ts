import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { createServer } from "http";
import mongoose from "mongoose";
import morgan from "morgan";

// Routes
import adminRoutes from "./routes/adminRoutes";
import authRoutes from "./routes/authRoutes";
import orderRoutes from "./routes/orderRoutes";
import paymentRoutes from "./routes/paymentRoutes";
import riderRoutes from "./routes/riderRoutes";
import vendorRoutes from "./routes/vendorRoutes";
import walletRoutes from "./routes/walletRoutes";
import userRoutes from "./routes/userRoutes";

// Middleware & Utils
import { errorHandler } from "./middleware/errorHandler";
import { initCronJobs } from "./utils/cron";

// Load env vars
dotenv.config();

const app = express();
const httpServer = createServer(app);

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: "Too many requests from this IP, please try again after 15 minutes",
});
app.use("/api/", limiter);

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/vendors", vendorRoutes);
app.use("/api/riders", riderRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/payments", paymentRoutes);

// Error Handler (Must be after routes)
app.use(errorHandler);

// Health Check
app.get("/", (req, res) => {
  res.json({ message: "Quick-Wash API is running" });
});

// Database Connection
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error(
    "❌ ERROR: MONGODB_URI is not defined in environment variables.",
  );
} else {
  mongoose
    .connect(MONGODB_URI)
    .then(() => {
      console.log("✅ MongoDB Connected");
      initCronJobs(); // Starts automated order cancellation & recovery
    })
    .catch((err) => {
      console.error("❌ MongoDB Connection Error:", err.message);
    });
}

// Start Server
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

export default app;
