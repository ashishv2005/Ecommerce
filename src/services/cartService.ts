import { Cart, Product, ProductImage, ProductPricing, User } from "../models";
import { Op } from "sequelize";
import redis from "../utils/redis";
import { sendAbandonedCartEmail } from "../utils/email";

export class CartService {
  static async addToCart(
    userId: string,
    productId: string,
    quantity: number = 1
  ) {
    const product = await Product.findByPk(productId);
    if (!product || !product.isActive) {
      throw new Error("Product not available");
    }

    if (product.currentStock < quantity) {
      throw new Error("Insufficient stock");
    }

    const expiresAt = new Date(Date.now() + 2 * 60 * 1000);
    const addedAt = new Date();

    const existingAbandoned = await Cart.findOne({
      where: {
        userId,
        productId,
        abandoned: true,
      },
    });

    if (existingAbandoned) {
      // Restore from abandoned cart
      existingAbandoned.quantity = quantity;
      existingAbandoned.expiresAt = expiresAt;
      existingAbandoned.notified = false;
      existingAbandoned.abandoned = false;
      await existingAbandoned.save();
      return existingAbandoned;
    }

    const [cartItem, created] = await Cart.findOrCreate({
      where: { userId, productId, abandoned: false },
      defaults: {
        userId,
        productId,
        quantity,
        addedAt,
        expiresAt,
        notified: false,
        abandoned: false,
      },
    });

    if (!created) {
      cartItem.quantity += quantity;
      cartItem.expiresAt = expiresAt;
      cartItem.notified = false;
      cartItem.abandoned = false;
      await cartItem.save();
    }

    return cartItem;
  }

  static async getUserCart(userId: string) {
    return await Cart.findAll({
      where: {
        userId,
        abandoned: false,
        expiresAt: { [Op.gt]: new Date() },
      },
      include: [
        {
          model: Product,
          as: "product",
          include: [
            {
              model: ProductImage,
              as: "images",
              where: { isPrimary: true },
              required: false,
            },
          ],
        },
      ],
    });
  }

  static async getUserAbandonedCarts(userId: string) {
    return await Cart.findAll({
      where: {
        userId,
        abandoned: true,
      },
      include: [
        {
          model: Product,
          as: "product",
          include: [
            {
              model: ProductImage,
              as: "images",
              where: { isPrimary: true },
              required: false,
            },
          ],
        },
      ],
    });
  }

  static async updateCartItem(
    cartId: string,
    userId: string,
    quantity: number
  ) {
    const cartItem = await Cart.findOne({
      where: { id: cartId, userId, abandoned: false },
      include: [{ model: Product, as: "product" }],
    });

    if (!cartItem) {
      throw new Error("Cart item not found");
    }

    const product = (cartItem as any).product;
    if (product.currentStock < quantity) {
      throw new Error("Insufficient stock");
    }

    cartItem.quantity = quantity;
    cartItem.expiresAt = new Date(Date.now() + 2 * 60 * 1000);
    cartItem.notified = false;
    cartItem.abandoned = false;
    await cartItem.save();

    return cartItem;
  }

  static async removeFromCart(cartId: string, userId: string) {
    const cartItem = await Cart.findOne({
      where: { id: cartId, userId, abandoned: false },
    });
    if (!cartItem) {
      throw new Error("Cart item not found");
    }

    await cartItem.destroy();
    return true;
  }

