import { DataTypes, Model, Optional, Sequelize } from "sequelize";

export interface ProductAttributes {
  id: string;
  name: string;
  description: string;
  category: string;
  currentStock: number;
  totalSold: number;
  isActive: boolean;
  lowStockThreshold: number;
  createdAt?: Date;
  updatedAt?: Date;
  stockStatus?: string;
}

export interface ProductCreationAttributes
  extends Optional<
    ProductAttributes,
    "id" | "currentStock" | "totalSold" | "isActive" | "lowStockThreshold"
  > {}

export class Product
  extends Model<ProductAttributes, ProductCreationAttributes>
  implements ProductAttributes
{
  public id!: string;
  public name!: string;
  public description!: string;
  public category!: string;
  public currentStock!: number;
  public totalSold!: number;
  public isActive!: boolean;
  public lowStockThreshold!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public static initialize(sequelize: Sequelize): void {
    Product.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        name: {
          type: DataTypes.STRING(255),
          allowNull: false,
          validate: {
            notEmpty: true,
            len: [2, 255],
          },
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true,
          validate: {
            len: [0, 2000],
          },
        },
        category: {
          type: DataTypes.STRING(128),
          allowNull: false,
          validate: {
            notEmpty: true,
          },
        },
        currentStock: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
          validate: {
            min: 0,
          },
        },
        totalSold: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
          validate: {
            min: 0,
          },
        },
        isActive: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        lowStockThreshold: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 10,
          validate: {
            min: 1,
          },
        },
      },
      {
        tableName: "products",
        sequelize,
        hooks: {
          beforeValidate: (product: Product) => {
            if (product.currentStock < 0) {
              throw new Error("Stock cannot be negative");
            }
          },
        },
      }
    );
  }

  public getStockStatus(): "out_of_stock" | "low_stock" | "in_stock" {
    if (this.currentStock === 0) {
      return "out_of_stock";
    } else if (this.currentStock <= this.lowStockThreshold) {
      return "low_stock";
    } else {
      return "in_stock";
    }
  }

  public toJSON(): any {
    const values = { ...this.get() };
    values.stockStatus = this.getStockStatus();
    return values;
  }
}
