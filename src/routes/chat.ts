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

// ------------------ Get User Chats ------------------
router.get("/", getUserChats);

// ------------------ Send Message ------------------
router.post(
  "/",
  [
    body("userId").isUUID().withMessage("Valid user UUID is required"),
    body("message").notEmpty().withMessage("Message is required"),
    handleValidationErrors,
  ],
  sendMessage
);

// ------------------ Admin: Get All Chats ------------------
router.get("/admin/all", authorize("admin"), getAllChats);

export default router;
