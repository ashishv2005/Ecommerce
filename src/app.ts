import express from "express";
import cors from "cors";
import helmet from "helmet";
import { createServer } from "http";
import { Server } from "socket.io";
import { config } from "./config/config";
import { sequelize } from "./models";
import { connectRedis } from "./utils/redis";
import { SocketService } from "./services/socketService";
import { startCronJobs } from "./utils/cronJobs";
import dotenv from "dotenv";
dotenv.config();

// Import routes
import authRoutes from "./routes/auth";
import productRoutes from "./routes/products";
import cartRoutes from "./routes/cart";
import orderRoutes from "./routes/orders";
import adminRoutes from "./routes/admin";
import chatRoutes from "./routes/chat";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/chat", chatRoutes);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// Initialize socket service
new SocketService(io);

// Error handling middleware
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error("Error:", err.stack);

    if (err.name === "ValidationError") {
      return res.status(400).json({
        message: "Validation Error",
        errors: err.errors,
      });
    }

    if (err.name === "SequelizeUniqueConstraintError") {
      return res.status(400).json({
        message: "Duplicate entry",
        field: err.errors[0]?.path,
      });
    }

    return res.status(500).json({
      message: "Internal server error",
      ...(process.env.NODE_ENV === "development" && { error: err.message }),
    });
  }
);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Start server function
const startServer = async () => {
  try {
    // Connect to database
    await sequelize.authenticate();
    console.log("✅ Database connected successfully");

    // Sync database
    await sequelize.sync({ force: false });
    console.log("✅ Database synced");

    // Connect to Redis
    await connectRedis();
    console.log("✅ Redis connected");

    // Start server
    httpServer.listen(config.port, () => {
      console.log(`🚀 Server running on port ${config.port}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(`🔗 Health check: http://localhost:${config.port}/health`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down gracefully");
  await sequelize.close();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("SIGINT received, shutting down gracefully");
  await sequelize.close();
  process.exit(0);
});

startServer();
startCronJobs();
export { app, io };
