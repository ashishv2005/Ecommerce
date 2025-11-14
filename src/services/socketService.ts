import { Server } from "socket.io";
import { Chat, User } from "../models";
import { validate as isUUID } from "uuid";

export class SocketService {
  private io: Server;

  constructor(io: Server) {
    this.io = io;
    this.setupSocketEvents();
  }

  private setupSocketEvents() {
    this.io.on("connection", (socket) => {
      console.log("User connected:", socket.id);

      // JOIN USER ROOM
      socket.on("join_user", (userId: string) => {
        if (!isUUID(userId)) return;
        socket.join(`user_${userId}`);
      });

      // JOIN ADMIN ROOM
      socket.on("join_admin", () => {
        socket.join("admin_room");
      });

      // SEND MESSAGE
      socket.on(
        "send_message",
        async (data: {
          userId: string; // UUID
          message: string;
          sender: "user" | "admin";
          adminId?: string; // UUID
        }) => {
          try {
            if (!isUUID(data.userId)) {
              socket.emit("error", { message: "Invalid user ID format" });
              return;
            }

            if (data.adminId && !isUUID(data.adminId)) {
              socket.emit("error", { message: "Invalid admin ID format" });
              return;
            }

            const chat = await Chat.create({
              userId: data.userId,
              adminId: data.adminId || undefined,
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

            // Send to admin room
            this.io.to("admin_room").emit("new_message", chatWithUser);

            // Send to user room
            this.io.to(`user_${data.userId}`).emit("new_message", chatWithUser);
          } catch (error) {
            console.error("Send message error:", error);
            socket.emit("error", { message: "Failed to send message" });
          }
        }
      );

      // MARK MESSAGE AS READ
      socket.on(
        "mark_read",
        async (data: { userId: string; sender: "user" | "admin" }) => {
          if (!isUUID(data.userId)) return;

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

  // ------------------ GET USER CHATS ------------------
  static async getUserChats(userId: string) {
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

  // ------------------ GET ALL CHATS ------------------
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
