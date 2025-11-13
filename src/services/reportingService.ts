import { Order, OrderItem, Product, ProductPricing, User } from "../models";
import { Op, QueryTypes } from "sequelize";
import { sequelize } from "../models";

export class ReportingService {
  static async getSalesReport(startDate: Date, endDate: Date) {
    const salesData = await Order.findAll({
      where: {
        status: "confirmed",
        createdAt: {
          [Op.between]: [startDate, endDate],
        },
      },
      include: [
        {
          model: OrderItem,
          as: "orderItems",
          include: [
            {
              model: Product,
              as: "product",
            },
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    const totalRevenue = salesData.reduce(
      (sum, order) => sum + parseFloat(order.finalAmount.toString()),
      0
    );
    const totalOrders = salesData.length;
    const totalProductsSold = salesData.reduce((sum, order) => {
      const orderItems = (order as any).orderItems || [];
      return (
        sum +
        orderItems.reduce(
          (itemSum: number, item: any) => itemSum + item.quantity,
          0
        )
      );
    }, 0);

    return {
      totalRevenue,
      totalOrders,
      totalProductsSold,
      orders: salesData,
    };
  }

  static async getProductPerformance() {
    const query = `
      SELECT 
        p.id,
        p.name,
        p.category,
        p.currentStock,
        p.totalSold,
        SUM(oi.quantity) as unitsSold,
        SUM(oi.totalPrice) as revenue,
        AVG(pp.costPrice) as avgCost,
        (SUM(oi.totalPrice) - SUM(oi.quantity * pp.costPrice)) as profit
      FROM products p
      LEFT JOIN order_items oi ON p.id = oi.productId
      LEFT JOIN orders o ON oi.orderId = o.id AND o.status = 'confirmed'
      LEFT JOIN product_pricing pp ON oi.batchId = pp.id
      GROUP BY p.id
      ORDER BY revenue DESC
    `;

    const productPerformance = await sequelize.query(query, {
      type: QueryTypes.SELECT,
    });

    return productPerformance;
  }

  static async getUserPurchaseReport() {
    const users = await User.findAll({
      where: { role: "user" },
      attributes: [
        "id",
        "name",
        "email",
        "totalPurchases",
        "discountEligible",
        "createdAt",
      ],
      order: [["totalPurchases", "DESC"]],
    });

    return users;
  }

  static async getLowPerformingProducts(threshold: number = 10) {
    const products = await Product.findAll({
      where: {
        totalSold: { [Op.lt]: threshold },
        isActive: true,
      },
      order: [["totalSold", "ASC"]],
    });

    return products;
  }

  static async getStockAlerts() {
    const products = await Product.findAll({
      where: {
        currentStock: {
          [Op.lte]: sequelize.col("lowStockThreshold"),
        },
        isActive: true,
      },
      order: [["currentStock", "ASC"]],
    });

    return products.map((product) => ({
      ...product.toJSON(),
      stockStatus: product.currentStock === 0 ? "out_of_stock" : "low_stock",
    }));
  }
}
