import { Router } from "express";
import { body } from "express-validator";
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

router.get("/", getProducts);
router.get("/:id", getProduct);

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

router.put(
  "/:id",
  [authenticate, authorize("admin"), handleValidationErrors],
  updateProduct
);

router.delete("/:id", [authenticate, authorize("admin")], deleteProduct);

export default router;
