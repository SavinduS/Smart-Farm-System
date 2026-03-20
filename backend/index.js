// index.js  (ESM)

import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import morgan from "morgan";
// ok to keep, even if unused

// --- DB & Error Middleware ---
import { connectDB } from "./config/db.js";
import { notFound, errorHandler } from "./middlewares/error.js";
import { auth } from "./middlewares/auth.js";
import { requireRole } from "./middlewares/auth.js";

// --- Controllers ---
import { stripeWebhookHandler } from "./controllers/order.controller.js";

// --- Routes (ESM imports; .js extensions required) ---
import productRoutes from "./routes/product.routes.js";
import adminRoutes from "./routes/admin.routes.js";

import cowRoutes from "./routes/cow.routes.js";
import milkRoutes from "./routes/milk.routes.js";
import healthRoutes from "./routes/health.routes.js";
import breedingRoutes from "./routes/breeding.routes.js";

import staffOwnerRoutes from "./routes/staffOwner.routes.js";
import employeeRoutes from "./routes/employee.routes.js";
import authRoutes from "./routes/auth.routes.js";
import attendanceRoutes from "./routes/attendance.routes.js";

import leaveRequestRoutes from "./routes/leaveRequest.routes.js";
import taskRoutes from "./routes/task.routes.js";
import transactionRoutes from "./routes/transaction.routes.js";
import orderRoutes from "./routes/order.routes.js";
import discountRoutes from "./routes/discount.routes.js";

import performanceRoutes from "./routes/performance.routes.js";

import cropRoutes from "./routes/crop.routes.js";
import fieldRoutes from "./routes/field.routes.js";
import inputRoutes from "./routes/input.routes.js";
import planRoutes from "./routes/plan.routes.js";
import applicationRoutes from "./routes/application.routes.js";
import payrollSettingsRoutes from "./routes/payrollSettings.routes.js";
import payrollRoutes from "./routes/payroll.routes.js";
import auditRoutes from "./routes/audit.routes.js";

import reportRoutes from "./routes/report.routes.js";

import chatRoutes from "./routes/chat.routes.js";
import contactRoutes from "./routes/contact.routes.js";

import path from "path";
import { fileURLToPath } from "url";
// --- File Uploads (static serving) ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Initialize App ---
const app = express();

// serve uploaded images (e.g. /uploads/cows/abc.jpg)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// --- DB ---
connectDB().catch((err) => {
  console.error("❌ Failed to connect to MongoDB:", err.message);
  process.exit(1);
});

// --- CORS / Logging ---
const allowedOrigins = [
  process.env.CLIENT_URL,
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:5000",
].filter(Boolean);

const corsOptions = {
  origin(origin, cb) {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    // ❗ Explicitly reject unknown origins (more secure)
    return cb(new Error("Not allowed by CORS"));
  },
  credentials: true,
};

// Apply CORS globally except for webhook endpoints
app.use((req, res, next) => {
  const webhookPaths = [
    "/api/stripe/webhook",
    "/api/orders/webhook",
    "/api/payment/webhook",
  ];
  if (webhookPaths.includes(req.path)) return next();
  return cors(corsOptions)(req, res, next);
});

app.use(morgan("dev")); // HTTP request logger

/**
 * ❗ Stripe needs the raw body for signature verification.
 * Register raw parsers BEFORE express.json().
 * We support BOTH paths:
 *   - /api/orders/webhook  (kept for compatibility)
 *   - /api/stripe/webhook  (matches Stripe CLI --forward-to)
 */

app.use("/api/orders/webhook", express.raw({ type: "application/json" }));
app.use("/api/stripe/webhook", express.raw({ type: "application/json" }));
app.use("/api/payment/webhook", express.raw({ type: "application/json" }));

// Attach handlers for both webhook paths
app.post("/api/orders/webhook", stripeWebhookHandler);
app.post("/api/stripe/webhook", stripeWebhookHandler);
app.post("/api/payment/webhook", stripeWebhookHandler);

// --- Body Parsers (after raw webhook parsers) ---
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));

// --- API Routes ---
app.use("/api/auth", authRoutes);

app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/reports", auth, requireRole("Admin", "Employee","Customer"), reportRoutes);

app.use("/api/admin", auth, requireRole("Admin", "Employee"), adminRoutes);

app.use("/api/cows", auth, requireRole("Admin", "Employee"), cowRoutes);
app.use("/api/milk", auth, requireRole("Admin", "Employee"), milkRoutes);
app.use("/api/health", auth, requireRole("Admin", "Employee"), healthRoutes);
app.use(
  "/api/breeding",
  auth,
  requireRole("Admin", "Employee"),
  breedingRoutes
);

app.use("/api/discounts", discountRoutes);

app.use("/api/admin/users", auth, requireRole("Admin"), staffOwnerRoutes); // cleaner
app.use(
  "/api/employees",
  auth,
  requireRole("Employee", "Admin"),
  employeeRoutes
);

app.use(
  "/api/attendance",
  auth,
  requireRole("Admin", "Employee"),
  attendanceRoutes
);
app.use(
  "/api/leave-requests",
  auth,
  requireRole("Admin", "Employee"),
  leaveRequestRoutes
);
app.use("/api/tasks", auth, requireRole("Admin", "Employee"), taskRoutes);

// Health check

app.use("/api/performance", performanceRoutes);
app.use("/employees", employeeRoutes);

app.use("/api/transactions", auth, requireRole("Admin"), transactionRoutes);
app.use("/api/payroll", auth, requireRole("Admin"), payrollSettingsRoutes);
app.use("/api/payrolls", auth, requireRole("Admin"), payrollRoutes);
app.use("/api/payrolls", auth, requireRole("Admin"), payrollRoutes);
app.use("/api/audit", auth, requireRole("Admin"), auditRoutes);

// Smart farm modules
app.use("/api/crops", auth, requireRole("Admin", "Employee"), cropRoutes);
app.use("/api/fields", auth, requireRole("Admin", "Employee"), fieldRoutes);
app.use("/api/inputs", auth, requireRole("Admin", "Employee"), inputRoutes);
app.use("/api/plans", auth, requireRole("Admin", "Employee"), planRoutes);
app.use(
  "/api/applications",
  auth,
  requireRole("Admin", "Employee"),
  applicationRoutes
);

// ✅ Chatbot API
app.use("/api/chat", chatRoutes);

app.use("/api/contact", contactRoutes);

// --- Health Check ---
app.get("/", (_req, res) =>
  res.json({ ok: true, message: "API is running successfully." })
);

// --- Errors (must be last) ---
app.use(notFound);
app.use(errorHandler);

// --- Start Server ---
const PORT = Number(process.env.PORT) || 5001;
app.listen(PORT, () => console.log(`✅ API running on port :${PORT}`));
