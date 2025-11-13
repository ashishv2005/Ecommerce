import { Router } from "express";
import { body } from "express-validator";
import {
  register,
  login,
  logout,
  getProfile,
  createAdmin,
} from "../controllers/authController";
import { authenticate, authorize } from "../middleware/auth";
import { handleValidationErrors } from "../middleware/validation";

const router = Router();

router.post(
  "/register",
  [
    body("name").notEmpty().withMessage("Name is required"),
    body("username")
      .isLength({ min: 3 })
      .withMessage("Username must be at least 3 characters")
      .isAlphanumeric()
      .withMessage("Username must be alphanumeric"),
    body("email").isEmail().withMessage("Valid email is required"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters"),
    handleValidationErrors,
  ],
  register
);

router.post(
  "/login",
  [
    body("username").notEmpty().withMessage("Username is required"),
    body("password").notEmpty().withMessage("Password is required"),
    handleValidationErrors,
  ],
  login
);

router.post("/logout", authenticate, logout);
router.get("/profile", authenticate, getProfile);

// Admin only route to create admin users
router.post(
  "/admin/create",
  [
    authenticate,
    authorize("admin"),
    body("name").notEmpty().withMessage("Name is required"),
    body("username")
      .isLength({ min: 3 })
      .withMessage("Username must be at least 3 characters"),
    body("email").isEmail().withMessage("Valid email is required"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters"),
    handleValidationErrors,
  ],
  createAdmin
);

export default router;
