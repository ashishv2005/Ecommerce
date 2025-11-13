import { Router } from "express";
import { body } from "express-validator";
import {
  getUserChats,
  getAllChats,
  sendMessage,
} from "../controllers/chatController";
import { authenticate, authorize } from "../middleware/auth";
import { handleValidationErrors } from "../middleware/validation";

const router = Router();

router.use(authenticate);

router.get("/", getUserChats);
router.post(
  "/",
  [
    body("userId").isInt({ min: 1 }).withMessage("Valid user ID is required"),
    body("message").notEmpty().withMessage("Message is required"),
    handleValidationErrors,
  ],
  sendMessage
);

// Admin only routes
router.get("/admin/all", authorize("admin"), getAllChats);

export default router;
