import { Request, Response } from "express";
import { SocketService } from "../services/socketService";
import { AuthRequest } from "../middleware/auth";
import { validate as isUUID } from "uuid";

// ------------------ Get User Chats ------------------
export const getUserChats = async (req: AuthRequest, res: Response) => {
  try {
    const userId: string = req.user.id;

    if (!isUUID(userId)) {
      return res.status(400).json({ message: "Invalid user ID format" });
    }

    const chats = await SocketService.getUserChats(userId);
    return res.json(chats);
  } catch (error: any) {
    console.error("Get user chats error:", error);
    return res.status(500).json({ message: error.message });
  }
};

// ------------------ Admin: Get All Chats ------------------
export const getAllChats = async (req: AuthRequest, res: Response) => {
  try {
    const chats = await SocketService.getAllChats();
    return res.json(chats);
  } catch (error: any) {
    console.error("Get all chats error:", error);
    return res.status(500).json({ message: error.message });
  }
};

// ------------------ Send Message ------------------
export const sendMessage = async (req: AuthRequest, res: Response) => {
  try {
    const { userId, message } = req.body;

    if (!isUUID(userId)) {
      return res.status(400).json({ message: "Invalid user ID format" });
    }

    const sender = req.user.role === "admin" ? "admin" : "user";
    const adminId = req.user.role === "admin" ? req.user.id : null;

    if (adminId && !isUUID(adminId)) {
      return res.status(400).json({ message: "Invalid admin ID format" });
    }

    const { Chat } = await import("../models/Chat");

    const chat = await Chat.create({
      userId,
      adminId,
      message,
      sender,
      read: false,
    });

    return res.status(201).json(chat);
  } catch (error: any) {
    console.error("Send message error:", error);
    return res.status(500).json({ message: error.message });
  }
};
