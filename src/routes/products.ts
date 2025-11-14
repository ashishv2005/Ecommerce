import { Router } from "express";
import { body, param } from "express-validator";
import {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../controllers/productController";
import { authenticate, authorize } from "../middleware/auth";
import { handleValidationErrors } from "../middleware/validation";

const router = Router();

// ------------------ Public Routes ------------------
router.get("/", getProducts);

router.get(
  "/:id",
  [
    param("id").isUUID().withMessage("Invalid product ID format"),
    handleValidationErrors,
  ],
  getProduct
);

// ------------------ Admin Create Product ------------------
router.post(
  "/",
  [
    authenticate,
    authorize("admin"),
    body("name").notEmpty().withMessage("Product name is required"),
    body("category").notEmpty().withMessage("Category is required"),
    body("currentStock")
      .isInt({ min: 0 })
      .withMessage("Stock must be non-negative"),
    body("lowStockThreshold")
      .isInt({ min: 1 })
      .withMessage("Low stock threshold must be at least 1"),
    handleValidationErrors,
  ],
  createProduct
);

// ------------------ Admin Update Product ------------------
router.put(
  "/:id",
  [
    authenticate,
    authorize("admin"),
    param("id").isUUID().withMessage("Invalid product ID format"),
    handleValidationErrors,
  ],
  updateProduct
);

// ------------------ Admin Delete Product ------------------
router.delete(
  "/:id",
  [
    authenticate,
    authorize("admin"),
    param("id").isUUID().withMessage("Invalid product ID format"),
    handleValidationErrors,
  ],
  deleteProduct
);

export default router;
