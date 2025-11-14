import { DataTypes, Model, Optional, Sequelize } from "sequelize";

export type SenderType = "user" | "admin";

export interface ChatAttributes {
  id: string;
  userId: string;
  adminId?: string;
  message: string;
  sender: SenderType;
  read: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ChatCreationAttributes
  extends Optional<ChatAttributes, "id" | "adminId" | "read"> {}

export class Chat
  extends Model<ChatAttributes, ChatCreationAttributes>
  implements ChatAttributes
{
  public id!: string;
  public userId!: string;
  public adminId?: string;
  public message!: string;
  public sender!: SenderType;
  public read!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public static initialize(sequelize: Sequelize): void {
    Chat.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        userId: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: "users",
            key: "id",
          },
          onDelete: "CASCADE",
        },
        adminId: {
          type: DataTypes.UUID,
          allowNull: true,
          references: {
            model: "users",
            key: "id",
          },
        },
        message: {
          type: DataTypes.TEXT,
          allowNull: false,
          validate: {
            notEmpty: true,
            len: [1, 2000],
          },
        },
        sender: {
          type: DataTypes.ENUM("user", "admin"),
          allowNull: false,
        },
        read: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
      },
      {
        tableName: "chats",
        sequelize,
        indexes: [
          {
            fields: ["userId"],
          },
          {
            fields: ["adminId"],
          },
          {
            fields: ["sender"],
          },
          {
            fields: ["read"],
          },
          {
            fields: ["createdAt"],
          },
        ],
        hooks: {
          beforeCreate: (chat: Chat) => {
            if (chat.sender === "admin" && !chat.adminId) {
              throw new Error("Admin ID is required when sender is admin");
            }
          },
        },
      }
    );
  }

  public async markAsRead(): Promise<void> {
    this.read = true;
    await this.save();
  }

  public canBeEdited(): boolean {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return this.createdAt > fiveMinutesAgo;
  }
}
