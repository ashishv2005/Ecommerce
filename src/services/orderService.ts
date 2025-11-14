import {
  Order,
  OrderItem,
  Product,
  ProductPricing,
  User,
  Cart,
  ProductImage,
} from "../models";
import { Op } from "sequelize";
import redis from "../utils/redis";
import {
  sendOrderConfirmationEmail,
  sendOrderShippedEmail,
  sendOrderDeliveredEmail,
  sendOrderCancelledEmail,
  sendOrderStatusUpdateEmail,
} from "../utils/email";

export class OrderService {
  // ------------------ Create Order ------------------
  static async createOrder(userId: string, cartItems: any[] = []) {
    const userCartItems =
      cartItems.length > 0
        ? cartItems
        : await Cart.findAll({
            where: { userId },
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
                ],
              },
            ],
          });

    if (userCartItems.length === 0) {
      throw new Error("Cart is empty");
    }

    let totalAmount = 0;
    const orderItems: any[] = [];

    for (const cartItem of userCartItems) {
      const product = (cartItem as any).product;
      const pricing = product.pricing[0];

      if (!pricing) {
        throw new Error(`No pricing found for product ${product.name}`);
      }

      if (product.currentStock < cartItem.quantity) {
        throw new Error(`Insufficient stock for ${product.name}`);
      }

      const itemTotal = pricing.price * cartItem.quantity;
      totalAmount += itemTotal;

      orderItems.push({
        productId: product.id, // UUID
        quantity: cartItem.quantity,
        unitPrice: pricing.price,
        totalPrice: itemTotal,
        batchId: pricing.id, // UUID
      });
    }

    let discountAmount = 0;

    // Redis abandoned cart discount
    const userDiscount = await redis.get(
      `user:${userId}:abandoned_cart_discount`
    );
    if (userDiscount) {
      discountAmount = totalAmount * (parseInt(userDiscount) / 100);
    }

    const user = await User.findByPk(userId);
    if (user && user.discountEligible) {
      discountAmount += totalAmount * 0.05;
    }

    const finalAmount = totalAmount - discountAmount;

    const order = await Order.create({
      userId,
      totalAmount,
      discountAmount,
      finalAmount,
      status: "pending" as const,
    });

    await OrderItem.bulkCreate(
      orderItems.map((item) => ({
        ...item,
        orderId: order.id, // UUID
      }))
    );

    // Update stock & sold count
    for (const cartItem of userCartItems) {
      await Product.decrement("currentStock", {
        by: cartItem.quantity,
        where: { id: cartItem.productId },
      });

      await Product.increment("totalSold", {
        by: cartItem.quantity,
        where: { id: cartItem.productId },
      });
    }

    await Cart.destroy({ where: { userId } });

    if (userDiscount) {
      await redis.del(`user:${userId}:abandoned_cart_discount`);
    }

    return order;
  }

  // ------------------ Get User Orders ------------------
  static async getUserOrders(
    userId: string,
    page: number = 1,
    limit: number = 10
  ) {
    const offset = (page - 1) * limit;

    const { count, rows } = await Order.findAndCountAll({
      where: { userId },
      include: [
        {
          model: OrderItem,
          as: "orderItems",
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
        },
      ],
      limit,
      offset,
      order: [["createdAt", "DESC"]],
    });

    return {
      orders: rows,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      totalOrders: count,
    };
  }

  // ------------------ Get Order By ID ------------------
  static async getOrderById(orderId: string) {
    return await Order.findByPk(orderId, {
      include: [
        {
          model: OrderItem,
          as: "orderItems",
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
                {
                  model: ProductPricing,
                  as: "pricing",
                  where: { isActive: true },
                  required: false,
                },
              ],
            },
          ],
        },
        {
          model: User,
          as: "user",
          attributes: ["id", "email", "name"],
        },
      ],
    });
  }

  // ------------------ Update Order Status ------------------
  static async updateOrderStatus(
    orderId: string,
    status: string,
    adminId?: string
  ) {
    const order = await Order.findByPk(orderId, {
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "email", "name"],
        },
      ],
    });

    if (!order) {
      throw new Error("Order not found");
    }

    const oldStatus = order.status;
    const orderStatus = status as
      | "pending"
      | "confirmed"
      | "shipped"
      | "delivered"
      | "cancelled";

    await order.update({ status: orderStatus });

    const user = (order as any).user;

    // ------------------ Email Notifications ------------------
    if (user && user.email) {
      try {
        switch (orderStatus) {
          case "confirmed":
            await sendOrderConfirmationEmail(user.email, order);
            break;
          case "shipped":
            await sendOrderShippedEmail(user.email, order);
            break;
          case "delivered":
            await sendOrderDeliveredEmail(user.email, order);
            break;
          case "cancelled":
            await sendOrderCancelledEmail(user.email, order);
            break;
          default:
            await sendOrderStatusUpdateEmail(
              user.email,
              order,
              oldStatus,
              orderStatus
            );
        }

        console.log(
          `Email (${orderStatus}) sent to ${user.email} for order ${order.id}`
        );
      } catch (emailError) {
        console.error("Email sending failed:", emailError);
      }
    }

    // ------------------ Reward Loyalty ------------------
    if (orderStatus === "confirmed") {
      if (user) {
        await User.increment("totalPurchases", {
          by: order.finalAmount,
          where: { id: order.userId },
        });

        const updatedUser = await User.findByPk(order.userId);
        if (
          updatedUser &&
          updatedUser.totalPurchases > 1000 &&
          !updatedUser.discountEligible
        ) {
          await updatedUser.update({ discountEligible: true });
        }
      }
    }

    return order;
  }
}
