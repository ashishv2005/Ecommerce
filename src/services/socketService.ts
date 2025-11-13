import { Server } from "socket.io";
import { Chat, User } from "../models";

export class SocketService {
  private io: Server;

  constructor(io: Server) {
    this.io = io;
    this.setupSocketEvents();
  }

  private setupSocketEvents() {
    this.io.on("connection", (socket) => {
      console.log("User connected:", socket.id);

      socket.on("join_user", (userId: string) => {
        socket.join(`user_${userId}`);
      });

      socket.on("join_admin", () => {
        socket.join("admin_room");
      });

      socket.on(
        "send_message",
        async (data: {
          userId: number;
          message: string;
          sender: "user" | "admin";
          adminId?: number;
        }) => {
          try {
            const chat = await Chat.create({
              userId: data.userId,
              adminId: data.adminId,
              message: data.message,
              sender: data.sender,
              read: false,
            });

            const chatWithUser = await Chat.findByPk(chat.id, {
              include: [
                {
                  model: User,
                  as: "user",
                  attributes: ["id", "name"],
                },
              ],
            });

            this.io.to("admin_room").emit("new_message", chatWithUser);
            this.io.to(`user_${data.userId}`).emit("new_message", chatWithUser);
          } catch (error) {
            console.error("Send message error:", error);
            socket.emit("error", { message: "Failed to send message" });
          }
        }
      );

      socket.on(
        "mark_read",
        async (data: { userId: number; sender: "user" | "admin" }) => {
          await Chat.update(
            { read: true },
            {
              where: {
                userId: data.userId,
                sender: data.sender === "user" ? "admin" : "user",
                read: false,
              },
            }
          );
        }
      );

      socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
      });
    });
  }

  static async getUserChats(userId: number) {
    return await Chat.findAll({
      where: { userId },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "name"],
        },
      ],
      order: [["createdAt", "ASC"]],
    });
  }

  static async getAllChats() {
    return await Chat.findAll({
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "email"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });
  }
}
