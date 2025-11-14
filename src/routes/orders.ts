import { Router } from "express";
import { body, param } from "express-validator";
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

// ------------------ Create Order ------------------
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

// ------------------ Confirm Order ------------------
router.post(
  "/:orderId/confirm",
  [
    param("orderId").isUUID().withMessage("Invalid order ID format"),
    body("paymentIntentId")
      .notEmpty()
      .withMessage("Payment intent ID is required"),
    body("paymentMethodId").optional().isString(),
    handleValidationErrors,
  ],
  confirmOrder
);

// ------------------ Get User Orders ------------------
router.get("/", getUserOrders);

// ------------------ Update Order Status (Admin) ------------------
router.put(
  "/:id/status",
  [
    authorize("admin"),
    param("id").isUUID().withMessage("Invalid order ID format"),
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

// ------------------ Refund Payment ------------------
router.post(
  "/:orderId/refund",
  [
    authorize("admin"),
    param("orderId").isUUID().withMessage("Invalid order ID format"),
    body("amount")
      .optional()
      .isFloat({ min: 0.01 })
      .withMessage("Amount must be positive"),
    handleValidationErrors,
  ],
  refundPayment
);

// ------------------ Get Payment Details ------------------
router.get(
  "/:orderId/payment-details",
  [
    param("orderId").isUUID().withMessage("Invalid order ID format"),
    handleValidationErrors,
  ],
  getPaymentDetails
);

// ------------------ Stripe Webhook ------------------
router.post("/webhook", handlePaymentWebhook);

export default router;
