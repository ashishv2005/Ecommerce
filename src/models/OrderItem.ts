import { DataTypes, Model, Optional, Sequelize } from "sequelize";

export interface OrderItemAttributes {
  id: number;
  orderId: number;
  productId: number;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  batchId: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface OrderItemCreationAttributes
  extends Optional<OrderItemAttributes, "id"> {}

export class OrderItem
  extends Model<OrderItemAttributes, OrderItemCreationAttributes>
  implements OrderItemAttributes
{
  public id!: number;
  public orderId!: number;
  public productId!: number;
  public quantity!: number;
  public unitPrice!: number;
  public totalPrice!: number;
  public batchId!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public static initialize(sequelize: Sequelize): void {
    OrderItem.init(
      {
        id: {
          type: DataTypes.INTEGER.UNSIGNED,
          autoIncrement: true,
          primaryKey: true,
        },
        orderId: {
          type: DataTypes.INTEGER.UNSIGNED,
          allowNull: false,
          references: {
            model: "orders",
            key: "id",
          },
          onDelete: "CASCADE",
        },
        productId: {
          type: DataTypes.INTEGER.UNSIGNED,
          allowNull: false,
          references: {
            model: "products",
            key: "id",
          },
        },
        quantity: {
          type: DataTypes.INTEGER,
          allowNull: false,
          validate: {
            min: 1,
          },
        },
        unitPrice: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          validate: {
            min: 0.01,
          },
        },
        totalPrice: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          validate: {
            min: 0.01,
          },
        },
        batchId: {
          type: DataTypes.INTEGER.UNSIGNED,
          allowNull: false,
          references: {
            model: "product_pricing",
            key: "id",
          },
        },
      },
      {
        tableName: "order_items",
        sequelize,
        hooks: {
          beforeValidate: (orderItem: OrderItem) => {
            if (orderItem.unitPrice && orderItem.quantity) {
              orderItem.totalPrice = orderItem.unitPrice * orderItem.quantity;
            }
          },
        },
        indexes: [
          {
            fields: ["orderId"],
          },
          {
            fields: ["productId"],
          },
          {
            fields: ["batchId"],
          },
        ],
      }
    );
  }

  public async calculateProfit(): Promise<number> {
    const { ProductPricing } = await import("./ProductPricing");
    const batch = await ProductPricing.findByPk(this.batchId);

    if (batch) {
      return (this.unitPrice - batch.costPrice) * this.quantity;
    }

    return 0;
  }
}
