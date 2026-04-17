// src/config/env.ts
import dotenv from "dotenv";
dotenv.config();

const getEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`❌ Missing environment variable: ${key}`);
  }
  return value;
};

export const ENV = {
  MONGODB_URI: getEnv("MONGODB_URI"),
  FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:3000",
  PORT: process.env.PORT || "5000",
  NODE_ENV: process.env.NODE_ENV || "development",
};
