import { DataTypes, Model, Optional, Sequelize } from "sequelize";

export interface CartAttributes {
  id: string;
  userId: string;
  productId: string;
  quantity: number;
  addedAt: Date;
  expiresAt: Date;
  notified: boolean;
  abandoned: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CartCreationAttributes
  extends Optional<
    CartAttributes,
    "id" | "notified" | "addedAt" | "expiresAt" | "abandoned"
  > {}

export class Cart
  extends Model<CartAttributes, CartCreationAttributes>
  implements CartAttributes
{
  public id!: string;
  public userId!: string;
  public productId!: string;
  public quantity!: number;
  public addedAt!: Date;
  public expiresAt!: Date;
  public notified!: boolean;
  public abandoned!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public static initialize(sequelize: Sequelize): void {
    Cart.init(
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
        productId: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: "products",
            key: "id",
          },
          onDelete: "CASCADE",
        },
        quantity: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 1,
          validate: {
            min: 1,
          },
        },
        addedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        expiresAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: () => new Date(Date.now() + 2 * 60 * 1000),
        },
        notified: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        abandoned: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
      },
      {
        tableName: "carts",
        sequelize,
        indexes: [
          {
            fields: ["userId"],
          },
          {
            fields: ["productId"],
          },
          {
            fields: ["expiresAt"],
          },
          {
            fields: ["notified"],
          },
          {
            fields: ["abandoned"],
          },
          {
            unique: true,
            fields: ["userId", "productId"],
          },
        ],
        hooks: {
          beforeCreate: (cart: Cart) => {
            if (!cart.expiresAt) {
              cart.expiresAt = new Date(Date.now() + 2 * 60 * 1000);
            }
          },
        },
      }
    );
  }

  public isAbandoned(): boolean {
    return this.abandoned || (new Date() > this.expiresAt && !this.notified);
  }

  public isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  public async markAsAbandoned(): Promise<void> {
    this.abandoned = true;
    this.notified = true;
    await this.save();
  }
}
