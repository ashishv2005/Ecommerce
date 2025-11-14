import { DataTypes, Model, Optional, Sequelize } from "sequelize";

export interface OrderItemAttributes {
  id: string;
  orderId: string;
  productId: string;
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
  public id!: string;
  public orderId!: string;
  public productId!: string;
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
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        orderId: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: "orders",
            key: "id",
          },
          onDelete: "CASCADE",
        },
        productId: {
          type: DataTypes.UUID,
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
          type: DataTypes.UUID,
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
