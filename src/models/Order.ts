import { DataTypes, Model, Optional, Sequelize } from "sequelize";

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "shipped"
  | "delivered"
  | "cancelled";

export interface OrderAttributes {
  id: number;
  userId: number;
  totalAmount: number;
  discountAmount: number;
  finalAmount: number;
  status: OrderStatus;
  stripePaymentId?: string;
  shippingAddress?: string;
  billingAddress?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface OrderCreationAttributes
  extends Optional<
    OrderAttributes,
    | "id"
    | "discountAmount"
    | "status"
    | "stripePaymentId"
    | "shippingAddress"
    | "billingAddress"
  > {}

export class Order
  extends Model<OrderAttributes, OrderCreationAttributes>
  implements OrderAttributes
{
  public id!: number;
  public userId!: number;
  public totalAmount!: number;
  public discountAmount!: number;
  public finalAmount!: number;
  public status!: OrderStatus;
  public stripePaymentId?: string;
  public shippingAddress?: string;
  public billingAddress?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public static initialize(sequelize: Sequelize): void {
    Order.init(
      {
        id: {
          type: DataTypes.INTEGER.UNSIGNED,
          autoIncrement: true,
          primaryKey: true,
        },
        userId: {
          type: DataTypes.INTEGER.UNSIGNED,
          allowNull: false,
          references: {
            model: "users",
            key: "id",
          },
          onDelete: "CASCADE",
        },
        totalAmount: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          validate: {
            min: 0.01,
          },
        },
        discountAmount: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0.0,
          validate: {
            min: 0,
          },
        },
        finalAmount: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          validate: {
            min: 0.01,
          },
        },
        status: {
          type: DataTypes.ENUM(
            "pending",
            "confirmed",
            "shipped",
            "delivered",
            "cancelled"
          ),
          allowNull: false,
          defaultValue: "pending",
        },
        stripePaymentId: {
          type: DataTypes.STRING(255),
          allowNull: true,
          unique: true,
        },
        shippingAddress: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        billingAddress: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
      },
      {
        tableName: "orders",
        sequelize,
        hooks: {
          beforeValidate: (order: Order) => {
            if (order.totalAmount && order.discountAmount) {
              order.finalAmount = order.totalAmount - order.discountAmount;
            }

            if (order.finalAmount < 0) {
              throw new Error("Final amount cannot be negative");
            }
            if (order.discountAmount > order.totalAmount) {
              throw new Error("Discount cannot be greater than total amount");
            }
          },
        },
        indexes: [
          {
            fields: ["userId"],
          },
          {
            fields: ["status"],
          },
          {
            fields: ["createdAt"],
          },
        ],
      }
    );
  }

  public canBeCancelled(): boolean {
    return this.status === "pending" || this.status === "confirmed";
  }

  public getDiscountPercentage(): number {
    if (this.totalAmount === 0) return 0;
    return (this.discountAmount / this.totalAmount) * 100;
  }
}
