import { Request, Response } from "express";
import { SocketService } from "../services/socketService";
import { AuthRequest } from "../middleware/auth";

export const getUserChats = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.id;
    const chats = await SocketService.getUserChats(userId);
    res.json(chats);
  } catch (error: any) {
    console.error("Get user chats error:", error);
    res.status(500).json({ message: error.message });
  }
};

export const getAllChats = async (req: AuthRequest, res: Response) => {
  try {
    const chats = await SocketService.getAllChats();
    res.json(chats);
  } catch (error: any) {
    console.error("Get all chats error:", error);
    res.status(500).json({ message: error.message });
  }
};

export const sendMessage = async (req: AuthRequest, res: Response) => {
  try {
    const { userId, message } = req.body;
    const sender = req.user.role === "admin" ? "admin" : "user";
    const adminId = req.user.role === "admin" ? req.user.id : undefined;

    // This will be handled by socket service in real-time
    // For REST API, we'll create the message directly
    const { Chat } = await import("../models/Chat");

    const chat = await Chat.create({
      userId,
      adminId,
      message,
      sender,
      read: false,
    });

    res.status(201).json(chat);
  } catch (error: any) {
    console.error("Send message error:", error);
    res.status(500).json({ message: error.message });
  }
};
