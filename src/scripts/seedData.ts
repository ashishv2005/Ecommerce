import {
  sequelize,
  User,
  Product,
  ProductImage,
  ProductPricing,
} from "../models";
import { hashPassword } from "../utils/helpers";

const seedData = async (): Promise<void> => {
  try {
    await sequelize.authenticate();
    console.log("Connected to database for seeding");

    // Create admin user
    const adminUser = await User.create({
      name: "Admin User",
      username: "admin",
      password: await hashPassword("admin123"),
      email: "admin@example.com",
      role: "admin",
    });

    // Create sample user
    const sampleUser = await User.create({
      name: "John Doe",
      username: "johndoe",
      password: await hashPassword("password123"),
      email: "john@example.com",
      role: "user",
    });

    // Create sample products
    const products = await Product.bulkCreate([
      {
        name: "Wireless Bluetooth Headphones",
        description: "High-quality wireless headphones with noise cancellation",
        category: "Electronics",
        currentStock: 50,
        lowStockThreshold: 10,
      },
      {
        name: "Smartphone Case",
        description: "Durable protective case for smartphones",
        category: "Accessories",
        currentStock: 100,
        lowStockThreshold: 20,
      },
      {
        name: "Laptop Backpack",
        description: "Water-resistant backpack with laptop compartment",
        category: "Bags",
        currentStock: 30,
        lowStockThreshold: 5,
      },
    ]);

    // Create product images
    if (products[0]) {
      await ProductImage.create({
        productId: products[0].id,
        imageUrl: "https://example.com/headphones.jpg",
        isPrimary: true,
      });
    }

    if (products[1]) {
      await ProductImage.create({
        productId: products[1].id,
        imageUrl: "https://example.com/phone-case.jpg",
        isPrimary: true,
      });
    }

    if (products[2]) {
      await ProductImage.create({
        productId: products[2].id,
        imageUrl: "https://example.com/backpack.jpg",
        isPrimary: true,
      });
    }

    // Create product pricing
    if (products[0]) {
      await ProductPricing.bulkCreate([
        {
          productId: products[0].id,
          batchStart: 1,
          batchEnd: 10,
          price: 99.99,
          costPrice: 60.0,
        },
        {
          productId: products[0].id,
          batchStart: 11,
          batchEnd: 50,
          price: 89.99,
          costPrice: 55.0,
        },
      ]);
    }

    if (products[1]) {
      await ProductPricing.create({
        productId: products[1].id,
        batchStart: 1,
        price: 19.99,
        costPrice: 8.0,
      });
    }

    if (products[2]) {
      await ProductPricing.create({
        productId: products[2].id,
        batchStart: 1,
        price: 49.99,
        costPrice: 25.0,
      });
    }

    console.log("✅ Sample data seeded successfully");
    console.log(`👤 Admin user created: admin / admin123`);
    console.log(`👤 Sample user created: johndoe / password123`);
  } catch (error) {
    console.error("❌ Seeding error:", error);
  } finally {
    await sequelize.close();
  }
};

seedData();
