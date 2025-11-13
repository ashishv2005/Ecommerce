import { Router } from "express";
import { body } from "express-validator";
import {
  getDashboardStats,
  getSalesReport,
  getProductPerformance,
  getUserPurchaseReport,
  getLowPerformingProducts,
  getStockAlerts,
  updateUserDiscount,
} from "../controllers/adminController";
import { authenticate, authorize } from "../middleware/auth";
import { handleValidationErrors } from "../middleware/validation";

const router = Router();

router.use(authenticate, authorize("admin"));

router.get("/dashboard", getDashboardStats);
router.get("/sales-report", getSalesReport);
router.get("/product-performance", getProductPerformance);
router.get("/user-purchases", getUserPurchaseReport);
router.get("/low-performing-products", getLowPerformingProducts);
router.get("/stock-alerts", getStockAlerts);

router.put(
  "/users/:userId/discount",
  [
    body("discountEligible")
      .isBoolean()
      .withMessage("Discount eligible must be a boolean"),
    handleValidationErrors,
  ],
  updateUserDiscount
);

export default router;
