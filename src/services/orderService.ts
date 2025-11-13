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
  static async createOrder(userId: number, cartItems: any[] = []) {
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
    const orderItems = [];

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
        productId: product.id,
        quantity: cartItem.quantity,
        unitPrice: pricing.price,
        totalPrice: itemTotal,
        batchId: pricing.id,
      });
    }

    let discountAmount = 0;
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
        orderId: order.id,
      }))
    );

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

  static async getUserOrders(
    userId: number,
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

  static async getOrderById(orderId: number) {
    const order = await Order.findByPk(orderId, {
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

    return order;
  }

  static async updateOrderStatus(
    orderId: number,
    status: string,
    adminId?: number
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

    // SEND EMAIL NOTIFICATIONS FOR ALL STATUS UPDATES
    const user = (order as any).user;
    if (user && user.email) {
      try {
        // Send specific email based on status
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
            break;
        }

        console.log(
          `✅ ${orderStatus} email sent to ${user.email} for order #${order.id}`
        );
      } catch (emailError) {
        console.error(
          `❌ Failed to send ${orderStatus} email to ${user.email}:`,
          emailError
        );
      }
    }

    if (status === "confirmed") {
      if (user) {
        await User.increment("totalPurchases", {
          by: order.finalAmount,
          where: { id: order.userId },
        });

        const userRecord = await User.findByPk(order.userId);
        if (
          userRecord &&
          userRecord.totalPurchases > 1000 &&
          !userRecord.discountEligible
        ) {
          await userRecord.update({ discountEligible: true });
        }
      }
    }

    return order;
  }
}
