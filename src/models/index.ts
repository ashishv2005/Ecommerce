import { Sequelize } from "sequelize";
import { config } from "../config/config";
import { User } from "./User";
import { Product } from "./Product";
import { ProductImage } from "./ProductImage";
import { ProductPricing } from "./ProductPricing";
import { Cart } from "./Cart";
import { Order } from "./Order";
import { OrderItem } from "./OrderItem";
import { Chat } from "./Chat";

const sequelize = new Sequelize(
  config.database.database,
  config.database.username,
  config.database.password,
  {
    host: config.database.host,
    port: config.database.port,
    dialect: config.database.dialect,
    logging: false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    timezone: config.database.timezone,
  }
);

// Initialize models
User.initialize(sequelize);
Product.initialize(sequelize);
ProductImage.initialize(sequelize);
ProductPricing.initialize(sequelize);
Cart.initialize(sequelize);
Order.initialize(sequelize);
OrderItem.initialize(sequelize);
Chat.initialize(sequelize);

// Define Associations
function defineAssociations() {
  // Product Associations
  Product.hasMany(ProductImage, {
    foreignKey: "productId",
    as: "images",
    onDelete: "CASCADE",
  });
  ProductImage.belongsTo(Product, {
    foreignKey: "productId",
    as: "product",
  });

  Product.hasMany(ProductPricing, {
    foreignKey: "productId",
    as: "pricing",
    onDelete: "CASCADE",
  });
  ProductPricing.belongsTo(Product, {
    foreignKey: "productId",
    as: "product",
  });

  // User Associations
  User.hasMany(Cart, {
    foreignKey: "userId",
    as: "cartItems",
    onDelete: "CASCADE",
  });
  Cart.belongsTo(User, {
    foreignKey: "userId",
    as: "user",
  });
  Cart.belongsTo(Product, {
    foreignKey: "productId",
    as: "product",
  });

  User.hasMany(Order, {
    foreignKey: "userId",
    as: "orders",
    onDelete: "CASCADE",
  });
  Order.belongsTo(User, {
    foreignKey: "userId",
    as: "user",
  });

  // Order Associations
  Order.hasMany(OrderItem, {
    foreignKey: "orderId",
    as: "orderItems",
    onDelete: "CASCADE",
  });
  OrderItem.belongsTo(Order, {
    foreignKey: "orderId",
    as: "order",
  });
  OrderItem.belongsTo(Product, {
    foreignKey: "productId",
    as: "product",
  });
  OrderItem.belongsTo(ProductPricing, {
    foreignKey: "batchId",
    as: "batch",
  });

  // Chat Associations
  User.hasMany(Chat, {
    foreignKey: "userId",
    as: "chats",
    onDelete: "CASCADE",
  });
  Chat.belongsTo(User, {
    foreignKey: "userId",
    as: "user",
  });
  Chat.belongsTo(User, {
    foreignKey: "adminId",
    as: "admin",
  });
}

defineAssociations();

export {
  sequelize,
  User,
  Product,
  ProductImage,
  ProductPricing,
  Cart,
  Order,
  OrderItem,
  Chat,
};
