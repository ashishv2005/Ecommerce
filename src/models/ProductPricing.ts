import { DataTypes, Model, Optional, Sequelize } from "sequelize";

export interface ProductPricingAttributes {
  id: string;
  productId: string;
  batchStart: number;
  batchEnd?: number;
  price: number;
  costPrice: number;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ProductPricingCreationAttributes
  extends Optional<ProductPricingAttributes, "id" | "batchEnd" | "isActive"> {}

export class ProductPricing
  extends Model<ProductPricingAttributes, ProductPricingCreationAttributes>
  implements ProductPricingAttributes
{
  public id!: string;
  public productId!: string;
  public batchStart!: number;
  public batchEnd?: number;
  public price!: number;
  public costPrice!: number;
  public isActive!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public static initialize(sequelize: Sequelize): void {
    ProductPricing.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
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
        batchStart: {
          type: DataTypes.INTEGER,
          allowNull: false,
          validate: {
            min: 0,
          },
        },
        batchEnd: {
          type: DataTypes.INTEGER,
          allowNull: true,
          validate: {
            min: 1,
          },
        },
        price: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          validate: {
            min: 0.01,
          },
        },
        costPrice: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          validate: {
            min: 0.01,
          },
        },
        isActive: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
      },
      {
        tableName: "product_pricing",
        sequelize,
        hooks: {
          beforeValidate: (pricing: ProductPricing) => {
            if (pricing.batchEnd && pricing.batchEnd <= pricing.batchStart) {
              throw new Error("Batch end must be greater than batch start");
            }
            if (pricing.price <= pricing.costPrice) {
              throw new Error("Price must be greater than cost price");
            }
          },
        },
        indexes: [
          {
            fields: ["productId"],
          },
          {
            fields: ["isActive"],
          },
        ],
      }
    );
  }

  public isInBatch(quantity: number): boolean {
    if (this.batchEnd) {
      return quantity >= this.batchStart && quantity <= this.batchEnd;
    }
    return quantity >= this.batchStart;
  }

  public getProfitMargin(): number {
    return ((this.price - this.costPrice) / this.costPrice) * 100;
  }
}
