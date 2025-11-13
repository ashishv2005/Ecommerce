import { DataTypes, Model, Optional, Sequelize } from "sequelize";

export interface ProductImageAttributes {
  id: number;
  productId: number;
  imageUrl: string;
  isPrimary: boolean;
  altText?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ProductImageCreationAttributes
  extends Optional<ProductImageAttributes, "id" | "altText" | "isPrimary"> {}

export class ProductImage
  extends Model<ProductImageAttributes, ProductImageCreationAttributes>
  implements ProductImageAttributes
{
  public id!: number;
  public productId!: number;
  public imageUrl!: string;
  public isPrimary!: boolean;
  public altText?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public static initialize(sequelize: Sequelize): void {
    ProductImage.init(
      {
        id: {
          type: DataTypes.INTEGER.UNSIGNED,
          autoIncrement: true,
          primaryKey: true,
        },
        productId: {
          type: DataTypes.INTEGER.UNSIGNED,
          allowNull: false,
          references: {
            model: "products",
            key: "id",
          },
          onDelete: "CASCADE",
        },
        imageUrl: {
          type: DataTypes.STRING(500),
          allowNull: false,
          validate: {
            isUrl: true,
            notEmpty: true,
          },
        },
        isPrimary: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        altText: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },
      },
      {
        tableName: "product_images",
        sequelize,
        indexes: [
          {
            fields: ["productId"],
          },
          {
            fields: ["isPrimary"],
          },
        ],
      }
    );
  }
}
