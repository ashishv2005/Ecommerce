import { Router } from "express";
import { body } from "express-validator";
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

router.post(
  "/",
  [
    body("productId")
      .isInt({ min: 1 })
      .withMessage("Valid product ID is required"),
    body("quantity")
      .isInt({ min: 1 })
      .withMessage("Quantity must be at least 1"),
    handleValidationErrors,
  ],
  addToCart
);

router.get("/", getCart);
router.put(
  "/:id",
  [
    body("quantity")
      .isInt({ min: 1 })
      .withMessage("Quantity must be at least 1"),
    handleValidationErrors,
  ],
  updateCartItem
);
router.delete("/:id", removeFromCart);

// Admin only routes for abandoned carts
router.get("/admin/abandoned", authorize("admin"), getAbandonedCarts);
router.post(
  "/admin/send-notifications",
  authorize("admin"),
  sendAbandonedCartNotifications
);

export default router;
