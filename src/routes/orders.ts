import { Router } from "express";
import { body } from "express-validator";
import {
  createOrder,
  confirmOrder,
  getUserOrders,
  updateOrderStatus,
  handlePaymentWebhook,
  refundPayment,
  getPaymentDetails,
} from "../controllers/orderController";
import { authenticate, authorize } from "../middleware/auth";
import { handleValidationErrors } from "../middleware/validation";

const router = Router();

router.use(authenticate);

router.post(
  "/",
  [
    body("shippingAddress").optional().isString(),
    body("billingAddress").optional().isString(),
    body("paymentMethod")
      .optional()
      .isIn(["card", "upi"])
      .withMessage("Invalid payment method"),
    handleValidationErrors,
  ],
  createOrder
);

router.post(
  "/:orderId/confirm",
  [
    body("paymentIntentId")
      .notEmpty()
      .withMessage("Payment intent ID is required"),
    body("paymentMethodId").optional().isString(),
    handleValidationErrors,
  ],
  confirmOrder
);

router.get("/", getUserOrders);

router.put(
  "/:id/status",
  [
    authorize("admin"),
    body("status")
      .isIn([
        "pending",
        "confirmed",
        "shipped",
        "delivered",
        "cancelled",
        "refunded",
      ])
      .withMessage("Invalid status"),
    handleValidationErrors,
  ],
  updateOrderStatus
);

// Payment related routes
router.post(
  "/:orderId/refund",
  [
    authorize("admin"),
    body("amount")
      .optional()
      .isFloat({ min: 0.01 })
      .withMessage("Amount must be positive"),
    handleValidationErrors,
  ],
  refundPayment
);

router.get("/:orderId/payment-details", getPaymentDetails);

// Webhook route (no authentication required for Stripe webhooks)
router.post("/webhook", handlePaymentWebhook);

export default router;
