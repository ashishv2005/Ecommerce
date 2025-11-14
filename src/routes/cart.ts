import { Router } from "express";
import { body, param } from "express-validator";
import {
  addToCart,
  getCart,
  updateCartItem,
  removeFromCart,
  getAbandonedCarts,
  sendAbandonedCartNotifications,
} from "../controllers/cartController";
import { authenticate, authorize } from "../middleware/auth";
import { handleValidationErrors } from "../middleware/validation";

const router = Router();

router.use(authenticate);

// ------------------ Add to Cart ------------------
router.post(
  "/",
  [
    body("productId").isUUID().withMessage("Valid product UUID is required"),
    body("quantity")
      .isInt({ min: 1 })
      .withMessage("Quantity must be at least 1"),
    handleValidationErrors,
  ],
  addToCart
);

// ------------------ Get Cart ------------------
router.get("/", getCart);

// ------------------ Update Cart Item ------------------
router.put(
  "/:id",
  [
    param("id").isUUID().withMessage("Invalid cart ID format"),
    body("quantity")
      .isInt({ min: 1 })
      .withMessage("Quantity must be at least 1"),
    handleValidationErrors,
  ],
  updateCartItem
);

// ------------------ Remove Cart Item ------------------
router.delete(
  "/:id",
  [
    param("id").isUUID().withMessage("Invalid cart ID format"),
    handleValidationErrors,
  ],
  removeFromCart
);

// ------------------ Admin: Abandoned Cart ------------------
router.get("/admin/abandoned", authorize("admin"), getAbandonedCarts);

router.post(
  "/admin/send-notifications",
  authorize("admin"),
  sendAbandonedCartNotifications
);

export default router;