  static async getAbandonedCarts(page: number = 1, limit: number = 10) {
    const offset = (page - 1) * limit;

    const { count, rows } = await Cart.findAndCountAll({
      where: {
        abandoned: true,
      },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "email"],
        },
        {
          model: Product,
          as: "product",
          include: [
            {
              model: ProductImage,
              as: "images",
              where: { isPrimary: true },
              required: false,
            },
          ],
        },
      ],
      limit,
      offset,
      order: [["expiresAt", "ASC"]],
    });

    return {
      carts: rows,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      totalCarts: count,
    };
  }

  static async sendAbandonedCartNotifications() {
    const now = new Date();

    const expiredCarts = await Cart.findAll({
      where: {
        expiresAt: {
          [Op.lt]: now,
        },
        notified: false,
        abandoned: false,
      },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "email", "name"],
        },
        {
          model: Product,
          as: "product",
          include: [
            {
              model: ProductPricing,
              as: "pricing",
              where: { isActive: true },
              required: false,
            },
          ],
        },
      ],
    });

    console.log(
      `🕵️ Found ${
        expiredCarts.length
      } carts that expired at ${now.toLocaleTimeString()}`
    );

    if (expiredCarts.length === 0) {
      return 0;
    }

    let sentCount = 0;

    // Group carts by user
    const userCartsMap = new Map<string, Cart[]>();

    for (const cart of expiredCarts) {
      const userId = cart.userId;
      if (!userCartsMap.has(userId)) {
        userCartsMap.set(userId, []);
      }
      userCartsMap.get(userId)!.push(cart);
    }

    for (const [userId, userCarts] of userCartsMap) {
      try {
        const user = (userCarts[0] as any).user;
        if (!user?.email) {
          console.log(`❌ No email found for user ${userId}`);
          continue;
        }

        // Check if we already sent an email for this user recently
        const redisKey = `abandoned_cart_sent:${userId}`;
        const alreadySent = await redis.get(redisKey);

        if (alreadySent) {
          console.log(`⏭️ Email already sent for user ${userId}, skipping`);
          // But still mark these as abandoned
          await this.markCartsAsAbandoned(userCarts);
          continue;
        }

        // Get ALL cart items for this user that just expired
        const allUserExpiredItems = await Cart.findAll({
          where: {
            userId: userId,
            expiresAt: { [Op.lt]: now },
            notified: false,
            abandoned: false,
          },
          include: [
            {
              model: Product,
              as: "product",
              include: [
                {
                  model: ProductPricing,
                  as: "pricing",
                  where: { isActive: true },
                  required: false,
                },
                {
                  model: ProductImage,
                  as: "images",
                  where: { isPrimary: true },
                  required: false,
                },
              ],
            },
          ],
        });

        if (allUserExpiredItems.length > 0) {
          console.log(
            `📧 Preparing to send abandoned cart email to ${user.email} for ${allUserExpiredItems.length} items`
          );

          // FIRST: Mark all items as abandoned
          await this.markCartsAsAbandoned(allUserExpiredItems);
          console.log(
            `✅ Marked ${allUserExpiredItems.length} items as abandoned for user ${userId}`
          );

          // THEN: Send email
          await sendAbandonedCartEmail(user.email, allUserExpiredItems);

          // Prevent duplicate emails for 1 hour
          await redis.setEx(redisKey, 3600, "sent");
          sentCount++;

          console.log(`✅ Abandoned cart email sent to ${user.email}`);
        }
      } catch (error) {
        console.error(
          `❌ Failed to process abandoned cart for user ${userId}:`,
          error
        );
      }
    }

    return sentCount;
  }

  // Helper method to mark carts as abandoned
  private static async markCartsAsAbandoned(carts: Cart[]): Promise<void> {
    const cartIds = carts.map((cart) => cart.id);

    if (cartIds.length > 0) {
      await Cart.update(
        {
          abandoned: true,
          notified: true,
        },
        {
          where: {
            id: { [Op.in]: cartIds },
          },
        }
      );
    }
  }

  // Restore abandoned cart to active
  static async restoreAbandonedCart(userId: string, productId?: string) {
    const whereClause: any = {
      userId,
      abandoned: true,
    };

    if (productId) {
      whereClause.productId = productId;
    }

    const result = await Cart.update(
      {
        abandoned: false,
        notified: false,
        expiresAt: new Date(Date.now() + 2 * 60 * 1000), // Reset expiry
      },
      {
        where: whereClause,
      }
    );

    console.log(
      `🔙 Restored ${result[0]} abandoned cart items for user ${userId}`
    );
    return result[0];
  }

  static async applyAbandonedCartDiscount(userId: string) {
    const abandonedCarts = await Cart.findAll({
      where: {
        userId,
        abandoned: true,
      },
    });

    if (abandonedCarts.length > 0) {
      const discountKey = `user:${userId}:abandoned_cart_discount`;
      await redis.setEx(discountKey, 3600, "10");
      return 10;
    }

    return 0;
  }

  // Debug method to check cart status
  static async debugCartStatus(userId?: string) {
    const whereClause: any = {};
    if (userId) {
      whereClause.userId = userId;
    }

    const carts = await Cart.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "email"],
        },
        {
          model: Product,
          as: "product",
          attributes: ["id", "name"],
        },
      ],
      order: [["expiresAt", "ASC"]],
    });

    console.log("=== CART DEBUG INFO ===");
    console.log(`Total carts: ${carts.length}`);

    carts.forEach((cart) => {
      const status = cart.abandoned ? "ABANDONED" : "ACTIVE";
      const expired = cart.isExpired() ? "EXPIRED" : "VALID";
      console.log(
        `Cart ${cart.id}: User ${cart.userId} (${
          (cart as any).user?.email
        }), Product: ${
          (cart as any).product?.name
        }, Status: ${status}, Expired: ${expired}, Expires: ${cart.expiresAt.toLocaleTimeString()}`
      );
    });

    return carts;
  }
}
