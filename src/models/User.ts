import { DataTypes, Model, Optional, Sequelize } from "sequelize";

export interface UserAttributes {
  id: number;
  name: string;
  username: string;
  password?: string;
  role: "user" | "admin";
  email: string;
  totalPurchases: number;
  discountEligible: boolean;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UserCreationAttributes
  extends Optional<
    UserAttributes,
    "id" | "totalPurchases" | "discountEligible" | "isActive"
  > {}

export class User
  extends Model<UserAttributes, UserCreationAttributes>
  implements UserAttributes
{
  public id!: number;
  public name!: string;
  public username!: string;
  public password!: string;
  public role!: "user" | "admin";
  public email!: string;
  public totalPurchases!: number;
  public discountEligible!: boolean;
  public isActive!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public static initialize(sequelize: Sequelize): void {
    User.init(
      {
        id: {
          type: DataTypes.INTEGER.UNSIGNED,
          autoIncrement: true,
          primaryKey: true,
        },
        name: {
          type: DataTypes.STRING(128),
          allowNull: false,
          validate: {
            notEmpty: true,
            len: [2, 128],
          },
        },
        username: {
          type: DataTypes.STRING(64),
          allowNull: false,
          unique: true,
          validate: {
            notEmpty: true,
            len: [3, 64],
            isAlphanumeric: true,
          },
        },
        password: {
          type: DataTypes.STRING(255),
          allowNull: false,
          validate: {
            notEmpty: true,
            len: [6, 255],
          },
        },
        role: {
          type: DataTypes.ENUM("user", "admin"),
          allowNull: false,
          defaultValue: "user",
        },
        email: {
          type: DataTypes.STRING(128),
          allowNull: false,
          unique: true,
          validate: {
            isEmail: true,
            notEmpty: true,
          },
        },
        totalPurchases: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0.0,
        },
        discountEligible: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        isActive: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
      },
      {
        tableName: "users",
        sequelize,
        hooks: {
          beforeCreate: (user: User) => {
            if (user.email) {
              user.email = user.email.toLowerCase();
            }
          },
          beforeUpdate: (user: User) => {
            if (user.changed("email") && user.email) {
              user.email = user.email.toLowerCase();
            }
          },
        },
      }
    );
  }

  public toJSON(): any {
    const values = { ...this.get() };
    delete values.password;
    return values;
  }
}
